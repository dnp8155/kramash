import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Building2, ArrowRight } from "lucide-react";
import { base44 } from "@/api/base44Client";
import PublicFooter from "@/components/common/PublicFooter";
import UnavailableScreen from "@/components/common/UnavailableScreen";
import AppLoadingScreen from "@/components/common/AppLoadingScreen";
import FadeImg from "@/components/common/FadeImg";
import PortalReviewCard from "@/components/portal/PortalReviewCard";
import { setDateFormat } from "@/lib/dates";
import useSEO from "@/hooks/useSEO";
import { invokeEarly } from "@/lib/earlyData";

// /review/<token>: a client's own review link, for clients without the Client Portal. The owner copies or shares it
// from the client's page; the client rates the business here and can come back to the same link to edit it.
export default function ClientReviewPage() {
  const { token } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [logoError, setLogoError] = useState(false);

  useEffect(() => {
    let live = true;
    (async () => {
      setLoading(true);
      try {
        const d = await invokeEarly("submitEventReview", { mode: "link", action: "get", token });
        if (!live) return;
        setDateFormat(d?.business?.date_format);
        setData(d);
      } catch (e) {
        if (live) setError(e?.message || "This link is not available.");
      } finally {
        if (live) setLoading(false);
      }
    })();
    return () => { live = false; };
  }, [token]);

  const biz = data?.business || {};
  useSEO({
    noIndex: true,
    path: `/review/${token || ""}`,
    // Tab title per client, like the other client links ("Progress update: … - Business").
    title: biz.name ? `Review for ${biz.name}${data?.client_name ? ` - ${data.client_name}` : ""}` : "Leave a Review",
    description: biz.name ? `Tell ${biz.name} how it went.` : "Tell us how it went.",
    keywords: " ",
    image: "https://www.kramasha.com/share/review.jpg",
  });

  if (loading) return <AppLoadingScreen label="Loading…" />;
  if (error || !data?.review) return <UnavailableScreen title="This page is unavailable" message={error || "This link is not available."} />;

  const firstName = String(data.client_name || "").trim().split(/\s+/)[0];

  // Left-aligned, like a letter from the business: logo with name and tagline in one row, a line under it, then the
  // greeting and the card. With a published profile the bottom links to it and uses the profile footer; without one
  // it simply says whose reviews these are, with the secure-page footer.
  return (
    <div className="min-h-dvh bg-background">
      <div className="max-w-xl mx-auto px-4 sm:px-6 pt-8 sm:pt-12">
        <div className="flex items-center gap-3.5 pb-5 border-b border-border">
          <div className="w-14 h-14 rounded-[16px] overflow-hidden border border-border bg-card flex items-center justify-center shrink-0">
            {biz.logo && !logoError
              ? <FadeImg src={biz.logo} alt={biz.name} className="w-full h-full object-cover" onError={() => setLogoError(true)} />
              : <Building2 className="w-6 h-6 text-muted-foreground" />}
          </div>
          <div className="min-w-0">
            <h1 className="text-lg font-bold text-foreground leading-tight break-words">{biz.name}</h1>
            {biz.tagline && <p className="text-sm text-muted-foreground mt-0.5 break-words">{biz.tagline}</p>}
          </div>
        </div>
      </div>
      <div className="max-w-xl mx-auto px-4 sm:px-6 pt-6 pb-6 space-y-5">
        <div>
          <h2 className="text-xl font-semibold text-foreground text-pretty">{firstName ? `Hi ${firstName}, how did it go?` : "How did it go?"}</h2>
          <p className="text-sm text-muted-foreground mt-1.5 text-pretty">Your review helps {biz.name || "us"} and helps others choose. It takes a minute, and you can edit it later from this same link.</p>
        </div>

        <PortalReviewCard
          review={data.review}
          businessName={biz.name}
          send={(rating, review) => base44.functions.invoke("submitEventReview", { mode: "link", token, rating, review })}
        />

        {biz.profile_slug ? (
          <>
            <p>
              <Link to={`/p/${biz.profile_slug}`} className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline">View {biz.name}&apos;s full profile <ArrowRight className="w-3.5 h-3.5" /></Link>
            </p>
            <PublicFooter name={biz.name} />
          </>
        ) : (
          <>
            <p className="text-xs text-muted-foreground">Reviews for {biz.name}</p>
            <PublicFooter name={biz.name} secureLine="Secured Review Page, powered by" />
          </>
        )}
      </div>
    </div>
  );
}
