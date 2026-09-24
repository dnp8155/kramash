// ============================================================
// CORS Helper — adds Access-Control headers to all Edge Function
// responses so browser-based apps can call them cross-origin.
// ============================================================

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-requested-with",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS, PUT, DELETE",
  "Access-Control-Max-Age": "86400",
};

/**
 * Wrap a Deno.serve handler to automatically add CORS headers
 * to every response and handle OPTIONS preflight requests.
 *
 * Usage:
 *   import { withCors } from "../_shared/cors.ts";
 *   Deno.serve(withCors(async (req) => { ... }));
 */
export function withCors(
  handler: (req: Request) => Promise<Response> | Response,
): (req: Request) => Promise<Response> {
  return async (req: Request) => {
    // Handle CORS preflight
    if (req.method === "OPTIONS") {
      return new Response("ok", {
        status: 200,
        headers: corsHeaders,
      });
    }

    // Run the actual handler
    const response = await handler(req);

    // If the handler already set CORS headers (e.g. webhook handlers
    // that need specific origins), don't override them.
    const existingOrigin = response.headers.get("Access-Control-Allow-Origin");
    if (existingOrigin) {
      return response;
    }

    // Clone the response with CORS headers added
    const newHeaders = new Headers(response.headers);
    for (const [key, value] of Object.entries(corsHeaders)) {
      newHeaders.set(key, value);
    }

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: newHeaders,
    });
  };
}