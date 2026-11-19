// The inquiry form on its own, for a business to embed (in an iframe) on its own website. Same form, same spam
// protection and same Leads flow as on the public profile page; shown only while the profile is published and the
// owner has the inquiry form switched on, and (inside another page) only on the business's own website: the server
// compares the pages above the form with the website in the business details and says no for any other site.

import { useState, useEffect, useMemo, useRef } from "react";
import { useParams } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import InquiryForm from "@/components/publicpage/InquiryForm";
import { inferCategoryFromType } from "@/lib/businessTerminology";
import { EMBED_HEIGHT_MESSAGE, detectEmbedContext, embedStyleVars } from "@/lib/embedSnippet";
import { LOGO_URL } from "@/components/common/Logo";

export default function EmbedInquiry() {
  const { slug } = useParams();
  const [ws, setWs] = useState(null);
  const [state, setState] = useState("loading"); // loading | ready | off | blocked
  const rootRef = useRef(null);
  // Colours and a see-through card asked for in the address, so the form can match the website.
  const { vars, flat } = useMemo(() => embedStyleVars(window.location.search), []);

  // Sit on the website's own background instead of the app's.
  useEffect(() => {
    const prevBody = document.body.style.background;
    const prevHtml = document.documentElement.style.background;
    document.body.style.background = "transparent";
    document.documentElement.style.background = "transparent";
    return () => { document.body.style.background = prevBody; document.documentElement.style.background = prevHtml; };
  }, []);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await base44.functions.invoke("getPublicProfile", { slug, embed: detectEmbedContext() });
        if (!alive) return;
        // Anything but a clear "yes" from the server shows nothing (an older server never says it).
        if (res?.embed_allowed === false || (res?.v === 2 && res.workspace && res.embed_allowed !== true)) {
          setState("blocked");
          return;
        }
        const w = res?.v === 2 ? res.workspace : null;
        if (w?.inquiry) {
          const category = w.business_category && w.business_category !== "OTHER" ? w.business_category : inferCategoryFromType(w.business_type);
          setWs({ ...w, business_category: category });
          setState("ready");
        } else {
          setState("off");
        }
      } catch {
        if (alive) setState("off");
      }
    })();
    return () => { alive = false; };
  }, [slug]);

  // Tell the website how tall the form is, now and whenever it changes (dates, errors, the thank-you message).
  useEffect(() => {
    const el = rootRef.current;
    if (!el || window.parent === window) return undefined;
    const send = () => window.parent.postMessage({ type: EMBED_HEIGHT_MESSAGE, height: Math.ceil(el.getBoundingClientRect().height) + 2 }, "*");
    send();
    const ro = new ResizeObserver(send);
    ro.observe(el);
    return () => ro.disconnect();
  }, [state]);

  return (
    <div ref={rootRef} className={flat ? "p-1 embed-flat" : "p-1"} style={vars}>
      {state === "loading" && (
        <div className="flex flex-col items-center justify-center gap-2 py-10 text-muted-foreground" role="status" aria-live="polite">
          <Loader2 className="h-7 w-7 animate-spin text-primary" />
          <span className="text-xs">Loading form…</span>
        </div>
      )}
      {state === "ready" && <InquiryForm slug={slug} workspace={ws} />}
      {state === "ready" && (
        // Opens the business's profile page in a new tab, not inside the small frame.
        <a
          href={`/p/${slug}`}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-2 flex items-center justify-center gap-1.5 py-2 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
        >
          <img src={LOGO_URL} alt="" className="w-4 h-4 rounded-full object-cover" />
          <span>Made with <span className="font-semibold text-foreground">Kramasha</span></span>
        </a>
      )}
      {state === "blocked" && (
        <p className="text-sm text-muted-foreground text-center py-6">
          This form can only be shown on the business's own website.
          {detectEmbedContext().ancestors.length > 0 && <span className="block text-[11px] mt-1">Opened from {detectEmbedContext().ancestors.join(" › ")}</span>}
        </p>
      )}
      {state === "off" && (
        <p className="text-sm text-muted-foreground text-center py-6">This inquiry form isn't available right now.</p>
      )}
    </div>
  );
}
