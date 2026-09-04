import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useWorkspace } from "@/lib/WorkspaceContext";
import { assembleJobSheetData, getOrCreateJobSheet, updateJobSheetConfig, parseJSON } from "@/lib/jobSheetService";
import JobSheetSettings from "@/components/jobsheet/JobSheetSettings";
import JobSheetDocument from "@/components/jobsheet/JobSheetDocument";
import Button from "@/components/common/Button";
import DetailSkeleton from "@/components/common/DetailSkeleton";
import DetailErrorState from "@/components/common/DetailErrorState";
import { useToast } from "@/components/ui/use-toast";
import { ArrowLeft, Settings, Printer, ClipboardList } from "lucide-react";

export default function JobSheet() {
  const { id } = useParams();
  const { workspaceId, workspace } = useWorkspace();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [showSettings, setShowSettings] = useState(false);
  const [saving, setSaving] = useState(false);
  const [config, setConfig] = useState(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ["jobSheet", id, workspaceId],
    queryFn: async () => {
      const assembled = await assembleJobSheetData(workspaceId, id);
      if (assembled.notFound) return { notFound: true };
      const category = workspace?.business_category || "OTHER";
      const rawConfig = await getOrCreateJobSheet(workspaceId, id, category, assembled.quotation?.id, assembled.event?.notes);
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
    }
  }, [data?.config?.id]);

  const handleChange = (patch) => {
    setConfig(prev => prev ? { ...prev, ...patch } : prev);
  };

  const handleSave = async () => {
    if (!config) return;
    setSaving(true);
    try {
      await updateJobSheetConfig(config.id, config);
      toast({ title: "Job sheet settings saved" });
    } catch (e) {
      toast({ title: "Failed to save", description: e?.message, variant: "destructive" });
    }
    setSaving(false);
  };

  const handlePrint = () => {
    document.body.classList.add("printing-jobsheet");
    window.print();
    const cleanup = () => {
      document.body.classList.remove("printing-jobsheet");
      window.removeEventListener("afterprint", cleanup);
    };
    window.addEventListener("afterprint", cleanup);
    setTimeout(cleanup, 5000);
  };

  if (isLoading) return <DetailSkeleton />;

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
    <div className="p-4 sm:p-6 space-y-5 max-w-[900px] mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap no-print">
        <div className="flex items-center gap-2.5 min-w-0">
          <button
            onClick={() => navigate(`/events/${id}`)}
            className="text-muted-foreground hover:text-foreground transition-colors shrink-0"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="flex items-center gap-2">
            <ClipboardList className="w-5 h-5 text-primary shrink-0" />
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
          <Button size="sm" variant="outline" onClick={handlePrint}>
            <Printer className="w-3.5 h-3.5" /> Print
          </Button>
        </div>
      </div>

      {/* Settings Panel */}
      {showSettings && config && (
        <JobSheetSettings
          config={config}
          onChange={handleChange}
          eventDates={data.eventDates}
          onSave={handleSave}
          saving={saving}
        />
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
  );
}