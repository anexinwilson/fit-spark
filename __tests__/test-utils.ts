import { NextRequest } from "next/server";

export function createRequest(
  url: string,
  method: "GET" | "POST" = "GET",
  body?: unknown,
): NextRequest {
  return new NextRequest(url, {
    method,
    ...(body === undefined
      ? {}
      : {
          body: JSON.stringify(body),
          headers: { "content-type": "application/json" },
        }),
  });
}

export async function readResponse(response: Response) {
  return {
    status: response.status,
    body: (await response.json()) as unknown,
  };
}
