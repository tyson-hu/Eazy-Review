/**
 * Currency-aware price display for Product Detail offers and lowest-price summary.
 * Whole amounts omit cents; non-integers always show 2 fraction digits (never rounds away cents).
 */
export function formatPrice(amount: number, currency = 'USD'): string {
  const fractionDigits = Number.isInteger(amount) ? 0 : 2;
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      minimumFractionDigits: fractionDigits,
      maximumFractionDigits: fractionDigits,
    }).format(amount);
  } catch {
    return `${currency} ${amount}`;
  }
}
