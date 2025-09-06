export function getFormattedAmount(amountInCents: number, decimals: number = 2) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  }).format(amountInCents / 100);
}
