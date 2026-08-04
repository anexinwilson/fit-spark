describe("billing plans", () => {
  beforeAll(() => {
    process.env.STRIPE_PRICE_YEARLY = "price_year";
    jest.resetModules();
  });

  it("maps interval → priceID", async () => {
    const { getPriceId } = await import("@/features/billing/plans");
    expect(getPriceId("year")).toBe("price_year");
  });

  it("rejects unsupported intervals", async () => {
    const { isPlanInterval } = await import("@/features/billing/plans");
    expect(isPlanInterval("hour")).toBe(false);
  });
});
