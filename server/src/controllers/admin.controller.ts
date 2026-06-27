import { Request, Response } from "express";
import { prisma } from "../config/db";
import { asyncHandler } from "../utils/asyncHandler";
import { ApiError } from "../utils/ApiError";
import {
  orderFilterSchema,
  paginationSchema,
} from "../validators/admin.validator";
import { updateOrderStatusSchema } from "../validators/order.validator";

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
    const validated = orderFilterSchema.parse({
      page: req.query.page,
      limit: req.query.limit,
      status: req.query.status,
    });

    const skip = (validated.page - 1) * validated.limit;
    const where = validated.status ? { status: validated.status } : {};

    const [orders, total] = await prisma.$transaction([
      prisma.order.findMany({
        where,
        skip,
        take: validated.limit,
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
      meta: { total, page: validated.page, pages: Math.ceil(total / validated.limit) },
    });
  },
);

export const updateOrderStatus = asyncHandler(
  async (req: Request, res: Response) => {
    const validated = updateOrderStatusSchema.parse(req.body);
    const order = await prisma.order.findUnique({
      where: { id: String(req.params.id) },
      include: { user: true },
    });
    if (!order) throw ApiError.notFound("Order not found");

    const updated = await prisma.order.update({
      where: { id: order.id },
      data: { status: validated.status },
    });

    res.json({ success: true, data: updated });
  },
);

export const getAllUsers = asyncHandler(async (req: Request, res: Response) => {
  const validated = paginationSchema.parse({
    page: req.query.page,
    limit: req.query.limit,
  });
  const skip = (validated.page - 1) * validated.limit;

  const [users, total] = await prisma.$transaction([
    prisma.user.findMany({
      skip,
      take: validated.limit,
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
    meta: { total, page: validated.page, pages: Math.ceil(total / validated.limit) },
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

export const getCatalog = asyncHandler(async (_req: Request, res: Response) => {
  const [brands, categories] = await prisma.$transaction([
    prisma.brand.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true, slug: true },
    }),
    prisma.category.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true, slug: true },
    }),
  ]);

  res.json({ success: true, data: { brands, categories } });
});

export const getAllProducts = asyncHandler(
  async (req: Request, res: Response) => {
    const validated = paginationSchema.parse({
      page: req.query.page,
      limit: req.query.limit,
    });
    const skip = (validated.page - 1) * validated.limit;

    const [products, total] = await prisma.$transaction([
      prisma.product.findMany({
        skip,
        take: validated.limit,
        orderBy: { createdAt: "desc" },
        include: {
          brand: { select: { id: true, name: true, slug: true } },
          category: { select: { id: true, name: true, slug: true } },
          images: { where: { isPrimary: true }, take: 1 },
        },
      }),
      prisma.product.count(),
    ]);

    res.json({
      success: true,
      data: products,
      meta: { total, page: validated.page, pages: Math.ceil(total / validated.limit) },
    });
  },
);

export const getProductById = asyncHandler(
  async (req: Request, res: Response) => {
    const product = await prisma.product.findUnique({
      where: { id: String(req.params.id) },
      include: {
        brand: true,
        category: true,
        images: { orderBy: [{ isPrimary: "desc" }, { sortOrder: "asc" }] },
        compatibility: true,
      },
    });

    if (!product) throw ApiError.notFound("Product not found");
    res.json({ success: true, data: product });
  },
);
