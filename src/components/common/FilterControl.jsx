import { cn } from "@/lib/utils";

export default function FilterControl({ label, value, onChange, options, optionLabels, className }) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      {label && (
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
      )}
      <select
        value={value}
        onChange={onChange}
        className="h-10 rounded-lg border border-input bg-card px-3 text-sm text-foreground transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/30"
      >
        <option value="all">{label ? `All ${label}` : "All"}</option>
        {options.map((opt, i) => {
          const val = typeof opt === "object" ? opt.value : opt;
          const lbl =
            typeof opt === "object" ? opt.label : optionLabels?.[i] ?? opt;
          return (
            <option key={val} value={val}>
              {lbl}
            </option>
          );
        })}
      </select>
    </div>
  );
}