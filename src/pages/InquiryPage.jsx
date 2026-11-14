// A page that holds only the business's inquiry form, with its own link (/p/<slug>/inquiry) to share anywhere:
// a WhatsApp message, an Instagram bio, a QR code. Same form, spam protection and Leads flow as on the full
// profile page. Shown only while the profile is published and the owner has the inquiry form switched on.

import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { Building2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import InquiryForm from "@/components/publicpage/InquiryForm";
import PublicFooter from "@/components/common/PublicFooter";
import UnavailableScreen from "@/components/common/UnavailableScreen";
import AppLoadingScreen from "@/components/common/AppLoadingScreen";
import FadeImg from "@/components/common/FadeImg";
import useSEO from "@/hooks/useSEO";
import { inferCategoryFromType } from "@/lib/businessTerminology";

export default function InquiryPage() {
  const { slug } = useParams();
  const [ws, setWs] = useState(null);
  const [state, setState] = useState("loading"); // loading | ready | off
  const [logoError, setLogoError] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await base44.functions.invoke("getPublicProfile", { slug });
        if (!alive) return;
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

  useSEO({
    title: ws ? `Send an inquiry to ${ws.name} — Kramasha` : "Send an inquiry — Kramasha",
    description: ws ? `Send an inquiry to ${ws.name}${ws.tagline ? ` — ${ws.tagline}` : ""}.` : "Send an inquiry to a business on Kramasha.",
    image: ws?.logo,
    path: `/p/${slug || ""}/inquiry`,
  });

  if (state === "loading") return <AppLoadingScreen label="Loading form…" />;
  if (state === "off" || !ws) {
    return <UnavailableScreen title="Inquiry Form Not Available" message="This business isn't taking inquiries here right now." />;
  }

  return (
    <div className="min-h-dvh bg-background">
      <div className="max-w-xl mx-auto px-4 sm:px-6 pt-10 pb-6 flex flex-col items-center text-center gap-2">
        <div className="w-[72px] h-[72px] rounded-[20px] overflow-hidden border border-border bg-card flex items-center justify-center">
          {ws.logo && !logoError
            ? <FadeImg src={ws.logo} alt={ws.name} className="w-full h-full object-cover" onError={() => setLogoError(true)} />
            : <Building2 className="w-8 h-8 text-muted-foreground" />}
        </div>
        <h1 className="text-xl font-bold text-foreground mt-1">{ws.name}</h1>
        {ws.tagline && <p className="text-sm text-muted-foreground">{ws.tagline}</p>}
      </div>
      <div className="max-w-xl mx-auto px-4 sm:px-6 pb-6">
        <InquiryForm slug={slug} workspace={ws} />
        <p className="text-center mt-3">
          <Link to={`/p/${slug}`} className="text-xs text-muted-foreground hover:text-foreground transition-colors">View {ws.name}'s full profile</Link>
        </p>
        <PublicFooter name={ws.name} />
      </div>
    </div>
  );
}
