import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Loader2, Calendar, MapPin, ShieldCheck, FileText, ArrowRight } from "lucide-react";
import PortalTimeline from "@/components/portal/PortalTimeline";
import PortalQuotationCard from "@/components/portal/PortalQuotationCard";
import PortalMilestoneCard from "@/components/portal/PortalMilestoneCard";
import PortalTeamSection from "@/components/portal/PortalTeamSection";
import PortalServiceSection from "@/components/portal/PortalServiceSection";
import { generateQuotationPdf } from "@/lib/quotationPdf";
import { CURRENCY_SYMBOLS } from "@/constants/financeConfig";

function formatDate(iso) {
  if (!iso) return "—";
  try {
    return new Date(iso + "T00:00:00").toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
  } catch {
    return iso;
  }
}

function formatDateRange(start, end) {
  if (!start) return "—";
  if (!end || start === end) return formatDate(start);
  return `${formatDate(start)} – ${formatDate(end)}`;
}

function categoryLabel(cat) {
  const map = {
    PHOTOGRAPHY: "Photography / Videography",
    EVENT_MANAGEMENT: "Event Management",
    ARCHITECTURE: "Architecture / Interior Design",
    OTHER: "Services"
  };
  return map[cat] || cat || "";
}

function contextLabel(ctx) {
  const map = {
    bride_side: "Bride Side",
    groom_side: "Groom Side",
    common: "Common",
    residential: "Residential",
    commercial: "Commercial",
    office: "Office",
    renovation: "Renovation",
    interior: "Interior"
  };
  return map[ctx] || ctx || "";
}

export default function ClientProjectPortal() {
  const { token } = useParams();
  const navigate = useNavigate();
  const isPreview = new URLSearchParams(window.location.search).has("preview");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [unavailable, setUnavailable] = useState(false);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError("");
      setUnavailable(false);
      try {
        const res = await base44.functions.invoke("getPortalData", { public_token: token, skip_tracking: isPreview });
        if (res.data.unavailable) {
          setUnavailable(true);
          setData(null);
        } else {
          setData(res.data);
        }
      } catch (e) {
        setError(e?.message || "Failed to load project portal");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [token]);

  const goToQuotation = () => {
    if (data?.quotation?.public_token) {
      const qToken = data.quotation.public_token;
      navigate(isPreview ? `/q/${qToken}?preview=1` : `/q/${qToken}`);
    }
  };

  const downloadPdf = async () => {
    if (!data?.quotation?.public_token) return;
    setDownloading(true);
    try {
      const res = await base44.functions.invoke("clientViewQuotation", { public_token: data.quotation.public_token, skip_tracking: true });
      if (res.data.requires_auth) {
        navigate(`/q/${data.quotation.public_token}`);
        return;
      }
      await generateQuotationPdf({
        quotation: res.data.quotation,
        items: res.data.items,
        currency: res.data.quotation.currency || data.currency
      });
    } catch (e) {
      navigate(`/q/${data.quotation.public_token}`);
    } finally {
      setDownloading(false);
    }
  };

  // ---- Loading ----
  if (loading) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-muted/30">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="w-5 h-5 animate-spin" /> Loading project…
        </div>
      </div>
    );
  }

  // ---- Error ----
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
        <div className="max-w-md w-full bg-card border border-border rounded-xl p-8 text-center">
          <FileText className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <h1 className="text-lg font-semibold text-foreground">Project unavailable</h1>
          <p className="text-sm text-muted-foreground mt-1">{error}</p>
        </div>
      </div>
    );
  }

  // ---- Public link disabled ----
  if (unavailable) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
        <div className="max-w-md w-full bg-card border border-border rounded-xl p-8 text-center">
          <FileText className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <h1 className="text-lg font-semibold text-foreground">Project link unavailable</h1>
          <p className="text-sm text-muted-foreground mt-1">
            This project link is currently unavailable. Please contact your service provider for more information.
          </p>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const { project, quotation, timeline, milestones, team, services, currency, total_received, business_name, business_logo } = data;

  // ---- Project Header ----
  const subType = [categoryLabel(project.category), contextLabel(project.context_type)].filter(Boolean).join(" · ");

  return (
    <div className="min-h-dvh bg-muted/30 pb-12">
      {/* Top bar */}
      <div className="bg-card border-b border-border safe-area-top">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {business_logo ? (
              <img src={business_logo} alt="" className="w-7 h-7 rounded object-cover" />
            ) : (
              <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center">
                <FileText className="w-4 h-4 text-primary-foreground" />
              </div>
            )}
            <span className="text-sm font-semibold text-foreground">{business_name || "Project Portal"}</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <ShieldCheck className="w-3.5 h-3.5" />
            Secure Client Portal
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-6 space-y-5">
        {/* Project Header — clean, minimal, light card */}
        <div className="bg-card border border-border rounded-xl p-5 sm:p-6">
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
            {subType || "Project"}
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground break-anywhere">
            {project.title || "Untitled Project"}
          </h1>
          <div className="flex flex-wrap gap-x-5 gap-y-2 mt-3 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <Calendar className="w-4 h-4 shrink-0" />
              {formatDateRange(project.event_date, project.event_end_date)}
            </span>
            {project.venue && (
              <span className="inline-flex items-center gap-1.5">
                <MapPin className="w-4 h-4 shrink-0" />
                {project.venue}
              </span>
            )}
          </div>
        </div>

        {/* Timeline */}
        <PortalTimeline currentStage={timeline.current_stage} stages={timeline.stages} />

        {/* Quotation Status Card */}
        <PortalQuotationCard
          quotation={quotation}
          currency={currency}
          onReviewSign={goToQuotation}
          onViewQuotation={goToQuotation}
          onDownloadPdf={downloadPdf}
          downloading={downloading}
        />

        {/* Payment Milestones — only show after quotation is accepted */}
        {quotation.status === "accepted" && milestones.length > 0 && (
          <PortalMilestoneCard
            milestones={milestones}
            totalReceived={total_received}
            grandTotal={quotation.grand_total}
            currency={currency}
          />
        )}

        {/* Team Section */}
        <PortalTeamSection team={team} />

        {/* Service Section */}
        <PortalServiceSection services={services} />

        {/* Footer */}
        <div className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground pt-2">
          <ShieldCheck className="w-3.5 h-3.5" />
          Secure project portal powered by Kramasha
        </div>
      </div>
    </div>
  );
}