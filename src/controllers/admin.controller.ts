import { Request, Response } from "express";
import { prisma } from "../config/db";
import { asyncHandler } from "../utils/asyncHandler";
import { ApiError } from "../utils/ApiError";

export const getDashboard = asyncHandler(
  async (_req: Request, res: Response) => {
    const [
      totalOrders,
      revenueAgg,
      totalUsers,
      totalProducts,
      recentOrders,
      lowStock,
    ] = await prisma.$transaction([
      prisma.order.count(),
      prisma.payment.aggregate({
        where: { status: "SUCCESS" },
        _sum: { amount: true },
      }),
      prisma.user.count({ where: { role: "CUSTOMER" } }),
      prisma.product.count({ where: { isActive: true } }),
      prisma.order.findMany({
        take: 10,
        orderBy: { createdAt: "desc" },
        include: {
          user: { select: { firstName: true, lastName: true, email: true } },
          payment: true,
        },
      }),
      prisma.product.findMany({
        where: { isActive: true, stockQty: { lte: 5 } },
        include: { brand: { select: { name: true } } },
        orderBy: { stockQty: "asc" },
        take: 10,
      }),
    ]);

    res.json({
      success: true,
      data: {
        stats: {
          totalOrders,
          totalRevenue: revenueAgg._sum.amount ?? 0,
          totalUsers,
          totalProducts,
        },
        recentOrders,
        lowStock,
      },
    });
  },
);

export const getAllOrders = asyncHandler(
  async (req: Request, res: Response) => {
    const page = Number(req.query.page ?? 1);
    const limit = Number(req.query.limit ?? 20);
    const skip = (page - 1) * limit;
    const status = req.query.status as string | undefined;

    const where = status ? { status: status as any } : {};

    const [orders, total] = await prisma.$transaction([
      prisma.order.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          user: {
            select: {
              firstName: true,
              lastName: true,
              email: true,
              phone: true,
            },
          },
          items: true,
          payment: true,
        },
      }),
      prisma.order.count({ where }),
    ]);

    res.json({
      success: true,
      data: orders,
      meta: { total, page, pages: Math.ceil(total / limit) },
    });
  },
);

export const updateOrderStatus = asyncHandler(
  async (req: Request, res: Response) => {
    const { status } = req.body as { status: string };
    const order = await prisma.order.findUnique({
      where: { id: String(req.params.id) },
      include: { user: true },
    });
    if (!order) throw ApiError.notFound("Order not found");

    const updated = await prisma.order.update({
      where: { id: order.id },
      data: { status: status as any },
    });

    res.json({ success: true, data: updated });
  },
);

export const getAllUsers = asyncHandler(async (req: Request, res: Response) => {
  const page = Number(req.query.page ?? 1);
  const limit = Number(req.query.limit ?? 20);
  const skip = (page - 1) * limit;

  const [users, total] = await prisma.$transaction([
    prisma.user.findMany({
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        role: true,
        isActive: true,
        createdAt: true,
        _count: { select: { orders: true } },
      },
    }),
    prisma.user.count(),
  ]);

  res.json({
    success: true,
    data: users,
    meta: { total, page, pages: Math.ceil(total / limit) },
  });
});

export const getInventory = asyncHandler(
  async (_req: Request, res: Response) => {
    const products = await prisma.product.findMany({
      where: { isActive: true },
      include: {
        brand: { select: { name: true } },
        category: { select: { name: true } },
      },
      orderBy: { stockQty: "asc" },
    });
    res.json({ success: true, data: products });
  },
);

export const adjustStock = asyncHandler(async (req: Request, res: Response) => {
  const stockQty = Number(req.body.stockQty);
  if (isNaN(stockQty) || stockQty < 0)
    throw ApiError.badRequest("Invalid stock quantity");

  const product = await prisma.product.update({
    where: { id: String(req.params.id) },
    data: { stockQty },
  });
  res.json({ success: true, data: product });
});
