import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/use-toast";
import { Section } from "@/components/quotation/QuotationParts";
import Toggle from "@/components/common/Toggle";
import { useT } from "@/hooks/useT";

// What the client sees. Deliberately NOT locked by finalize/revision state: these two
// switches only change presentation, so they can be flipped at any time and are saved
// straight away when the quotation already exists.
export default function QuotationClientFacingPanel({ quotationId, showPricing, setShowPricing, hideTeamNames, setHideTeamNames }) {
  const t = useT();
  const { toast } = useToast();
  const [busy, setBusy] = useState(false);

  const change = async (field, value, setter) => {
    const prev = field === "show_pricing" ? showPricing : hideTeamNames;
    setter(value);
    if (!quotationId) return; // unsaved draft: saved together with the quotation
    setBusy(true);
    try {
      await base44.entities.Quotation.update(quotationId, { [field]: value });
      toast({ title: t("Client view updated") });
    } catch (e) {
      setter(prev);
      toast({ title: t("Failed to update client view"), description: e?.message, variant: "destructive" });
    } finally { setBusy(false); }
  };

  return (
    <Section icon={hideTeamNames ? EyeOff : Eye} title={t("Client-Facing Presentation")}>
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <span className="text-sm font-medium">{t("Show Qty, Rate & Amount to Client")}</span>
            <p className="text-xs text-muted-foreground mt-0.5">{t("When OFF, the client sees only day/event, included items, and the final total. Admin always retains full pricing data.")}</p>
          </div>
          <Toggle checked={showPricing} onChange={(v) => change("show_pricing", v, setShowPricing)} label={t("Show pricing")} disabled={busy} />
        </div>
        <div className="flex items-center justify-between gap-3 pt-3 border-t border-border">
          <div>
            <span className="text-sm font-medium">{t("Hide Team Names")}</span>
            <p className="text-xs text-muted-foreground mt-0.5">{t("Show roles only, without member names")}</p>
          </div>
          <Toggle checked={hideTeamNames} onChange={(v) => change("hide_team_names", v, setHideTeamNames)} label={t("Hide team names")} disabled={busy} />
        </div>
      </div>
    </Section>
  );
}
