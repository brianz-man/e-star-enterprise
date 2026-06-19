import { z } from "zod";

export const createOrderSchema = z.object({
  addressId: z.string().uuid().optional(),
  deliveryAddress: z.object({
    firstName: z.string().min(2),
    lastName: z.string().min(2),
    phone: z.string().min(10),
    county: z.string().min(2),
    town: z.string().min(2),
    street: z.string().min(3),
    postalCode: z.string().optional(),
  }),
  notes: z.string().max(500).optional(),
});

export const updateOrderStatusSchema = z.object({
  status: z.enum([
    "CONFIRMED",
    "PROCESSING",
    "SHIPPED",
    "DELIVERED",
    "CANCELLED",
  ]),
  note: z.string().optional(),
});

export const mpesaInitiateSchema = z.object({
  orderId: z.string().uuid(),
  phone: z.string().min(9),
});

export type CreateOrderInput = z.infer<typeof createOrderSchema>;
export type UpdateOrderStatusInput = z.infer<typeof updateOrderStatusSchema>;
export type MpesaInitiateInput = z.infer<typeof mpesaInitiateSchema>;
