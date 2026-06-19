import { Request, Response } from "express";
import { prisma } from "../config/db";
import { asyncHandler } from "../utils/asyncHandler";
import { ApiError } from "../utils/ApiError";
import { slugify } from "./../utils/slugify";
import {
  uploadProductImage,
  deleteProductImage,
} from "../services/cloudinary.service";
import {
  CreateProductInput,
  UpdateProductInput,
  ProductQuery,
} from "../validators/product.validator";
import { Prisma } from "@prisma/client";
export const getProducts = asyncHandler(async (req: Request, res: Response) => {
  const q = req.query as unknown as ProductQuery;

  const where: Prisma.ProductWhereInput = {
    isActive: true,
    ...(q.brand && { brand: { slug: q.brand } }),
    ...(q.category && { category: { slug: q.category } }),
    ...(q.featured !== undefined && { isFeatured: q.featured }),
    ...(q.minPrice || q.maxPrice
      ? {
          price: {
            ...(q.minPrice && { gte: q.minPrice }),
            ...(q.maxPrice && { lte: q.maxPrice }),
          },
        }
      : {}),
    ...(q.search && {
      OR: [
        { name: { contains: q.search, mode: "insensitive" } },
        { description: { contains: q.search, mode: "insensitive" } },
        { sku: { contains: q.search, mode: "insensitive" } },
        {
          compatibility: {
            some: { printerModel: { contains: q.search, mode: "insensitive" } },
          },
        },
      ],
    }),
  };

  const orderBy: Prisma.ProductOrderByWithRelationInput =
    q.sort === "price_asc"
      ? { price: "asc" }
      : q.sort === "price_desc"
        ? { price: "desc" }
        : q.sort === "name_asc"
          ? { name: "asc" }
          : { createdAt: "desc" };

  const skip = (q.page - 1) * q.limit;

  const [products, total] = await prisma.$transaction([
    prisma.product.findMany({
      where,
      orderBy,
      skip,
      take: q.limit,
      include: {
        images: { where: { isPrimary: true }, take: 1 },
        brand: { select: { id: true, name: true, slug: true } },
        category: { select: { id: true, name: true, slug: true } },
        reviews: { select: { rating: true } },
      },
    }),
    prisma.product.count({ where }),
  ]);

  const data = products.map((p) => ({
    ...p,
    avgRating: p.reviews.length
      ? +(
          p.reviews.reduce((s, r) => s + r.rating, 0) / p.reviews.length
        ).toFixed(1)
      : null,
    reviewCount: p.reviews.length,
    reviews: undefined,
  }));

  res.json({
    success: true,
    data,
    meta: { total, page: q.page, pages: Math.ceil(total / q.limit) },
  });
});

export const getProductBySlug = asyncHandler(
  async (req: Request, res: Response) => {
    const product = await prisma.product.findFirst({
      where: { slug: String(req.params.slug), isActive: true },
      include: {
        images: { orderBy: [{ isPrimary: "desc" }, { sortOrder: "asc" }] },
        brand: true,
        category: true,
        compatibility: { orderBy: { brand: "asc" } },
        reviews: {
          where: { isVisible: true },
          include: { user: { select: { firstName: true, lastName: true } } },
          orderBy: { createdAt: "desc" },
          take: 20,
        },
      },
    });
    if (!product)
      throw ApiError.notFound("Product not found", "PRODUCT_NOT_FOUND");

    const avgRating = product.reviews.length
      ? +(
          product.reviews.reduce((s, r) => s + r.rating, 0) /
          product.reviews.length
        ).toFixed(1)
      : null;

    res.json({ success: true, data: { ...product, avgRating } });
  },
);

export const createProduct = asyncHandler(
  async (req: Request, res: Response) => {
    const { compatibility, ...rest } = req.body as CreateProductInput;

    const product = await prisma.product.create({
      data: {
        ...rest,
        price: rest.price,
        slug: slugify(rest.name),
        compatibility: { create: compatibility },
      },
      include: {
        brand: true,
        category: true,
        images: true,
        compatibility: true,
      },
    });

    res.status(201).json({ success: true, data: product });
  },
);

export const updateProduct = asyncHandler(
  async (req: Request, res: Response) => {
    const { id } = req.params;
    const { compatibility, ...rest } = req.body as UpdateProductInput;

    const exists = await prisma.product.findUnique({
      where: { id: String(req.params.id) },
    });
    if (!exists) throw ApiError.notFound("Product not found");

    const product = await prisma.product.update({
      where: { id: String(req.params.id) },
      data: {
        ...rest,
        ...(rest.name && { slug: slugify(rest.name) }),
        ...(compatibility && {
          compatibility: {
            deleteMany: {},
            create: compatibility,
          },
        }),
      },
      include: {
        brand: true,
        category: true,
        images: true,
        compatibility: true,
      },
    });

    res.json({ success: true, data: product });
  },
);

export const deleteProduct = asyncHandler(
  async (req: Request, res: Response) => {
    const { id } = req.params;
    await prisma.product.update({
      where: { id: String(req.params.id) },
      data: { isActive: false },
    });
    res.json({ success: true, message: "Product deactivated" });
  },
);

export const uploadImage = asyncHandler(async (req: Request, res: Response) => {
  if (!req.file) throw ApiError.badRequest("No file uploaded");
  const product = await prisma.product.findUnique({
    where: { id: String(req.params.id) },
  });
  if (!product) throw ApiError.notFound("Product not found");

  const { url, publicId } = await uploadProductImage(
    req.file.path,
    product.sku,
  );
  const isPrimary =
    (await prisma.productImage.count({ where: { productId: product.id } })) ===
    0;

  const image = await prisma.productImage.create({
    data: { productId: product.id, url, publicId, isPrimary },
  });

  res.status(201).json({ success: true, data: image });
});

export const deleteImage = asyncHandler(async (req: Request, res: Response) => {
  const image = await prisma.productImage.findUnique({
    where: { id: String(req.params.id) },
  });
  if (!image) throw ApiError.notFound("Image not found");
  await deleteProductImage(image.publicId);
  await prisma.productImage.delete({ where: { id: image.id } });
  res.json({ success: true, message: "Image deleted" });
});
