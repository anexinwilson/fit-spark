import { POST } from "@/app/api/create-profile/route";
import { read } from "./test-utils";

jest.mock("@clerk/nextjs/server", () => ({ currentUser: jest.fn() }));
jest.mock("@/lib/prisma", () => ({
  prisma: { profile: { findUnique: jest.fn(), create: jest.fn() } },
}));

import { currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

describe("create-profile", () => {
  it("404 when no Clerk user", async () => {
    (currentUser as jest.Mock).mockResolvedValue(null);
    const res = await POST();
    expect((await read(res)).status).toBe(404);
  });

  it("creates profile on first login", async () => {
    (currentUser as jest.Mock).mockResolvedValue({
      id: "u1",
      emailAddresses: [{ emailAddress: "me@test.com" }],
    });
    (prisma.profile.findUnique as jest.Mock).mockResolvedValue(null);

    const res = await POST();
    expect((await read(res)).status).toBe(201);
    expect(prisma.profile.create).toHaveBeenCalled();
  });
});
