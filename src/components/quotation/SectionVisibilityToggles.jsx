import Toggle from "@/components/common/Toggle";
import { cn } from "@/lib/utils";

export default function SectionVisibilityToggles({ sectionKey, visibility, setVisibility, readOnly, className }) {
  const vis = visibility?.[sectionKey] || { pdf: true, link: true };

  const update = (field, value) => {
    const next = { ...visibility, [sectionKey]: { ...vis, [field]: value } };
    setVisibility(next);
  };

  return (
    <div className={cn("flex flex-wrap items-center gap-4", className)}>
      <div className="flex items-center gap-2">
        <Toggle checked={vis.pdf !== false} onChange={(v) => update("pdf", v)} label="PDF" disabled={readOnly} />
        <span className="text-xs text-muted-foreground">Show in PDF</span>
      </div>
      <div className="flex items-center gap-2">
        <Toggle checked={vis.link !== false} onChange={(v) => update("link", v)} label="Link" disabled={readOnly} />
        <span className="text-xs text-muted-foreground">Show in Link</span>
      </div>
    </div>
  );
}