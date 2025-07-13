export class Money {
  constructor(private readonly amountInCents: number) {}

  public getAmountInCents() {
    return this.amountInCents;
  }

  public getFormattedAmount(decimals: number = 2) {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "EUR",
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    }).format(this.amountInCents / 100);
  }
}
