import { GET } from "@/app/api/check-subscription/route";
import { readResponse } from "../test-utils";

jest.mock("@/lib/prisma", () => ({
  prisma: { profile: { findUnique: jest.fn() } },
}));
jest.mock("@/lib/auth", () => ({
  getAuthenticatedUserId: jest.fn(),
}));
import { getAuthenticatedUserId } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

describe("check-subscription", () => {
  it("returns 401 when signed out", async () => {
    (getAuthenticatedUserId as jest.Mock).mockResolvedValue(null);
    const res = await GET();
    expect((await readResponse(res)).status).toBe(401);
  });

  it("returns the authenticated user's subscription status", async () => {
    (getAuthenticatedUserId as jest.Mock).mockResolvedValue("abc");
    (prisma.profile.findUnique as jest.Mock).mockResolvedValue({
      subscriptionActive: true,
    });
    const res = await GET();
    expect((await readResponse(res)).body).toEqual({
      subscriptionActive: true,
    });
    expect(prisma.profile.findUnique).toHaveBeenCalledWith({
      where: { userId: "abc" },
      select: { subscriptionActive: true },
    });
  });
});
