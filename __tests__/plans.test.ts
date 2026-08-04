describe("billing plans", () => {
  it("maps interval → priceID", async () => {
    const { getPriceId } = await import("@/features/billing/plans");
    expect(getPriceId("year")).toBe("price_year");
  });

  it("rejects unsupported intervals", async () => {
    const { isPlanInterval } = await import("@/features/billing/plans");
    expect(isPlanInterval("hour")).toBe(false);
  });
});
