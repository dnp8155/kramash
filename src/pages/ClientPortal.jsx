import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Loader2, Lock } from "lucide-react";
import ProjectHeader from "@/components/portal/ProjectHeader";
import ProjectTimeline from "@/components/portal/ProjectTimeline";
import QuotationStatusCard from "@/components/portal/QuotationStatusCard";
import PaymentMilestoneCard from "@/components/portal/PaymentMilestoneCard";
import PortalTeamSection from "@/components/portal/PortalTeamSection";
import PortalServiceSection from "@/components/portal/PortalServiceSection";
import { generateQuotationPDF } from "@/utils/quotationPdf";
import { Image } from "@/components/ui/image";

async function fetchPortalData(token, preview = false) {
  try {
    const res = await base44.functions.invoke("getPortalData", { token, preview });
    return { ok: res.status >= 200 && res.status < 300, status: res.status, data: res.data };
  } catch (err) {
    const status = err?.response?.status || 0;
    const data = err?.response?.data || {};
    return { ok: false, status, data };
  }
}

export default function ClientPortal() {
  const { token } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [disabled, setDisabled] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [data, setData] = useState(null);
  const [pdfLoading, setPdfLoading] = useState(false);

  useEffect(() => {
    if (!token) return;
    const isPreview = new URLSearchParams(window.location.search).get("preview") === "1";
    (async () => {
      setLoading(true);
      const res = await fetchPortalData(token, isPreview);
      if (res.ok) {
        setData(res.data);
      } else if (res.status === 403) {
        setDisabled(true);
      } else {
        setNotFound(true);
      }
      setLoading(false);
    })();
  }, [token]);

  if (loading) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-muted/20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (disabled || notFound) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-muted/20 p-4">
        <div className="max-w-md text-center">
          <Lock className="mx-auto h-12 w-12 text-muted-foreground" />
          <p className="mt-4 text-lg font-semibold text-foreground">
            This project link is currently unavailable.
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            Please contact your service provider for more information.
          </p>
        </div>
      </div>
    );
  }

  const {
    quotation, items, workspace, event, client,
    team_assignments, service_assignments, payment_summary, is_expired,
  } = data;

  // Compute timeline stages from actual data
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const eventStartDate = (quotation.project_start_date || event?.start_date)
    ? new Date(quotation.project_start_date || event.start_date) : null;
  const eventEndDate = (quotation.project_end_date || event?.end_date)
    ? new Date(quotation.project_end_date || event.end_date) : null;

  const stages = [
    { key: "booking", label: "Booking Confirmed", completed: quotation.status === "Accepted" },
    {
      key: "planning", label: "Planning",
      completed: quotation.status === "Accepted" && (!eventStartDate || eventStartDate > today),
    },
    { key: "event_day", label: "Event Day", completed: !!eventStartDate && eventStartDate <= today },
    {
      key: "delivery", label: "Delivery",
      completed: event?.status === "Completed" || (!!eventEndDate && eventEndDate < today),
    },
  ];

  const handleReviewSign = () => navigate(`/portal/${token}/sign`);
  const handleViewQuotation = () => navigate(`/portal/${token}/sign`);

  const handleDownloadPDF = async () => {
    setPdfLoading(true);
    try {
      await generateQuotationPDF({
        quotation,
        items,
        workspace,
        client,
        event,
        terminology: { workItemSingular: "Project", workItemPlural: "Projects" },
      });
    } catch {
      // Silent fail on public portal
    } finally {
      setPdfLoading(false);
    }
  };

  return (
    <div className="min-h-[100dvh] bg-muted/20 pb-safe-bottom">
      {workspace && (
        <div className="border-b border-border bg-card pt-safe">
          <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-4">
            {workspace.logo && (
              <Image src={workspace.logo} alt="" className="h-8 w-8 rounded-lg object-cover" fittingType="fill" />
            )}
            <span className="text-sm font-semibold text-foreground">{workspace.name}</span>
          </div>
        </div>
      )}

      <div className="mx-auto max-w-3xl space-y-6 px-4 py-6 sm:py-8">
        <ProjectHeader quotation={quotation} event={event} client={client} />

        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8">
          <ProjectTimeline stages={stages} />
        </div>

        <QuotationStatusCard
          quotation={quotation}
          isExpired={is_expired}
          onReviewSign={handleReviewSign}
          onViewQuotation={handleViewQuotation}
          onDownloadPDF={handleDownloadPDF}
          pdfLoading={pdfLoading}
        />

        <PaymentMilestoneCard paymentSummary={payment_summary} />

        <PortalTeamSection
          teamAssignments={team_assignments}
          quotationItems={items}
          hideTeamNames={quotation.hide_team_names}
        />

        <PortalServiceSection
          serviceAssignments={service_assignments}
          quotationItems={items}
        />

        {workspace && (
          <div className="border-t border-border pt-6 text-center">
            <p className="text-xs text-muted-foreground">
              {workspace.name}
              {workspace.email && ` · ${workspace.email}`}
              {workspace.phone && ` · ${workspace.phone}`}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}