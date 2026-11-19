import PublicFooter from "@/components/common/PublicFooter";
import { contextDisplay } from "@/lib/quotationContext";
import UnavailableScreen from "@/components/common/UnavailableScreen";
import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Loader2, Calendar, MapPin, ShieldCheck, FileText } from "lucide-react";
import PortalPageSkeleton from "@/components/common/PortalPageSkeleton";
import PortalTimeline from "@/components/portal/PortalTimeline";
import PortalQuotationCard from "@/components/portal/PortalQuotationCard";
import PortalMilestoneCard from "@/components/portal/PortalMilestoneCard";
import PortalIncludesCard from "@/components/portal/PortalIncludesCard";
import PortalTrackCard from "@/components/portal/PortalTrackCard";
import PortalReviewCard from "@/components/portal/PortalReviewCard";
import PortalTeamSection from "@/components/portal/PortalTeamSection";
import PortalServiceSection from "@/components/portal/PortalServiceSection";
import { generateClientQuotationPdf } from "@/lib/quotationClientView";
import { formatDate as formatDateShared, formatDatesList, setDateFormat } from "@/lib/dates";
import { setNumberFormat } from "@/utils/format";
import useSEO from "@/hooks/useSEO";
import { rememberLinkPassword, recallLinkPassword } from "@/lib/portalShare";
import FadeImg from "@/components/common/FadeImg";
import EyeToggle from "@/components/common/EyeToggle";
import AddToCalendar from "@/components/common/AddToCalendar";
import { datesBetween } from "@/lib/calendarLinks";

function formatDate(iso) {
  if (!iso) return "—";
  return formatDateShared(iso);
}

function formatDateRange(start, end) {
  if (!start) return "—";
  if (!end || start === end) return formatDate(start);
  return `${formatDate(start)} – ${formatDate(end)}`;
}

function formatSelectedDates(dates, start, end) {
  if (dates && dates.length > 0) {
    return formatDatesList(dates);
  }
  return formatDateRange(start, end);
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

const contextLabel = contextDisplay;


export default function ClientProjectPortal() {
  const { token } = useParams();
  const navigate = useNavigate();
  const isPreview = new URLSearchParams(window.location.search).has("preview");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [unavailable, setUnavailable] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [needsPassword, setNeedsPassword] = useState(false);
  const [passwordInput, setPasswordInput] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [passwordError, setPasswordError] = useState("");
  const [verifying, setVerifying] = useState(false);

  const loadData = async (pwd) => {
    setLoading(true);
    setError("");
    setUnavailable(false);
    setNeedsPassword(false);
    try {
      const pw = pwd || recallLinkPassword(token);
      const res = await base44.functions.invoke("getPortalData", { public_token: token, skip_tracking: isPreview, password: pw || "" });
      const d = res?.data || res;
      if (d.unavailable) {
        setUnavailable(true);
        setData(null);
      } else if (d.requires_password) {
        setNeedsPassword(true);
        setData(null);
      } else {
        if (pw) rememberLinkPassword(token, pw);
        setData(d);
        setNeedsPassword(false);
      }
    } catch (e) {
      setError(e?.message || "Failed to load this page");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (cancelled) return;
      await loadData("");
    })();
    return () => { cancelled = true; };
  }, [token]);

  useEffect(() => {
    setDateFormat(data?.business_date_format);
    setNumberFormat(data?.business_number_format);
  }, [data]);

  const seoTitle = data?.project?.title
    ? `${data.project.title}${data?.business_name ? ` - ${data.business_name}` : ""}`
    : data?.business_name
    ? `Schedule & Payments - ${data.business_name}`
    : "Schedule & Payments";
  useSEO({ noIndex: true, path: `/portal/${token || ""}`, title: seoTitle });

  const submitPassword = async (e) => {
    e.preventDefault();
    setVerifying(true);
    setPasswordError("");
    try {
      const res = await base44.functions.invoke("getPortalData", { public_token: token, skip_tracking: isPreview, password: passwordInput });
      const d = res?.data || res;
      if (d.requires_password) {
        setPasswordError("Incorrect password. Please try again.");
      } else if (d.unavailable) {
        setUnavailable(true);
        setNeedsPassword(false);
      } else {
        rememberLinkPassword(token, passwordInput);
        setData(d);
        setNeedsPassword(false);
      }
    } catch (e) {
      setPasswordError(e?.message || "Verification failed");
    } finally {
      setVerifying(false);
    }
  };

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
      const d = res?.data || res;
      if (d.requires_auth) {
        navigate(`/q/${data.quotation.public_token}`);
        return;
      }
      await generateClientQuotationPdf(d);
    } catch {
      navigate(`/q/${data.quotation.public_token}`);
    } finally {
      setDownloading(false);
    }
  };

  // ---- Loading ----
  if (loading) {
    return <PortalPageSkeleton />;
  }

  // ---- Password Gate ----
  if (needsPassword) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-muted/30 p-4">
        <div className="max-w-md w-full bg-card border border-border rounded-[15px] p-8 text-center">
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <ShieldCheck className="w-6 h-6 text-primary" />
          </div>
          <h1 className="text-lg font-semibold text-foreground">Password Protected</h1>
          <p className="text-sm text-muted-foreground mt-1 mb-5">
            This page is protected. Please enter the password your service provider shared with you.
          </p>
          <form onSubmit={submitPassword} className="space-y-3 text-left">
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                autoFocus
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                placeholder="Enter password"
                className="w-full bg-card border border-border rounded-lg pl-3 pr-9 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring/40"
              />
              <button type="button" onClick={() => setShowPassword((v) => !v)} aria-label={showPassword ? "Hide password" : "Show password"} className="no-press absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                <EyeToggle shown={showPassword} />
              </button>
            </div>
            {passwordError && (
              <p className="text-xs text-destructive">{passwordError}</p>
            )}
            <button
              type="submit"
              disabled={verifying || !passwordInput}
              className="w-full bg-primary text-primary-foreground rounded-lg py-2.5 text-sm font-medium hover:bg-primary-hover disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {verifying ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
              {verifying ? "Verifying…" : "Unlock Portal"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // ---- Error ----
  if (error) {
    return (
      <UnavailableScreen title="Project unavailable" message={error} />
    );
  }

  // ---- Public link disabled ----
  if (unavailable) {
    return (
      <UnavailableScreen
        title="Project link unavailable"
        message="This project link is currently unavailable. Please contact your service provider for more information."
      />
    );
  }

  if (!data) return null;

  const { project, quotation, timeline, milestones, team, services, currency, total_received, business_name, business_logo, client_name } = data;

  // ---- Project Header ----
  const subType = [categoryLabel(project.category), contextLabel(project.context_type)].filter(Boolean).join(" · ");

  return (
    <div className="min-h-dvh bg-muted/30 pb-12">
      {/* Top bar */}
      <div className="bg-card border-b border-border safe-area-top">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            {business_logo ? (
              <FadeImg src={business_logo} alt="" className="w-7 h-7 rounded object-cover shrink-0" />
            ) : (
              <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center shrink-0">
                <FileText className="w-4 h-4 text-primary-foreground" />
              </div>
            )}
            <div className="min-w-0">
              <div className="text-sm font-semibold text-foreground truncate">{business_name || "Schedule & Payments"}</div>
              {client_name && (
                <div className="text-xs text-muted-foreground truncate">For {client_name}</div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground shrink-0">
            <ShieldCheck className="w-3.5 h-3.5" />
            Secure page
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-6 space-y-5">
        {/* Project Header — clean, minimal, light card */}
        <div className="bg-card border border-border rounded-[15px] p-5 sm:p-6">
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
            {subType || "Project"}
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground break-anywhere">
            {project.title || "Untitled Project"}
          </h1>
          <div className="flex flex-wrap gap-x-5 gap-y-2 mt-3 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <Calendar className="w-4 h-4 shrink-0" />
              {formatSelectedDates(project.event_dates, project.event_date, project.event_end_date)}
            </span>
            {project.venue && (
              <span className="inline-flex items-center gap-1.5">
                <MapPin className="w-4 h-4 shrink-0" />
                {project.venue}
              </span>
            )}
          </div>
          <AddToCalendar
            className="mt-3"
            event={{
              title: project.title || "Event",
              dates: project.event_dates?.length ? project.event_dates : datesBetween(project.event_date, project.event_end_date),
              venue: project.venue,
              dayPlan: project.day_plan,
              description: data?.business_name ? `${project.title || "Event"} with ${data.business_name}` : "",
              // The title typed for each day in the quotation (Haldi, Reception …), when there is one.
              dayTitles: Object.fromEntries([...(team || []), ...(services || []), ...(data.custom_items || [])].filter((i) => i.day_date && i.phase_title && i.phase_title !== "__includes__").map((i) => [i.day_date, i.phase_title]).reverse()),
              uid: project.id || token,
            }}
          />
        </div>

        {/* The client's one review of the business, like a Google review: open once any of their bookings is over, editable.
            Not sent in the owner's preview. */}
        <PortalReviewCard
          review={isPreview ? { open: true, rating: null, review: "", reviewed_at: "", edited: false, nudge: "" } : data.review}
          businessName={business_name}
          preview={isPreview}
          send={(rating, review) => base44.functions.invoke("submitEventReview", { mode: "portal", token, password: recallLinkPassword(token) || "", rating, review })}
        />

        {/* Timeline */}
        <PortalTimeline currentStage={timeline.current_stage} stages={timeline.stages} />

        {/* Progress of what is being made — only when the owner turned Track sharing on */}
        <PortalTrackCard items={data.track_items} labels={data.track_labels} />

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
        <PortalTeamSection team={team} mode={data.quotation_mode} eventDates={project?.event_dates || []} extraDates={(services || []).map((s) => s.day_date).filter(Boolean)} />

        {/* Service Section */}
        <PortalServiceSection services={services} mode={data.quotation_mode} eventDates={project?.event_dates || []} teamDates={(team || []).map((t) => t.day_date).filter(Boolean)} />

        {/* Includes / Deliverables */}
        <PortalIncludesCard includes={data.includes} />

        {/* Custom items added to the quotation */}
        <PortalServiceSection title="Additional Items" services={data.custom_items || []} mode={data.quotation_mode} eventDates={project?.event_dates || []} teamDates={[...(team || []), ...(services || [])].map((t) => t.day_date).filter(Boolean)} />

        {/* Footer */}
        <PublicFooter secure="page" />
      </div>
    </div>
  );
}