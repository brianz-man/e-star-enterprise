export function kes(amount: number | string) {
  const value =
    typeof amount === "string"
      ? Number(amount)
      : amount;

  return new Intl.NumberFormat("en-KE", {
    style: "currency",
    currency: "KES",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

/** comparePrice = original/was price, price = current sale price */
export function discountPct(
  price: number | string,
  comparePrice?: number | string | null,
) {
  const sale = Number(price);
  const original = Number(comparePrice);

  if (!comparePrice || original <= 0 || sale >= original) {
    return 0;
  }

  return Math.round(((original - sale) / original) * 100);
}