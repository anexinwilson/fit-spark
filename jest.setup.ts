import "cross-fetch/polyfill";

if (!("json" in Response)) {
  Object.defineProperty(Response, "json", {
    configurable: true,
    value: (data: unknown, init?: ResponseInit) =>
      new Response(JSON.stringify(data), {
        headers: { "content-type": "application/json" },
        ...init,
      }),
  });
}

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
