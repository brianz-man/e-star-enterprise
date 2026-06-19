import { z } from "zod";

export const addToCartSchema = z.object({
  productId: z.string().uuid(),
  quantity: z.number().int().min(1).max(50).default(1),
});

export const updateCartItemSchema = z.object({
  quantity: z.number().int().min(1).max(50),
});

export type AddToCartInput = z.infer<typeof addToCartSchema>;
export type UpdateCartInput = z.infer<typeof updateCartItemSchema>;
