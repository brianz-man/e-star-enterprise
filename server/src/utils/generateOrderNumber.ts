import crypto from "crypto";

export const generateOrderNumber = (): string => {
  const timestamp = Date.now().toString(36).toUpperCase();

  const random = crypto.randomBytes(5).toString("hex").toUpperCase();
  return `ES-${timestamp}-${random}`;
};
