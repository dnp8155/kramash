import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import Modal from "@/components/common/Modal";
import Button from "@/components/common/Button";
import Input from "@/components/common/Input";
import Select from "@/components/common/Select";
import { toast } from "@/components/ui/use-toast";
import { todayStr } from "@/utils/team";

const blockReasons = ["Leave", "Personal", "Unavailable", "Holiday", "Other"];

const empty = {
  start_date: todayStr(),
  end_date: "",
  reason: "Leave",
};

export default function BlockDateForm({
  open,
  onClose,
  member,
  blockDate,
  onSave,
}) {
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setForm(
      blockDate
        ? {
            start_date: blockDate.start_date || todayStr(),
            end_date: blockDate.end_date || "",
            reason: blockDate.reason || "Leave",
          }
        : empty
    );
  }, [open, blockDate?.id]);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const handleSave = async () => {
    if (!form.start_date) {
      toast({ title: "Start date is required", variant: "destructive" });
      return;
    }
    const endDate = form.end_date || form.start_date;
    if (endDate < form.start_date) {
      toast({
        title: "Invalid date range",
        description: "End date cannot be before start date.",
        variant: "destructive",
      });
      return;
    }
    setSaving(true);
    try {
      await onSave({
        start_date: form.start_date,
        end_date: endDate,
        reason: form.reason,
      });
      onClose();
    } catch (e) {
      toast({
        title: "Could not save block date",
        description: e?.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={blockDate ? "Edit Block Date" : "Block Dates"}
      size="md"
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            {blockDate ? "Save Changes" : "Block Dates"}
          </Button>
        </>
      }
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <p className="text-sm text-muted-foreground sm:col-span-2">
          Block {member?.name || "this member"} for a date range. During active
          blocks, the member is shown as unavailable and cannot be assigned to
          overlapping events.
        </p>
        <Input
          label="Start Date"
          type="date"
          value={form.start_date}
          onChange={(e) => set("start_date", e.target.value)}
        />
        <Input
          label="End Date (optional)"
          type="date"
          value={form.end_date}
          onChange={(e) => set("end_date", e.target.value)}
          placeholder="Defaults to start date"
        />
        <Select
          label="Reason"
          value={form.reason}
          onChange={(e) => set("reason", e.target.value)}
          className="sm:col-span-2"
        >
          {blockReasons.map((r) => (
            <option key={r} value={r}>{r}</option>
          ))}
        </Select>
        <p className="text-xs text-muted-foreground sm:col-span-2">
          Leave end date empty for a single-day block.
        </p>
      </div>
    </Modal>
  );
}