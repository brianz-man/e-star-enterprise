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
      prisma.order.count({ where: { isDeleted: false } }),
      prisma.payment.aggregate({
        where: { status: "SUCCESS", order: { isDeleted: false } },
        _sum: { amount: true },
      }),
      prisma.user.count({ where: { role: "CUSTOMER", isDeleted: false } }),
      prisma.product.count({ where: { isActive: true, isDeleted: false } }),
      prisma.order.findMany({
        where: { isDeleted: false },
        take: 10,
        orderBy: { createdAt: "desc" },
        include: {
          user: { select: { firstName: true, lastName: true, email: true } },
          payment: true,
        },
      }),
      prisma.product.findMany({
        where: { isActive: true, isDeleted: false, stockQty: { lte: 5 } },
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
    const where = {
      isDeleted: false,
      ...(validated.status ? { status: validated.status } : {}),
    };

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
      meta: {
        total,
        page: validated.page,
        pages: Math.ceil(total / validated.limit),
      },
    });
  },
);

export const updateOrderStatus = asyncHandler(
  async (req: Request, res: Response) => {
    const validated = updateOrderStatusSchema.parse(req.body);
    const updated = await prisma.$transaction(async (tx) => {
      const order = await tx.order.findFirst({
        where: { id: String(req.params.id), isDeleted: false },
        include: { payment: true },
      });
      if (!order) throw ApiError.notFound("Order not found");

      if (validated.status === "CANCELLED") {
        if (order.status === "CANCELLED") {
          throw ApiError.badRequest("Order is already cancelled");
        }
        if (order.status === "DELIVERED") {
          throw ApiError.badRequest("Delivered orders cannot be cancelled");
        }
        if (order.payment?.status === "SUCCESS") {
          throw ApiError.badRequest("Paid orders cannot be cancelled");
        }
      }

      const allowedTransitions: Record<string, string[]> = {
        PENDING: ["CONFIRMED", "CANCELLED"],
        CONFIRMED: ["PROCESSING", "CANCELLED"],
        PROCESSING: ["SHIPPED", "CANCELLED"],
        SHIPPED: ["DELIVERED"],
        DELIVERED: [],
        CANCELLED: [],
      };
      if (!allowedTransitions[order.status].includes(validated.status)) {
        throw ApiError.badRequest(
          `Cannot change an ${order.status.toLowerCase()} order to ${validated.status.toLowerCase()}`,
        );
      }

      return tx.order.update({
        where: { id: order.id },
        data: { status: validated.status },
      });
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
      where: { isDeleted: false },
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
        _count: { select: { orders: { where: { isDeleted: false } } } },
      },
    }),
    prisma.user.count({ where: { isDeleted: false } }),
  ]);

  res.json({
    success: true,
    data: users,
    meta: {
      total,
      page: validated.page,
      pages: Math.ceil(total / validated.limit),
    },
  });
});

export const getInventory = asyncHandler(
  async (_req: Request, res: Response) => {
    const products = await prisma.product.findMany({
      where: { isActive: true, isDeleted: false },
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
        where: { isDeleted: false },
        skip,
        take: validated.limit,
        orderBy: { createdAt: "desc" },
        include: {
          brand: { select: { id: true, name: true, slug: true } },
          category: { select: { id: true, name: true, slug: true } },
          images: { where: { isPrimary: true }, take: 1 },
        },
      }),
      prisma.product.count({ where: { isDeleted: false } }),
    ]);

    res.json({
      success: true,
      data: products,
      meta: {
        total,
        page: validated.page,
        pages: Math.ceil(total / validated.limit),
      },
    });
  },
);

export const getProductById = asyncHandler(
  async (req: Request, res: Response) => {
    const product = await prisma.product.findUnique({
      where: { id: String(req.params.id), isDeleted: false },
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
