/**
 * Build the minimal stub an API-route handler expects.
 * – GET  → object with { url }
 * – POST → object with { url, json(), headers.get() }
 * No NextRequest, so no absolute-URL complaints.
 */
export const req = (
  url: string,
  method: 'GET' | 'POST' = 'GET',
  body?: unknown,
) =>
  method === 'GET'
    ? ({ url } as any)
    : ({
        url,
        json: async () => body,
        headers: { get: () => 'application/json' },
      } as any);

/** Expect helpers */
export const read = async (res: Response) => ({
  status: res.status,
  body: await res.json(),
});
