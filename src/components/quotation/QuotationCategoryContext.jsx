import Select from "@/components/common/Select";
import { Section, Field } from "@/components/quotation/QuotationParts";
import { QUOTATION_CATEGORIES, CONTEXT_OPTIONS_BY_CATEGORY, CONTEXT_LABEL_BY_CATEGORY } from "@/constants/quotationConfig";

export default function QuotationCategoryContext({ category, setCategory, contextType, setContextType, readOnly }) {
  const contextOptions = CONTEXT_OPTIONS_BY_CATEGORY[category] || [];
  const contextLabel = CONTEXT_LABEL_BY_CATEGORY[category] || "Context";

  return (
    <Section title="Category & Context">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field label="Quotation Category">
          <Select value={category} onChange={(e) => {
            setCategory(e.target.value);
            setContextType("");
          }} disabled={readOnly} className="w-full">
            {QUOTATION_CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </Select>
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