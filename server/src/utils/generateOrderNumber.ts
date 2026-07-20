import crypto from "crypto";

export const generateOrderNumber = (): string => {
  const timestamp = Date.now().toString(36).toUpperCase();
  // crypto.randomBytes gives a much larger, non-predictable keyspace than
  // Math.random().toString(36) (which yields only ~4 base-36 chars of real
  // entropy and is not collision-resistant under concurrent checkouts).
  const random = crypto.randomBytes(5).toString("hex").toUpperCase();
  return `ES-${timestamp}-${random}`;
};
