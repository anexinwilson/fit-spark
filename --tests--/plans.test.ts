describe('getPriceIDFromType', () => {
  beforeAll(() => {
    process.env.STRIPE_PRICE_YEARLY = 'price_year';
    jest.resetModules();            
  });

  it('maps interval → priceID', async () => {
    const { getPriceIDFromType } = await import('@/lib/plans');
    expect(getPriceIDFromType('year')).toBe('price_year');
  });

  it('returns undefined for unsupported key', async () => {
    const { getPriceIDFromType } = await import('@/lib/plans');
    expect(getPriceIDFromType('hour')).toBeUndefined();
  });
});
