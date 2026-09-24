import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useWorkspace } from "@/lib/WorkspaceContext";
import Button from "@/components/common/Button";
import { Camera, PartyPopper, Building2, Sofa, Scissors, Briefcase, Megaphone, UtensilsCrossed, HardHat, Compass, Loader2, ChevronRight, AlertTriangle } from "lucide-react";
import { BUSINESS_CATEGORY_OPTIONS, categoryLabel } from "@/lib/businessTerminology";
import { BUSINESS_TYPE_ICONS, getProfile } from "@/lib/businessTypeProfiles";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "@/components/ui/use-toast";
import { useSubmitGuard } from "@/hooks/useSubmitGuard";

const ICON_COMPONENTS = {
  Camera, PartyPopper, Building2, Sofa, Scissors, Briefcase, Megaphone, UtensilsCrossed, HardHat, Compass,
};

export default function BusinessTypeSelector() {
  const { workspace, setWorkspace } = useWorkspace();
  const [pickerOpen, setPickerOpen] = useState(false);
  const [confirmCategory, setConfirmCategory] = useState(null);
  const { saving, start, stop } = useSubmitGuard();

  if (!workspace) return null;

  const currentCategory = workspace.business_category || "OTHER";
  const currentProfile = getProfile(currentCategory);
  const CurrentIcon = ICON_COMPONENTS[BUSINESS_TYPE_ICONS[currentCategory]] || Compass;

  const handleSelect = (category) => {
    if (category === currentCategory) { setPickerOpen(false); return; }
    setConfirmCategory(category);
    setPickerOpen(false);
  };

  const confirmChange = async () => {
    if (!confirmCategory || !start()) return;
    const newProfile = getProfile(confirmCategory);
    try {
      const updated = await base44.entities.Workspace.update(workspace.id, {
        business_category: confirmCategory,
        business_type: categoryLabel(confirmCategory),
        event_types: JSON.stringify(newProfile.eventTypes),
        team_member_types: JSON.stringify(newProfile.memberTypes),
      });

      try {
        await base44.entities.TeamRole.deleteMany({ workspace_id: workspace.id });
        if (newProfile.roles.length > 0) {
          await base44.entities.TeamRole.bulkCreate(newProfile.roles.map((r) => ({ ...r, workspace_id: workspace.id, status: "active" })));
        }
      } catch (e) { /* non-fatal */ }

      try {
        await base44.entities.Service.deleteMany({ workspace_id: workspace.id });
        if (newProfile.services.length > 0) {
          await base44.entities.Service.bulkCreate(newProfile.services.map((s) => ({ ...s, workspace_id: workspace.id, status: "active" })));
        }
      } catch (e) { /* non-fatal */ }

      setWorkspace(updated);
      toast({ title: `Business type changed to ${newProfile.label}` });
    } catch (err) {
      toast({ title: "Failed to change business type", description: err.message, variant: "destructive" });
    } finally {
      setConfirmCategory(null);
      stop();
    }
  };

  return (
    <>
      <div className="bg-card border border-border rounded-lg p-4">
        <h3 className="text-sm font-semibold mb-1">Business Type</h3>
        <p className="text-xs text-muted-foreground mb-3">
          Your workspace adapts its terminology, event types, roles & services to your industry.
        </p>

        <button type="button" onClick={() => setPickerOpen(true)}
          className="w-full flex items-center gap-3 p-3 rounded-lg border border-border hover:border-primary/40 hover:bg-primary/5 transition-all text-left">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <CurrentIcon className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold text-foreground">{currentProfile.label}</div>
            <div className="text-xs text-muted-foreground leading-snug">{currentProfile.description}</div>
          </div>
          <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
        </button>
      </div>

      <Dialog open={pickerOpen} onOpenChange={setPickerOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Choose your business type</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[60vh] overflow-y-auto scrollbar-thin pr-1">
            {BUSINESS_CATEGORY_OPTIONS.map((opt) => {
              const Icon = ICON_COMPONENTS[BUSINESS_TYPE_ICONS[opt.value]] || Compass;
              const selected = opt.value === currentCategory;
              return (
                <button key={opt.value} type="button" onClick={() => handleSelect(opt.value)}
                  className={`text-left p-4 rounded-xl border-2 transition-all ${selected ? "border-primary bg-primary/5" : "border-border hover:border-primary/40 hover:bg-muted/40"}`}>
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center mb-2 ${selected ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                    <Icon className="w-4.5 h-4.5" />
                  </div>
                  <div className="text-sm font-semibold text-foreground">{opt.label}</div>
                  <div className="text-xs text-muted-foreground mt-0.5 leading-snug">{opt.description}</div>
                </button>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!confirmCategory} onOpenChange={(open) => { if (!open) setConfirmCategory(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-warning" />
              Change business type?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Switching to <strong>{categoryLabel(confirmCategory)}</strong> will reset your event types,
              team roles, and services to the new industry's defaults. Your existing events and their
              stored data will not be affected — only the suggestion lists and defaults change.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={saving}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={(e) => { e.preventDefault(); confirmChange(); }} disabled={saving} className="bg-primary text-primary-foreground hover:bg-primary-hover">
              {saving ? (<><Loader2 className="w-4 h-4 mr-2 animate-spin" />Changing…</>) : "Change & Reset"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}