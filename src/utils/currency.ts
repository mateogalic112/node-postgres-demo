export class Currency {
  public static formatAmount(amountInCents: number) {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "EUR",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amountInCents / 100);
  }
}
