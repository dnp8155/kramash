import Select from "@/components/common/Select";
import { Section, Field } from "@/components/quotation/QuotationParts";
import { QUOTATION_CATEGORIES, CONTEXT_OPTIONS_BY_CATEGORY, CONTEXT_LABEL_BY_CATEGORY } from "@/constants/quotationConfig";
import { Lock } from "lucide-react";

export default function QuotationCategoryContext({ category, setCategory, contextType, setContextType, readOnly }) {
  const contextOptions = CONTEXT_OPTIONS_BY_CATEGORY[category] || [];
  const contextLabel = CONTEXT_LABEL_BY_CATEGORY[category] || "Context";
  const categoryLabel = QUOTATION_CATEGORIES.find((c) => c.value === category)?.label || category;

  return (
    <Section title="Category & Context">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field label="Quotation Category">
          <div className="flex items-center gap-2">
            <div className="flex-1 px-3 h-9 flex items-center bg-muted/50 rounded-lg text-sm font-medium text-foreground">
              {categoryLabel}
            </div>
            <Lock className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
          </div>
          <p className="text-xs text-muted-foreground mt-1">Pre-selected from your workspace business category — cannot be changed.</p>
        </Field>
        {contextOptions.length > 0 && (
          <Field label={contextLabel}>
            <Select value={contextType} onChange={(e) => setContextType(e.target.value)} disabled={readOnly} className="w-full">
              <option value="">— Select {contextLabel.toLowerCase()} —</option>
              {contextOptions.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </Select>
          </Field>
        )}
      </div>
    </Section>
  );
}