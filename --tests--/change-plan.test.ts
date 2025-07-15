import { POST } from '@/app/api/profile/change-plan/route';
import { req, read } from './test-utils';

jest.mock('@clerk/nextjs/server', () => ({ currentUser: jest.fn() }));
jest.mock('@/lib/prisma', () => ({
  prisma: { profile: { findUnique: jest.fn(), update: jest.fn() } },
}));
jest.mock('@/lib/stripe', () => ({
  stripe: { subscriptions: { retrieve: jest.fn(), update: jest.fn() } },
}));

import { currentUser } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';
import { stripe } from '@/lib/stripe';

describe('change-plan', () => {
  beforeEach(() => {
    (currentUser as jest.Mock).mockResolvedValue({ id: 'u1' });
    (prisma.profile.findUnique as jest.Mock).mockResolvedValue({
      userId: 'u1',
      stripeSubscriptionId: 'sub_123',
    });
    (stripe.subscriptions.retrieve as jest.Mock).mockResolvedValue({
      items: { data: [{ id: 'si_1' }] },
    });
    (stripe.subscriptions.update as jest.Mock).mockResolvedValue({ id: 'sub_new' });
    (prisma.profile.update as jest.Mock).mockResolvedValue({ subscriptionTier: 'month' });
  });

  it('updates plan', async () => {
    const res = await POST(
      req('http://test.local/change', 'POST', { newPlan: 'month' }) as any,
    );
    expect((await read(res)).body.subscription.subscriptionTier).toBe('month');
  });
});
