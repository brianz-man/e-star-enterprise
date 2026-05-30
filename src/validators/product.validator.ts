import { z } from "zod";

const compatibilitySchema = z.object({
  brand: z.string().min(1),
  printerModel: z.string().min(1),
  printerSeries: z.string().optional(),
});

export const createProductSchema = z.object({
  name: z.string().min(2),
  description: z.string().min(10),
  sku: z.string().min(2).toUpperCase(),
  price: z.number().positive(),
  comparePrice: z.number().positive().optional(),
  stockQty: z.number().int().min(0).default(0),
  lowStockAt: z.number().int().min(1).default(5),
  brandId: z.string().uuid(),
  categoryId: z.string().uuid(),
  isFeatured: z.boolean().default(false),
  weight: z.number().positive().optional(),
  compatibility: z.array(compatibilitySchema).default([]),
});

export const updateProductSchema = createProductSchema.partial();

export const productQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  brand: z.string().optional(),
  category: z.string().optional(),
  search: z.string().optional(),
  featured: z.coerce.boolean().optional(),
  sort: z
    .enum(["price_asc", "price_desc", "newest", "name_asc"])
    .default("newest"),
  minPrice: z.coerce.number().optional(),
  maxPrice: z.coerce.number().optional(),
});

export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;
export type ProductQuery = z.infer<typeof productQuerySchema>;
