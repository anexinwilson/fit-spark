import { GET } from '@/app/api/check-subscription/route';
import { req, read } from './test-utils';

jest.mock('@/lib/prisma', () => ({
  prisma: { profile: { findUnique: jest.fn() } },
}));
import { prisma } from '@/lib/prisma';

describe('check-subscription', () => {
  it('500 when userId missing', async () => {
    const res = await GET(req('http://test.local/api') as any);
    expect((await read(res)).status).toBe(500);
  });

  it('returns subscriptionActive', async () => {
    (prisma.profile.findUnique as jest.Mock).mockResolvedValue({
      subscriptionActive: true,
    });
    const res = await GET(
      req('http://test.local/api?userId=abc') as any,
    );
    expect((await read(res)).body).toEqual({ subscriptionActive: true });
  });
});
