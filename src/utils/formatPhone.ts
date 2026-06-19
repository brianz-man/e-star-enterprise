/**
 * Normalise a Kenyan phone number to the 2547XXXXXXXX format
 * required by Safaricom Daraja API.
 */
export const formatPhone = (phone: string): string => {
  const digits = phone.replace(/\D/g, "");

  if (digits.startsWith("0") && digits.length === 10)
    return "254" + digits.slice(1);

  if (digits.startsWith("7") && digits.length === 9) return "254" + digits;

  if (digits.startsWith("254") && digits.length === 12) return digits;

  throw new Error(`Invalid Kenyan phone number: ${phone}`);
};
