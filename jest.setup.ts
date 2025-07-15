if (!('json' in Response)) {
  // Node + fetch polyfills expose Response but not Response.json (static helper)
  // https://fetch.spec.whatwg.org/#dom-response-json
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  Response.json = (data: any, init?: ResponseInit) =>
    new Response(JSON.stringify(data), {
      headers: { 'content-type': 'application/json' },
      ...init,
    });
}

import 'cross-fetch/polyfill';          
(global as any).IS_REACT_ACT_ENVIRONMENT = true;
