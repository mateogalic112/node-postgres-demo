export class Money {
  constructor(private readonly amount: number) {}

  public getAmount() {
    return this.amount;
  }

  public getFormattedAmount(decimals: number = 2) {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "EUR",
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    }).format(this.amount / 100);
  }
}
