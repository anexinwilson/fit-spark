const mockStripe = {
  checkout: { sessions: { create: jest.fn() } },
};

jest.mock("@/lib/stripe", () => ({
  getStripeClient: () => mockStripe,
}));
jest.mock("@/lib/auth", () => ({
  getAuthenticatedUser: jest.fn().mockResolvedValue({
    id: "user1",
    emailAddresses: [{ emailAddress: "test@example.com" }],
  }),
}));

import { createRequest, readResponse } from "./test-utils";

describe("checkout", () => {
  it("returns 400 for an unsupported plan", async () => {
    const { POST } = await import("@/app/api/checkout/route");
    const response = await POST(
      createRequest("http://test.local/checkout", "POST", {
        planType: "decade",
      }),
    );

    expect((await readResponse(response)).status).toBe(400);
  });

  it("returns the Stripe checkout URL", async () => {
    mockStripe.checkout.sessions.create.mockResolvedValue({
      url: "https://pay",
    });
    const { POST } = await import("@/app/api/checkout/route");
    const response = await POST(
      createRequest("http://test.local/checkout", "POST", {
        planType: "month",
      }),
    );

    expect(await readResponse(response)).toMatchObject({
      body: { url: "https://pay" },
    });
  });
});
