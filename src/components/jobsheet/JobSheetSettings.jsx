import Card, { CardHeader, CardTitle, CardBody } from "@/components/common/Card";
import Button from "@/components/common/Button";
import { Users, Phone, Wrench, Plus, Trash2 } from "lucide-react";

function Toggle({ icon: Icon, label, description, checked, onChange }) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-start gap-3">
        <Icon className="mt-0.5 h-5 w-5 text-muted-foreground" />
        <div>
          <p className="text-sm font-medium text-foreground">{label}</p>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
      </div>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
          checked ? "bg-primary" : "bg-muted"
        }`}
      >
        <span
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
            checked ? "translate-x-5" : "translate-x-0.5"
          }`}
        />
      </button>
    </div>
  );
}

export default function JobSheetSettings({ config, onChange, onSave, category }) {
  const update = (field, value) => onChange({ ...config, [field]: value });

  const addEquipmentItem = () => {
    onChange({ ...config, equipment_items: [...config.equipment_items, ""] });
  };

  const updateEquipmentItem = (idx, value) => {
    const items = [...config.equipment_items];
    items[idx] = value;
    onChange({ ...config, equipment_items: items });
  };

  const removeEquipmentItem = (idx) => {
    onChange({
      ...config,
      equipment_items: config.equipment_items.filter((_, i) => i !== idx),
    });
  };

  return (
    <Card className="no-print mb-6">
      <CardHeader>
        <CardTitle>Job Sheet Settings</CardTitle>
      </CardHeader>
      <CardBody className="space-y-5">
        <Toggle
          icon={Users}
          label="Show Team Names"
          description="Show assigned member names alongside roles. OFF = roles only with counts."
          checked={config.show_team_names}
          onChange={(v) => update("show_team_names", v)}
        />
        <Toggle
          icon={Phone}
          label="Include Crew Contact Directory"
          description="Show crew phone numbers in a contact directory section."
          checked={config.include_contacts}
          onChange={(v) => update("include_contacts", v)}
        />
        <Toggle
          icon={Wrench}
          label="Include Equipment Checklist"
          description="Show equipment / kit checklist section."
          checked={config.include_equipment}
          onChange={(v) => update("include_equipment", v)}
        />

        <div>
          <label className="text-sm font-medium text-foreground">Default Reporting Time</label>
          <input
            type="text"
            value={config.default_reporting_time}
            onChange={(e) => update("default_reporting_time", e.target.value)}
            placeholder="e.g. 8:00 AM"
            className="mt-1 h-10 w-full rounded-lg border border-input bg-card px-3 text-sm"
          />
        </div>

        <div>
          <label className="text-sm font-medium text-foreground">Job Sheet Internal Notes</label>
          <textarea
            value={config.internal_notes}
            onChange={(e) => update("internal_notes", e.target.value)}
            placeholder="Operational execution notes for crew…"
            rows={3}
            className="mt-1 w-full rounded-lg border border-input bg-card px-3 py-2 text-sm"
          />
        </div>

        {config.include_equipment && (
          <div>
            <label className="text-sm font-medium text-foreground">Equipment Checklist Items</label>
            <p className="text-xs text-muted-foreground">
              Leave empty to use {category?.replace(/_/g, " ").toLowerCase() || "category"} defaults.
            </p>
            <div className="mt-2 space-y-2">
              {config.equipment_items.map((item, idx) => (
                <div key={idx} className="flex gap-2">
                  <input
                    type="text"
                    value={item}
                    onChange={(e) => updateEquipmentItem(idx, e.target.value)}
                    className="h-10 flex-1 rounded-lg border border-input bg-card px-3 text-sm"
                  />
                  <Button variant="outline" size="icon" onClick={() => removeEquipmentItem(idx)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              <Button variant="outline" size="sm" onClick={addEquipmentItem}>
                <Plus className="h-4 w-4" /> Add Item
              </Button>
            </div>
          </div>
        )}

        <Button onClick={() => onSave(config)}>Save Settings</Button>
      </CardBody>
    </Card>
  );
}