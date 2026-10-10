import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useWorkspace } from "@/lib/WorkspaceContext";
import { resolveBusinessCategory, categoryLabel } from "@/lib/businessTerminology";
import { assembleJobSheetData, getOrCreateJobSheet, updateJobSheetConfig, parseJSON, generatePublicToken, togglePublicLink, getDefaultEquipment, getDefaultDeliverables } from "@/lib/jobSheetService";
import { generateJobSheetPdf } from "@/lib/jobSheetPdf";
import JobSheetSettings from "@/components/jobsheet/JobSheetSettings";
import JobSheetDocument from "@/components/jobsheet/JobSheetDocument";
import Button from "@/components/common/Button";
import JobSheetSkeleton from "@/components/events/JobSheetSkeleton";
import DetailErrorState from "@/components/common/DetailErrorState";
import { useToast } from "@/components/ui/use-toast";
import { printElementOnly } from "@/lib/printUtils";
import { useFeatureGate } from "@/components/common/ProGate";
import { ArrowLeft, Settings, Printer, ClipboardList, FileDown, Share2, Save } from "lucide-react";
import { cn } from "@/lib/utils";
import ActionDock from "@/components/common/ActionDock";
import BackConfirmDialog from "@/components/common/BackConfirmDialog";
import { useBackGuard } from "@/hooks/useBackGuard";

// What counts as an unsaved edit: everything in the settings except the public-link fields, which
// are saved the moment they are toggled (see handleShare / handleTogglePublicLink).
const configSignature = (c) => {
  if (!c) return null;
  const rest = { ...c };
  delete rest.public_link_enabled;
  delete rest.show_job_sheet;
  delete rest.public_token;
  return JSON.stringify(rest);
};

export default function JobSheet() {
  const { id } = useParams();
  const { workspaceId, workspace } = useWorkspace();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { checkFeature, FeatureGateDialog } = useFeatureGate();
  const [showSettings, setShowSettings] = useState(false);
  const [saving, setSaving] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [config, setConfig] = useState(null);
  const headerRef = useRef(null);          // the floating bar merges back into this when it scrolls into view
  const savedSignature = useRef(null);     // the settings as last loaded / saved

  // Resolves both the new business_category enum and legacy free-text
  // business_type (same fallback the rest of the app uses via
  // useBusinessTerminology), so equipment/deliverables defaults are correct
  // even for workspaces that haven't been migrated to the new field yet.
  const businessCategory = resolveBusinessCategory(workspace);

  const { data, isLoading, error } = useQuery({
    queryKey: ["jobSheet", id, workspaceId],
    queryFn: async () => {
      const assembled = await assembleJobSheetData(workspaceId, id);
      if (assembled.notFound) return { notFound: true };
      const rawConfig = await getOrCreateJobSheet(workspaceId, id, businessCategory, assembled.quotation?.id, assembled.event?.notes);
      const config = {
        ...rawConfig,
        equipment_list: parseJSON(rawConfig.equipment_list, []),
        deliverables: parseJSON(rawConfig.deliverables, []),
        date_configs: parseJSON(rawConfig.date_configs, {})
      };
      return { ...assembled, config };
    },
    enabled: !!id && !!workspaceId
  });

  // Sync config from query data on initial load
  useEffect(() => {
    if (data?.config && (!config || config.id !== data.config.id)) {
      setConfig(data.config);
      savedSignature.current = configSignature(data.config);
    }
  }, [data?.config?.id]);

  const handleChange = (patch) => {
    setConfig(prev => prev ? { ...prev, ...patch } : prev);
  };

  // Re-populates equipment/deliverables from the workspace's current business
  // type — for job sheets created before the business type was set correctly,
  // or before this workspace switched categories in Preferences.
  const handleResetToBusinessDefaults = () => {
    handleChange({
      equipment_list: getDefaultEquipment(businessCategory),
      deliverables: getDefaultDeliverables(businessCategory)
    });
    toast({ title: "Reset to defaults", description: "Review and click Save Settings to apply." });
  };

  const handleSave = async () => {
    if (!config) return;
    setSaving(true);
    try {
      await updateJobSheetConfig(config.id, config);
      savedSignature.current = configSignature(config);
      toast({ title: "Job sheet settings saved" });
    } catch (e) {
      toast({ title: "Failed to save", description: e?.message, variant: "destructive" });
    }
    setSaving(false);
  };

  const handleDownloadPdf = async () => {
    if (!config || !data) return;
    const eventData = {
      event: data.event,
      client: data.client,
      quotationItems: data.quotationItems,
      teamAssignments: data.teamAssignments,
      dayAssignments: data.dayAssignments,
      membersById: data.membersById,
      eventDates: data.eventDates
    };
    setDownloading(true);
    try {
      await generateJobSheetPdf({ data: eventData, config, workspace });
    } catch (e) {
      toast({ title: "Failed to generate PDF", description: e?.message, variant: "destructive" });
    }
    setDownloading(false);
  };

  const handleShare = async () => {
    if (!config) return;
    try {
      let token = config.public_token;
      if (!config.public_link_enabled) {
        if (!checkFeature("link_sharing_enabled", "Link Sharing")) return;
        token = token || generatePublicToken();
        await togglePublicLink(config.id, true, token);
        setConfig(prev => prev ? { ...prev, public_link_enabled: true, show_job_sheet: true, public_token: token } : prev);
      }
      const url = `${window.location.origin}/job-sheet/${token}`;
      if (navigator.share) {
        await navigator.share({ title: "Job Sheet", url });
      } else {
        await navigator.clipboard.writeText(url);
        toast({ title: "Link copied!", description: "Share it with your team." });
      }
    } catch (e) {
      toast({ title: "Failed to share", variant: "destructive" });
    }
  };

  // Persists the merged "Show Job Sheet" / public-link toggle immediately
  // (same as the header Share button) instead of waiting for "Save Settings"
  // — otherwise the link shown/copied in Settings can point to a token that
  // was never saved, and anyone opening it gets "Job sheet not found".
  const handleTogglePublicLink = async (enabled) => {
    if (!config) return;
    if (enabled && !checkFeature("link_sharing_enabled", "Link Sharing")) return;
    const token = enabled ? (config.public_token || generatePublicToken()) : config.public_token;
    try {
      await togglePublicLink(config.id, enabled, token);
      setConfig(prev => prev ? { ...prev, public_link_enabled: enabled, show_job_sheet: enabled, public_token: token || prev.public_token } : prev);
    } catch (e) {
      toast({ title: "Failed to update link", description: e?.message, variant: "destructive" });
    }
  };

  // Prints the job sheet itself — not the app around it (sidebar, header, settings).
  const handlePrint = () => {
    printElementOnly(document.querySelector(".print-area"), "printing-jobsheet");
  };

  const hasUnsavedChanges = !!config && savedSignature.current !== null && configSignature(config) !== savedSignature.current;

  // "Leave this page?" guard: browser/phone Back, the top-bar back arrow, reload/close and this page's own back button.
  const { showConfirm, confirmBack, stayHere, requestBack } = useBackGuard(hasUnsavedChanges);
  const handleBack = () => (hasUnsavedChanges ? requestBack() : navigate(`/events/${id}`));

  if (isLoading) return <JobSheetSkeleton />;

  if (error) {
    return (
      <DetailErrorState
        title="Failed to load"
        description={error?.message || "Something went wrong."}
        onBack={() => navigate("/events")}
        onRetry={() => window.location.reload()}
        backLabel="Back to Events"
      />
    );
  }

  if (data?.notFound || !data?.event) {
    return (
      <DetailErrorState
        title="Event not found"
        description="This event may not exist or you don't have access to it."
        onBack={() => navigate("/events")}
        backLabel="Back to Events"
      />
    );
  }

  const eventData = {
    event: data.event,
    client: data.client,
    quotationItems: data.quotationItems,
    teamAssignments: data.teamAssignments,
    dayAssignments: data.dayAssignments,
    membersById: data.membersById,
    eventDates: data.eventDates
  };

  return (
    <div className="p-4 sm:p-6 space-y-5">
      {/* Header */}
      <div ref={headerRef} className="flex items-center justify-between gap-3 flex-wrap no-print">
        <div className="flex items-center gap-2.5 min-w-0">
          <button
            onClick={handleBack}
            className="hidden lg:flex w-8 h-8 rounded-full border border-border bg-card items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground transition-colors shrink-0"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="flex items-center gap-2">
            <ClipboardList className="w-5 h-5 text-muted-foreground shrink-0" />
            <h1 className="text-xl font-bold text-foreground tracking-tight">Job Sheet</h1>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant={showSettings ? "primary" : "outline"}
            onClick={() => setShowSettings(s => !s)}
          >
            <Settings className="w-3.5 h-3.5" /> {showSettings ? "Hide Settings" : "Settings"}
          </Button>
          <Button size="sm" variant="outline" onClick={handleDownloadPdf} disabled={downloading}>
            <FileDown className="w-3.5 h-3.5" /> {downloading ? "Generating..." : "PDF"}
          </Button>
          <Button size="sm" variant="outline" onClick={handleShare}>
            <Share2 className="w-3.5 h-3.5" /> Share
          </Button>
          <Button size="sm" variant="outline" onClick={handlePrint}>
            <Printer className="w-3.5 h-3.5" /> Print
          </Button>
        </div>
      </div>

      <div className={cn("grid grid-cols-1 gap-5 items-start", showSettings && "lg:grid-cols-[1fr_420px]")}>
        {/* Settings Panel — side-by-side with the preview on wider screens
            (right-hand column there) so changes are visible immediately;
            stacked above the preview on mobile, in natural reading order. */}
        {showSettings && config && (
          <div className="lg:order-2 lg:sticky lg:top-4">
            <JobSheetSettings
              config={config}
              onChange={handleChange}
              eventDates={data.eventDates}
              onSave={handleSave}
              saving={saving}
              hasUnsavedChanges={hasUnsavedChanges}
              onTogglePublicLink={handleTogglePublicLink}
              businessCategoryLabel={categoryLabel(businessCategory)}
              onResetToBusinessDefaults={handleResetToBusinessDefaults}
            />
          </div>
        )}

        {/* Job Sheet Document */}
        {config && (
          <JobSheetDocument
            data={eventData}
            config={config}
            workspace={workspace}
          />
        )}
      </div>
      {/* Floating bar: appears once the header buttons scroll away, and glides back up into them. */}
      <ActionDock
        mode="top"
        targetRef={headerRef}
        unsavedLabel="Unsaved changes"
        items={[
          { icon: FileDown, label: downloading ? "…" : "PDF", onClick: handleDownloadPdf, disabled: downloading },
          { icon: Share2, label: "Share", onClick: handleShare },
          { icon: Printer, label: "Print", onClick: handlePrint },
        ]}
        primary={
          showSettings || hasUnsavedChanges
            ? { icon: Save, label: saving ? "Saving…" : "Save", onClick: handleSave, disabled: saving || !hasUnsavedChanges, active: hasUnsavedChanges, dirty: hasUnsavedChanges }
            : { icon: Settings, label: "Settings", onClick: () => setShowSettings(true), active: true }
        }
      />
      <BackConfirmDialog open={showConfirm} onStay={stayHere} onLeave={confirmBack} />
      {FeatureGateDialog}
    </div>
  );
}