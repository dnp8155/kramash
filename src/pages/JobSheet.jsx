import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { ArrowLeft, Printer, Settings, MapPin, Download, Share2, Loader2 } from "lucide-react";
import Button from "@/components/common/Button";
import LoadingState from "@/components/common/LoadingState";
import Card, { CardHeader, CardTitle, CardBody } from "@/components/common/Card";
import JobSheetSettings from "@/components/jobsheet/JobSheetSettings";
import JobSheetShare from "@/components/jobsheet/JobSheetShare";
import { generateJobSheetPDF } from "@/utils/jobSheetPdf";
import JobSheetItinerary from "@/components/jobsheet/JobSheetItinerary";
import JobSheetDeliverables from "@/components/jobsheet/JobSheetDeliverables";
import JobSheetContacts from "@/components/jobsheet/JobSheetContacts";
import JobSheetEquipment from "@/components/jobsheet/JobSheetEquipment";
import { getDefaultEquipment } from "@/constants/equipment";
import { formatDate } from "@/utils/format";
import { toast } from "@/components/ui/use-toast";

const DEFAULT_CONFIG = {
  show_team_names: true,
  include_contacts: false,
  include_equipment: true,
  equipment_items: [],
  default_reporting_time: "",
  date_overrides: [],
  internal_notes: "",
};

export default function JobSheet() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [config, setConfig] = useState(DEFAULT_CONFIG);

  useEffect(() => {
    if (!id) return;
    (async () => {
      setLoading(true);
      try {
        const res = await base44.functions.invoke("getJobSheetData", { event_id: id });
        setData(res.data);

        // Load event for job_sheet_config
        const evt = await base44.entities.Event.get(id);
        if (evt?.job_sheet_config) {
          const c = evt.job_sheet_config;
          setConfig({
            show_team_names: c.show_team_names !== false,
            include_contacts: c.include_contacts === true,
            include_equipment: c.include_equipment !== false,
            equipment_items: c.equipment_items || [],
            default_reporting_time: c.default_reporting_time || "",
            date_overrides: c.date_overrides || [],
            internal_notes: c.internal_notes || "",
          });
        }
      } catch (err) {
        toast({
          title: "Failed to load job sheet",
          description: err?.response?.data?.error || err?.message,
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  const handleSaveConfig = async (newConfig) => {
    try {
      await base44.entities.Event.update(id, { job_sheet_config: newConfig });
      setConfig(newConfig);
      toast({ title: "Job sheet settings saved" });
    } catch (e) {
      toast({ title: "Save failed", description: e?.message, variant: "destructive" });
    }
  };

  const handlePrint = () => window.print();

  const handleDownloadPDF = async () => {
    setPdfLoading(true);
    try {
      await generateJobSheetPDF({ data, config });
    } catch (e) {
      toast({ title: "PDF failed", description: e?.message, variant: "destructive" });
    } finally {
      setPdfLoading(false);
    }
  };

  if (loading) return <LoadingState label="Generating job sheet…" />;
  if (!data) return <p className="py-10 text-center text-muted-foreground">Unable to load job sheet.</p>;

  const { event: eventData, client, category, itinerary, deliverables, crew_directory, map_url } = data;

  // Equipment items: use config or category defaults
  const equipmentItems =
    config.equipment_items.length > 0
      ? config.equipment_items.filter(Boolean)
      : getDefaultEquipment(category);

  const internalNotes = config.internal_notes || eventData.notes || "";

  return (
    <div className="mx-auto max-w-4xl">
      {/* Action bar — screen only */}
      <div className="no-print mb-4 flex items-center justify-between">
        <Link to={`/events/${id}`}>
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4" /> Back to Event
          </Button>
        </Link>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowSettings(!showSettings)}>
            <Settings className="h-4 w-4" /> Settings
          </Button>
          <Button variant="outline" size="sm" onClick={() => setShowShare(!showShare)}>
            <Share2 className="h-4 w-4" /> Share
          </Button>
          <Button variant="outline" size="sm" onClick={handleDownloadPDF} disabled={pdfLoading}>
            {pdfLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />} PDF
          </Button>
          <Button size="sm" onClick={handlePrint}>
            <Printer className="h-4 w-4" /> Print
          </Button>
        </div>
      </div>

      {showSettings && (
        <JobSheetSettings
          config={config}
          onChange={setConfig}
          onSave={handleSaveConfig}
          category={category}
        />
      )}

      {showShare && <JobSheetShare eventId={id} />}

      {/* Job Sheet document */}
      <div className="space-y-6">
        {/* Header */}
        <Card>
          <CardBody className="space-y-3">
            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-2xl font-bold text-foreground">{eventData.title}</h1>
                <p className="text-sm text-muted-foreground">
                  {eventData.event_type}
                  {category && ` · ${category.replace(/_/g, " ").toLowerCase()}`}
                </p>
              </div>
              <div className="text-right text-sm text-muted-foreground">
                <p>{formatDate(eventData.start_date)}</p>
                {eventData.end_date && eventData.end_date !== eventData.start_date && (
                  <p>to {formatDate(eventData.end_date)}</p>
                )}
              </div>
            </div>

            {client && (
              <div className="border-t border-border pt-3">
                <p className="text-xs font-medium text-muted-foreground">Client</p>
                <p className="text-sm font-medium text-foreground">{client.name}</p>
                {client.phone && <p className="text-sm text-muted-foreground">{client.phone}</p>}
              </div>
            )}

            {(eventData.venue || eventData.venue_address) && (
              <div className="border-t border-border pt-3">
                <p className="text-xs font-medium text-muted-foreground">Venue</p>
                <p className="text-sm font-medium text-foreground">{eventData.venue || "—"}</p>
                {eventData.venue_address && (
                  <p className="text-sm text-muted-foreground">{eventData.venue_address}</p>
                )}
                {map_url && (
                  <a
                    href={map_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="no-print mt-1 inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
                  >
                    <MapPin className="h-3.5 w-3.5" /> Get Directions
                  </a>
                )}
              </div>
            )}
          </CardBody>
        </Card>

        {/* Date-wise Itinerary */}
        <JobSheetItinerary itinerary={itinerary} config={config} />

        {/* Deliverable Checklist */}
        {deliverables.length > 0 && <JobSheetDeliverables deliverables={deliverables} />}

        {/* Internal Notes */}
        {internalNotes && (
          <Card>
            <CardHeader>
              <CardTitle>Internal Notes</CardTitle>
            </CardHeader>
            <CardBody>
              <p className="whitespace-pre-wrap text-sm text-foreground">{internalNotes}</p>
            </CardBody>
          </Card>
        )}

        {/* Crew Contact Directory */}
        {config.include_contacts && crew_directory.length > 0 && (
          <JobSheetContacts crew={crew_directory} />
        )}

        {/* Equipment Checklist */}
        {config.include_equipment && equipmentItems.length > 0 && (
          <JobSheetEquipment items={equipmentItems} />
        )}

        {/* Read-only footer */}
        <p className="no-print pt-2 text-center text-xs text-muted-foreground">
          This job sheet is read-only. Crew cannot edit event, team, services, client, or financial data.
        </p>
      </div>
    </div>
  );
}