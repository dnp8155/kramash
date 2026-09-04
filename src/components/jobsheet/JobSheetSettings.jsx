import Toggle from "@/components/common/Toggle";
import Button from "@/components/common/Button";
import Card from "@/components/common/Card";
import { Save, Users, Phone, Wrench, Package, Clock, MapPin, FileText } from "lucide-react";

export default function JobSheetSettings({ config, onChange, eventDates, onSave, saving }) {
  if (!config) return null;

  const dateConfigs = config.date_configs || {};

  const updateDateConfig = (date, field, value) => {
    const current = dateConfigs[date] || {};
    onChange({
      date_configs: {
        ...dateConfigs,
        [date]: { ...current, [field]: value }
      }
    });
  };

  return (
    <Card className="p-5 space-y-5 no-print">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide">Job Sheet Settings</h3>
        <Button size="sm" onClick={onSave} disabled={saving}>
          <Save className="w-3.5 h-3.5" /> {saving ? "Saving..." : "Save Settings"}
        </Button>
      </div>

      {/* Display Toggles */}
      <div className="space-y-3">
        <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Display Options</div>
        <ToggleRow
          icon={Users}
          label="Show Team Names"
          description="ON: Show assigned member names with roles. OFF: Show roles only (e.g. 1× Lead Photographer)."
          checked={config.show_team_names}
          onChange={v => onChange({ show_team_names: v })}
        />
        <ToggleRow
          icon={Phone}
          label="Include Crew Contact Directory"
          description="ON: Show crew name, role, and phone number. OFF: No phone numbers exposed."
          checked={config.include_crew_contacts}
          onChange={v => onChange({ include_crew_contacts: v })}
        />
        <ToggleRow
          icon={Wrench}
          label="Include Equipment / Kit Checklist"
          description="ON: Show equipment checklist section. OFF: No equipment section."
          checked={config.include_equipment}
          onChange={v => onChange({ include_equipment: v })}
        />
      </div>

      <div className="border-t border-border/60" />

      {/* Deliverables */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <Package className="w-4 h-4 text-muted-foreground" />
          <label className="text-sm font-medium text-foreground">Deliverables Checklist</label>
        </div>
        <p className="text-xs text-muted-foreground mb-2">One item per line. These are operational deliverables, not pricing items.</p>
        <textarea
          className="w-full bg-card border border-border rounded-lg p-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring/40 min-h-[120px] resize-y"
          value={(config.deliverables || []).join("\n")}
          onChange={e => onChange({ deliverables: e.target.value.split("\n").map(s => s.trim()).filter(Boolean) })}
          placeholder="Bride Portraits&#10;Groom Portraits&#10;Ceremony Coverage"
        />
      </div>

      {/* Per-date config */}
      {eventDates.length > 0 && (
        <>
          <div className="border-t border-border/60" />
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Clock className="w-4 h-4 text-muted-foreground" />
              <label className="text-sm font-medium text-foreground">Per-Date Configuration</label>
            </div>
            <div className="space-y-3">
              {eventDates.map(date => {
                const dc = dateConfigs[date] || {};
                return (
                  <div key={date} className="grid grid-cols-1 sm:grid-cols-3 gap-2 p-3 rounded-lg bg-muted/40 border border-border/60">
                    <div className="text-sm font-semibold text-foreground sm:self-center">{formatDay(date)}</div>
                    <input
                      type="text"
                      className="bg-card border border-border rounded-lg px-3 h-9 text-sm focus:outline-none focus:ring-2 focus:ring-ring/40"
                      placeholder="Reporting time (e.g. 8:00 AM)"
                      value={dc.reporting_time || ""}
                      onChange={e => updateDateConfig(date, "reporting_time", e.target.value)}
                    />
                    <input
                      type="text"
                      className="bg-card border border-border rounded-lg px-3 h-9 text-sm focus:outline-none focus:ring-2 focus:ring-ring/40"
                      placeholder="Phase / Function (e.g. Haldi)"
                      value={dc.phase_title || ""}
                      onChange={e => updateDateConfig(date, "phase_title", e.target.value)}
                    />
                    <input
                      type="text"
                      className="bg-card border border-border rounded-lg px-3 h-9 text-sm focus:outline-none focus:ring-2 focus:ring-ring/40 sm:col-span-3"
                      placeholder="Venue override (leave empty to use event venue)"
                      value={dc.venue_override || ""}
                      onChange={e => updateDateConfig(date, "venue_override", e.target.value)}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}

      {/* Equipment editor (only if equipment toggle is on) */}
      {config.include_equipment && (
        <>
          <div className="border-t border-border/60" />
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Wrench className="w-4 h-4 text-muted-foreground" />
              <label className="text-sm font-medium text-foreground">Equipment / Kit Checklist</label>
            </div>
            <p className="text-xs text-muted-foreground mb-2">One item per line.</p>
            <textarea
              className="w-full bg-card border border-border rounded-lg p-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring/40 min-h-[100px] resize-y"
              value={(config.equipment_list || []).join("\n")}
              onChange={e => onChange({ equipment_list: e.target.value.split("\n").map(s => s.trim()).filter(Boolean) })}
              placeholder="Camera Body&#10;Lenses&#10;Tripod"
            />
          </div>
        </>
      )}

      {/* Internal notes */}
      <div className="border-t border-border/60" />
      <div>
        <div className="flex items-center gap-2 mb-2">
          <FileText className="w-4 h-4 text-muted-foreground" />
          <label className="text-sm font-medium text-foreground">Internal Execution Notes</label>
        </div>
        <textarea
          className="w-full bg-card border border-border rounded-lg p-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring/40 min-h-[80px] resize-y"
          value={config.internal_notes || ""}
          onChange={e => onChange({ internal_notes: e.target.value })}
          placeholder="Internal notes for crew and site supervisors..."
        />
      </div>
    </Card>
  );
}

function ToggleRow({ icon: Icon, label, description, checked, onChange }) {
  return (
    <div className="flex items-start justify-between gap-3 py-1">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <Icon className="w-4 h-4 text-muted-foreground shrink-0" />
          <span className="text-sm font-medium text-foreground">{label}</span>
        </div>
        <p className="text-xs text-muted-foreground mt-0.5 ml-6">{description}</p>
      </div>
      <Toggle checked={checked} onChange={onChange} label={label} />
    </div>
  );
}

function formatDay(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr + "T00:00:00");
  return `${d.getDate()} ${d.toLocaleString("en-IN", { month: "short" })}`;
}