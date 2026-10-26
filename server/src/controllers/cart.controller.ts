import { Request, Response } from "express";
import { Decimal } from "@prisma/client/runtime/library";
import { prisma } from "../config/db";
import { asyncHandler } from "../utils/asyncHandler";
import { ApiError } from "../utils/ApiError";

const cartInclude = {
  items: {
    include: {
      product: {
        include: {
          images: { where: { isPrimary: true }, take: 1 },
          brand: { select: { name: true, slug: true } },
        },
      },
    },
  },
} as const;

const getOrCreateCart = async (userId: string) => {
  const cart = await prisma.cart.upsert({
    where: { userId },
    update: {},
    create: { userId },
    include: cartInclude,
  });
  return cart;
};

const calcTotal = (cart: Awaited<ReturnType<typeof getOrCreateCart>>) => {
  return cart.items
    .reduce((sum, i) => {
      const price = new Decimal(i.product.price);
      const itemTotal = price.times(i.quantity);
      return sum.plus(itemTotal);
    }, new Decimal(0))
    .toNumber();
};

export const getCart = asyncHandler(async (req: Request, res: Response) => {
  const cart = await getOrCreateCart(req.user!.userId);
  res.json({ success: true, data: { ...cart, total: calcTotal(cart) } });
});

export const addToCart = asyncHandler(async (req: Request, res: Response) => {
  const { productId, quantity } = req.body as {
    productId: string;
    quantity: number;
  };

  const product = await prisma.product.findFirst({
    where: { id: productId, isActive: true, isDeleted: false },
  });
  if (!product) throw ApiError.notFound("Product not found");
  if (product.stockQty < quantity)
    throw ApiError.badRequest(
      `Only ${product.stockQty} units in stock`,
      "INSUFFICIENT_STOCK",
    );

  const cart = await getOrCreateCart(req.user!.userId);

  const existing = cart.items.find((item) => item.productId === productId);
  if ((existing?.quantity ?? 0) + quantity > product.stockQty)
    throw ApiError.badRequest(`Only ${product.stockQty} units in stock`);

  await prisma.cartItem.upsert({
    where: { cartId_productId: { cartId: cart.id, productId } },
    create: { cartId: cart.id, productId, quantity },
    update: { quantity: { increment: quantity } },
  });

  const updated = await getOrCreateCart(req.user!.userId);
  res.json({ success: true, data: { ...updated, total: calcTotal(updated) } });
});

export const updateCartItem = asyncHandler(
  async (req: Request, res: Response) => {
    const quantity = Number(req.body.quantity);
    if (!quantity || quantity < 1)
      throw ApiError.badRequest("Invalid quantity");

    const item = await prisma.cartItem.findFirst({
      where: {
        id: String(req.params.itemId),
        cart: { userId: req.user!.userId },
      },
    });
    if (!item) throw ApiError.notFound("Cart item not found");

    const product = await prisma.product.findUnique({
      where: { id: item.productId },
    });
    if (!product || !product.isActive || product.isDeleted)
      throw ApiError.badRequest("Product is no longer available");
    if (product.stockQty < quantity)
      throw ApiError.badRequest(`Only ${product.stockQty} units in stock`);

    await prisma.cartItem.update({
      where: { id: item.id },
      data: { quantity },
    });

    const updated = await getOrCreateCart(req.user!.userId);
    res.json({
      success: true,
      data: { ...updated, total: calcTotal(updated) },
    });
  },
);

export const removeCartItem = asyncHandler(
  async (req: Request, res: Response) => {
    const item = await prisma.cartItem.findFirst({
      where: {
        id: String(req.params.itemId),
        cart: { userId: req.user!.userId },
      },
    });
    if (!item) throw ApiError.notFound("Cart item not found");
    await prisma.cartItem.delete({ where: { id: item.id } });
    const updated = await getOrCreateCart(req.user!.userId);
    res.json({
      success: true,
      data: { ...updated, total: calcTotal(updated) },
    });
  },
);

export const clearCart = asyncHandler(async (req: Request, res: Response) => {
  const cart = await prisma.cart.findUnique({
    where: { userId: req.user!.userId },
  });
  if (!cart) throw ApiError.notFound("Cart not found");
  await prisma.cartItem.deleteMany({ where: { cartId: cart.id } });
  res.json({ success: true, data: { items: [], total: 0 } });
});
