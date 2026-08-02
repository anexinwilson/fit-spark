const mockStripe = {
  checkout: { sessions: { create: jest.fn() } },
};

jest.mock('@/lib/stripe', () => ({
  getStripeClient: () => mockStripe,
}));

import { req, read } from './test-utils';

describe('checkout', () => {
  const base = { userId: 'user1', email: 'test@bmail.com' };

  beforeAll(() => {
    process.env.STRIPE_PRICE_MONTHLY = 'price_month'; 
  });

  it('bad plan → 400', async () => {
    const { POST } = await import('@/app/api/checkout/route');
    const res = await POST(
      req('http://test.local/checkout', 'POST', { ...base, planType: 'decade' }) as any,
    );
    expect((await read(res)).status).toBe(400);
  });

  it('success returns url', async () => {
    mockStripe.checkout.sessions.create.mockResolvedValue({ url: 'https://pay' });
    const { POST } = await import('@/app/api/checkout/route'); 
    const res = await POST(
      req('http://test.local/checkout', 'POST', { ...base, planType: 'month' }) as any,
    );
    expect((await read(res)).body.url).toBe('https://pay');
  });
});
