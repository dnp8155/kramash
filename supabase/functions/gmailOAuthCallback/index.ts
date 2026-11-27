import { withCors } from "../_shared/cors.ts";
// gmailOAuthCallback — Google sends the person back here after they allow "send email". We swap the code for a
// token, store it encrypted and return them to Preferences. Public (Google calls it), protected by the signed state.
import { supabaseAdmin } from "../_shared/supabaseClient.ts";
import { appUrl, emailFromIdToken, encryptToken, exchangeCode, verifyState } from "../_shared/gmail.ts";

const back = (status: string, detail = "") =>
  new Response(null, { status: 302, headers: { Location: `${appUrl()}/preferences?group=business&gmail=${status}${detail ? `&reason=${encodeURIComponent(detail)}` : ""}` } });

Deno.serve(withCors(async (req) => {
  try {
    const url = new URL(req.url);
    if (url.searchParams.get("error")) return back("denied");
    const code = url.searchParams.get("code");
    const state = await verifyState(url.searchParams.get("state") || "");
    if (!code || !state?.w || !state?.u) return back("error", "expired");

    const tokens = await exchangeCode(code);
    if (!tokens.scope?.includes("gmail.send")) return back("error", "permission");
    if (!tokens.refresh_token) return back("error", "no_token");
    const email = emailFromIdToken(tokens.id_token);
    if (!email) return back("error", "no_email");

    const { error } = await supabaseAdmin.from("messaging_accounts").upsert({
      workspace_id: state.w, user_id: state.u, provider: "gmail", email,
      refresh_token_enc: await encryptToken(tokens.refresh_token), status: "active", last_error: null,
    }, { onConflict: "workspace_id,provider" });
    if (error) return back("error", "save");
    return back("connected");
  } catch (e) {
    console.error("gmailOAuthCallback", e);
    return back("error", "server");
  }
}));
