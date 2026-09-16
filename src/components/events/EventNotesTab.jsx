import { useState } from "react";
import { StickyNote, Pencil, Plus, Save, X, FileText } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { invalidateEntity } from "@/lib/queryInvalidation";
import Card from "@/components/common/Card";
import Button from "@/components/common/Button";
import EmptyState from "@/components/common/EmptyState";
import WordCounterTextarea from "@/components/common/WordCounterTextarea";
import { countWords, WORD_LIMIT } from "@/lib/wordLimit";
import { cn } from "@/lib/utils";

export default function EventNotesTab({ event, term }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [description, setDescription] = useState(event?.description || "");
  const [notes, setNotes] = useState(event?.notes || "");
  const [saving, setSaving] = useState(false);

  const hasContent = event?.notes || event?.description;

  const startEdit = () => {
    setDescription(event?.description || "");
    setNotes(event?.notes || "");
    setEditing(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await base44.entities.Event.update(event.id, { description, notes });
      invalidateEntity(queryClient, "Event");
      setEditing(false);
      toast({ title: "Notes saved" });
    } catch (e) {
      toast({ title: "Failed to save notes", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="p-5">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <StickyNote className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-semibold text-foreground">Notes</span>
        </div>
        {!editing && (
          <Button size="sm" variant={hasContent ? "outline" : "primary"} onClick={startEdit}>
            {hasContent ? <><Pencil className="w-3.5 h-3.5" /> Edit</> : <><Plus className="w-3.5 h-3.5" /> Add Notes</>}
          </Button>
        )}
      </div>

      {editing ? (
        <div className="space-y-4">
          <div>
            <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground mb-1.5">
              <FileText className="w-3.5 h-3.5" /> Description
            </div>
            <WordCounterTextarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add a description..."
              rows={4}
            />
          </div>
          <div>
            <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground mb-1.5">
              <StickyNote className="w-3.5 h-3.5" /> Notes
            </div>
            <WordCounterTextarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add internal notes..."
              rows={4}
            />
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" onClick={handleSave} disabled={saving}>
              <Save className="w-3.5 h-3.5" /> {saving ? "Saving..." : "Save"}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setEditing(false)} disabled={saving}>
              <X className="w-3.5 h-3.5" /> Cancel
            </Button>
          </div>
        </div>
      ) : hasContent ? (
        <div className="space-y-3">
          {event.description && (
            <div>
              <div className="flex items-center justify-between mb-1">
                <div className="text-xs font-medium text-muted-foreground">Description</div>
                <WordCountBadge text={event.description} />
              </div>
              <p className="text-sm text-foreground whitespace-pre-wrap">{event.description}</p>
            </div>
          )}
          {event.notes && (
            <div>
              <div className="flex items-center justify-between mb-1">
                <div className="text-xs font-medium text-muted-foreground">Notes</div>
                <WordCountBadge text={event.notes} />
              </div>
              <p className="text-sm text-foreground whitespace-pre-wrap">{event.notes}</p>
            </div>
          )}
        </div>
      ) : (
        <EmptyState title="No notes" description={`Add notes or a description for this ${term?.workItemSingular?.toLowerCase() || "entry"}.`} />
      )}
    </Card>
  );
}

function WordCountBadge({ text }) {
  const count = countWords(text);
  const isOver = count > WORD_LIMIT;
  const isNear = count >= 130 && !isOver;
  return (
    <span className={cn(
      "text-[11px] tabular-nums px-1.5 py-0.5 rounded-full",
      isOver ? "bg-destructive/10 text-destructive font-medium" : isNear ? "bg-warning/10 text-warning" : "bg-muted text-muted-foreground"
    )}>
      {count} / {WORD_LIMIT} words
    </span>
  );
}