import { z } from "zod";

export const orderStatusEnum = z.enum([
  "PENDING",
  "CONFIRMED",
  "PROCESSING",
  "SHIPPED",
  "DELIVERED",
  "CANCELLED",
]);

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1, "Page must be at least 1").default(1),
  limit: z.coerce.number().int().min(1, "Limit must be at least 1").max(100, "Limit cannot exceed 100").default(20),
});

export const orderFilterSchema = paginationSchema.extend({
  status: orderStatusEnum.optional(),
});

export type PaginationInput = z.infer<typeof paginationSchema>;
export type OrderFilterInput = z.infer<typeof orderFilterSchema>;
