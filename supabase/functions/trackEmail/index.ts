import { withCors } from "../_shared/cors.ts";
// trackEmail — public. The invisible pixel in a client email ("Likely opened") and the signed links in it
// ("Link clicked", then on to the real page). Needs no login: the signed token is the key.
import { supabaseAdmin } from "../_shared/supabaseClient.ts";
import { appUrl, signLink } from "../_shared/gmail.ts";

const GIF = Uint8Array.from(atob("R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7"), (c) => c.charCodeAt(0));
const isToken = (s: string | null) => !!s && /^[0-9a-f-]{36}$/i.test(s);

Deno.serve(withCors(async (req) => {
  const url = new URL(req.url);
  const token = url.searchParams.get("t");
  try {
    if (url.searchParams.get("p") === "1") {
      if (isToken(token)) {
        await supabaseAdmin.from("message_log").update({ opened_at: new Date().toISOString() }).eq("tracking_token", token!).is("opened_at", null);
      }
      return new Response(GIF, { headers: { "Content-Type": "image/gif", "Cache-Control": "no-store, max-age=0" } });
    }

    const target = url.searchParams.get("u") || "";
    const sig = url.searchParams.get("s") || "";
    if (!isToken(token) || !/^https?:\/\//i.test(target) || (await signLink(token!, target)) !== sig) {
      return new Response(null, { status: 302, headers: { Location: appUrl() } });
    }
    const { data: row } = await supabaseAdmin.from("message_log").select("id, click_count, clicked_at").eq("tracking_token", token!).maybeSingle();
    if (row) {
      await supabaseAdmin.from("message_log").update({
        clicked_at: row.clicked_at || new Date().toISOString(), click_count: (row.click_count || 0) + 1,
        // Someone who clicked has plainly opened it, even if their mail app blocked the pixel.
        opened_at: new Date().toISOString(),
      }).eq("id", row.id);
    }
    return new Response(null, { status: 302, headers: { Location: target } });
  } catch {
    return target && /^https?:\/\//i.test(target) ? new Response(null, { status: 302, headers: { Location: target } }) : new Response(GIF, { headers: { "Content-Type": "image/gif" } });
  }
}));
