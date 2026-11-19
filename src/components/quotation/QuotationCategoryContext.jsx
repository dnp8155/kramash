import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Section, Field } from "@/components/quotation/QuotationParts";
import { QUOTATION_CATEGORIES } from "@/constants/quotationConfig";
import EventTypeAutocomplete from "@/components/events/EventTypeAutocomplete";
import { contextSuggestions, contextValueLabel } from "@/lib/quotationContext";
import { Lock } from "lucide-react";
import { useT } from "@/hooks/useT";

// Side / Context: suggestions come from Preferences → Team member types, plus Common and None; anything else can be
// typed and is then suggested again on later quotations (taken from earlier quotations, no extra settings).
export default function QuotationCategoryContext({ category, contextType, setContextType, readOnly, workspace }) {
  const t = useT();
  const categoryLabel = QUOTATION_CATEGORIES.find((c) => c.value === category)?.label || category;

  const { data: used = [] } = useQuery({
    queryKey: ["quotation-context-values", workspace?.id],
    queryFn: async () => {
      const rows = await base44.entities.Quotation.filter({ workspace_id: workspace.id }, "-created_date", 300);
      return [...new Set((rows || []).map((q) => q.context_type).filter(Boolean))];
    },
    enabled: !!workspace?.id && !readOnly,
    staleTime: 5 * 60 * 1000,
  });

  return (
    <Section title={t("Category & Context")}>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field label={t("Quotation Category")}>
          <div className="flex items-center gap-2">
            <div className="flex-1 px-3 h-9 flex items-center bg-muted/50 rounded-lg text-sm font-medium text-foreground">
              {t(categoryLabel)}
            </div>
            <Lock className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
          </div>
          <p className="text-xs text-muted-foreground mt-1">{t("Pre-selected from your workspace business category — cannot be changed.")}</p>
        </Field>
        <Field label={t("Side / Context")}>
          {readOnly ? (
            <div className="px-3 h-9 flex items-center bg-muted/50 rounded-lg text-sm text-foreground">{contextValueLabel(contextType) || "—"}</div>
          ) : (
            <EventTypeAutocomplete
              value={contextValueLabel(contextType)}
              onChange={setContextType}
              suggestions={contextSuggestions(workspace, used)}
              placeholder={t("Pick or type, e.g. Bride Side")}
            />
          )}
          <p className="text-xs text-muted-foreground mt-1">{t("Shown on the quotation PDF and links. Choose None to leave it off.")}</p>
        </Field>
      </div>
    </Section>
  );
}
