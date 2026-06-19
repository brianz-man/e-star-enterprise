import { Request, Response } from "express";
import { prisma } from "../config/db";
import { asyncHandler } from "../utils/asyncHandler";
import { ApiError } from "../utils/ApiError";
import { generateOrderNumber } from "../utils/generateOrderNumber";
import { CreateOrderInput } from "../validators/order.validator";
import { Prisma } from "@prisma/client";

export const createOrder = asyncHandler(async (req: Request, res: Response) => {
  const { deliveryAddress, notes, addressId } = req.body as CreateOrderInput;

  const cart = await prisma.cart.findUnique({
    where: { userId: req.user!.userId },
    include: { items: { include: { product: true } } },
  });

  if (!cart || cart.items.length === 0)
    throw ApiError.badRequest("Cart is empty", "EMPTY_CART");

  // Validate stock for all items
  for (const item of cart.items) {
    if (!item.product.isActive || item.product.isDeleted)
      throw ApiError.badRequest(
        `Product "${item.product.name}" is no longer available`,
      );
    if (item.product.stockQty < item.quantity)
      throw ApiError.badRequest(
        `Insufficient stock for "${item.product.name}". Available: ${item.product.stockQty}`,
      );
  }

  // Use Prisma.Decimal throughout to avoid floating-point errors
  const subtotalDecimal = cart.items.reduce((sum, item) => {
    return sum.add(new Prisma.Decimal(item.product.price).mul(item.quantity));
  }, new Prisma.Decimal(0));

  const deliveryFeeDecimal = subtotalDecimal.gte(5000)
    ? new Prisma.Decimal(0)
    : new Prisma.Decimal(300);

  const totalAmountDecimal = subtotalDecimal.add(deliveryFeeDecimal);

  const order = await prisma.$transaction(async (tx) => {
    // Re-check stock inside transaction to prevent race conditions
    for (const item of cart.items) {
      const fresh = await tx.product.findUnique({
        where: { id: item.productId },
        select: { stockQty: true, isActive: true, isDeleted: true },
      });
      if (!fresh || !fresh.isActive || fresh.isDeleted)
        throw ApiError.badRequest(`Product no longer available`);
      if (fresh.stockQty < item.quantity)
        throw ApiError.badRequest(
          `Insufficient stock. Only ${fresh.stockQty} left.`,
        );
    }

    const newOrder = await tx.order.create({
      data: {
        orderNumber: generateOrderNumber(),
        userId: req.user!.userId,
        addressId: addressId || null,
        deliveryAddress,
        subtotal: subtotalDecimal,
        deliveryFee: deliveryFeeDecimal,
        totalAmount: totalAmountDecimal,
        notes,
        items: {
          create: cart.items.map((i) => ({
            productId: i.productId,
            name: i.product.name,
            sku: i.product.sku,
            quantity: i.quantity,
            price: i.product.price,
            total: new Prisma.Decimal(i.product.price).mul(i.quantity),
          })),
        },
      },
      include: { items: true },
    });

    // Decrement stock atomically
    for (const item of cart.items) {
      await tx.product.update({
        where: { id: item.productId },
        data: { stockQty: { decrement: item.quantity } },
      });
    }

    await tx.cartItem.deleteMany({ where: { cartId: cart.id } });

    return newOrder;
  });

  res.status(201).json({ success: true, data: order });
});

export const getMyOrders = asyncHandler(async (req: Request, res: Response) => {
  const orders = await prisma.order.findMany({
    where: { userId: req.user!.userId, isDeleted: false },
    include: { items: true, payment: true },
    orderBy: { createdAt: "desc" },
  });
  res.json({ success: true, data: orders });
});

export const getOrderById = asyncHandler(
  async (req: Request, res: Response) => {
    const order = await prisma.order.findFirst({
      where: {
        id: String(req.params.id),
        userId: req.user!.userId,
        isDeleted: false,
      },
      include: {
        items: {
          include: {
            product: {
              include: { images: { where: { isPrimary: true }, take: 1 } },
            },
          },
        },
        payment: true,
      },
    });
    if (!order) throw ApiError.notFound("Order not found", "ORDER_NOT_FOUND");
    res.json({ success: true, data: order });
  },
);
