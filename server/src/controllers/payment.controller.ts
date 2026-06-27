import { Request, Response } from "express";
import { prisma } from "../config/db";
import { asyncHandler } from "../utils/asyncHandler";
import { ApiError } from "../utils/ApiError";
import { initiateSTKPush } from "../services/mpesa.service";
import { formatPhone } from "../utils/formatPhone";
import { MpesaInitiateInput } from "../validators/order.validator";

export const initiateMpesa = asyncHandler(
  async (req: Request, res: Response) => {
    const { orderId, phone } = req.body as MpesaInitiateInput;

    const order = await prisma.order.findFirst({
      where: { id: orderId, userId: req.user!.userId, isDeleted: false },
    });
    if (!order) throw ApiError.notFound("Order not found");
    if (order.status === "DELIVERED")
      throw ApiError.badRequest("Order already completed");

    // payment is now Payment? (one-to-one), not array — findUnique works correctly
    const existingPayment = await prisma.payment.findUnique({
      where: { orderId },
    });

    // Idempotency guard: don't process already-paid orders
    if (existingPayment?.status === "SUCCESS")
      throw ApiError.badRequest("Order already paid", "ALREADY_PAID");

    const normalizedPhone = formatPhone(phone);

    const result = await initiateSTKPush({
      phone: normalizedPhone,
      amount: Number(order.totalAmount),
      orderNumber: order.orderNumber,
      orderId: order.id,
    });

    if (existingPayment) {
      // Retry: update existing payment record with new checkout request
      await prisma.payment.update({
        where: { id: existingPayment.id },
        data: {
          phone: normalizedPhone,
          checkoutRequestId: result.checkoutRequestId,
          merchantRequestId: result.merchantRequestId,
          status: "PENDING",
        },
      });
    } else {
      await prisma.payment.create({
        data: {
          orderId,
          amount: order.totalAmount,
          phone: normalizedPhone,
          checkoutRequestId: result.checkoutRequestId,
          merchantRequestId: result.merchantRequestId,
          status: "PENDING",
        },
      });
    }

    // Audit log: STK push initiated
    await prisma.paymentEvent.create({
      data: {
        orderId,
        eventType: "STK_PUSH_INITIATED",
        payload: {
          checkoutRequestId: result.checkoutRequestId,
          merchantRequestId: result.merchantRequestId,
          phone: normalizedPhone,
          amount: Number(order.totalAmount),
        },
      },
    });

    res.json({
      success: true,
      message: result.customerMessage,
      data: { checkoutRequestId: result.checkoutRequestId },
    });
  },
);

export const mpesaCallback = asyncHandler(
  async (req: Request, res: Response) => {
    const callback = req.body?.Body?.stkCallback;
    if (!callback) {
      res.json({ ResultCode: 1, ResultDesc: "Invalid payload" });
      return;
    }

    const { CheckoutRequestID, ResultCode, ResultDesc, CallbackMetadata } =
      callback;

    // Always log every callback payload for audit / dispute resolution
    const payment = await prisma.payment.findFirst({
      where: { checkoutRequestId: CheckoutRequestID },
    });

    if (payment) {
      await prisma.paymentEvent
        .create({
          data: {
            orderId: payment.orderId,
            eventType: "CALLBACK_RECEIVED",
            payload: req.body,
          },
        })
        .catch(() => {
          // Non-blocking — never let audit logging kill the callback response
        });
    }

    if (!payment) {
      res.json({ ResultCode: 0, ResultDesc: "Accepted" });
      return;
    }

    // Idempotency: skip if already processed to prevent duplicate updates
    if (payment.status === "SUCCESS") {
      res.json({ ResultCode: 0, ResultDesc: "Accepted" });
      return;
    }

    if (ResultCode === 0) {
      const meta: Array<{ Name: string; Value: string | number }> =
        CallbackMetadata?.Item || [];
      const receiptNo = meta.find((m) => m.Name === "MpesaReceiptNumber")
        ?.Value as string;

      await prisma.$transaction([
        prisma.payment.update({
          where: { id: payment.id },
          data: {
            status: "SUCCESS",
            mpesaReceiptNo: receiptNo,
            resultCode: String(ResultCode),
            resultDesc: ResultDesc,
            paidAt: new Date(),
          },
        }),
        prisma.order.update({
          where: { id: payment.orderId },
          data: { status: "CONFIRMED" },
        }),
      ]);
    } else {
      await prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: "FAILED",
          resultCode: String(ResultCode),
          resultDesc: ResultDesc,
        },
      });
    }

    res.json({ ResultCode: 0, ResultDesc: "Accepted" });
  },
);

export const getPaymentStatus = asyncHandler(
  async (req: Request, res: Response) => {
    const order = await prisma.order.findFirst({
      where: {
        id: String(req.params.orderId),
        userId: req.user!.userId,
        isDeleted: false,
      },
      include: {
        payment: true,
      },
    });

    if (!order) throw ApiError.notFound("Order not found", "ORDER_NOT_FOUND");

    // payment is now Payment | null (one-to-one) — no more array indexing
    const payment = order.payment ?? null;

    res.json({
      success: true,
      data: {
        orderId: order.id,
        orderNumber: order.orderNumber,
        orderStatus: order.status,
        payment: payment
          ? {
              status: payment.status,
              amount: payment.amount,
              mpesaReceiptNo: payment.mpesaReceiptNo ?? null,
              paidAt: payment.paidAt ?? null,
            }
          : null,
      },
    });
  },
);
