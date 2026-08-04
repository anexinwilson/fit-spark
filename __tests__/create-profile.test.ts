import { POST } from "@/app/api/create-profile/route";
import { readResponse } from "./test-utils";

jest.mock("@/lib/auth", () => ({ getAuthenticatedUser: jest.fn() }));
jest.mock("@/lib/prisma", () => ({
  prisma: { profile: { findUnique: jest.fn(), create: jest.fn() } },
}));

import { getAuthenticatedUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

describe("create-profile", () => {
  it("401 when signed out", async () => {
    (getAuthenticatedUser as jest.Mock).mockResolvedValue(null);
    const res = await POST();
    expect((await readResponse(res)).status).toBe(401);
  });

  it("creates profile on first login", async () => {
    (getAuthenticatedUser as jest.Mock).mockResolvedValue({
      id: "u1",
      emailAddresses: [{ emailAddress: "me@test.com" }],
    });
    (prisma.profile.findUnique as jest.Mock).mockResolvedValue(null);

    const res = await POST();
    expect((await readResponse(res)).status).toBe(201);
    expect(prisma.profile.create).toHaveBeenCalled();
  });
});
