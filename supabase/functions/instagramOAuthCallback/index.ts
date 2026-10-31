import { withCors } from "../_shared/cors.ts";
// instagramOAuthCallback — Facebook sends the person back here after they allow Kramasha to read their Instagram photos.
// We swap the code for a Page token, store it encrypted and return them to My Profile. Public (Instagram
// calls it), protected by the signed state. Deploy with --no-verify-jwt.
import { appUrl, verifyState } from "../_shared/gmail.ts";
import { connectWithCode, forgetInstagramPhotos, saveInstagramAccount } from "../_shared/instagram.ts";

const back = (status: string, detail = "") =>
  new Response(null, { status: 302, headers: { Location: `${appUrl()}/my-profile?instagram=${status}${detail ? `&reason=${encodeURIComponent(detail)}` : ""}` } });

Deno.serve(withCors(async (req) => {
  try {
    const url = new URL(req.url);
    if (url.searchParams.get("error")) return back("denied");
    const code = url.searchParams.get("code");
    const state = await verifyState(url.searchParams.get("state") || "");
    if (!code || !state?.w || !state?.u || state.k !== "ig") return back("error", "expired");

    const account = await connectWithCode(code);
    await saveInstagramAccount(state.w, state.u, account);
    forgetInstagramPhotos(state.w);
    return back("connected");
  } catch (e) {
    console.error("instagramOAuthCallback", e);
    // Facebook's own wording (e.g. "redirect_uri isn't identical", "Invalid scope") tells the owner what to fix in the Meta app.
    const msg = String((e as Error)?.message || "").slice(0, 200);
    return back("error", msg === "no_page" ? "no_page" : msg || "server");
  }
}));
