export const StockBadge = ({ qty }: { qty: number }) => {
  if (qty === 0)   return <span className="badge bg-red-100 text-red-700">Out of Stock</span>
  if (qty <= 5)    return <span className="badge bg-amber-100 text-amber-700">Only {qty} left</span>
  return               <span className="badge bg-green-100 text-green-700">In Stock</span>
}