import { Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useT } from "@/hooks/useT";

export default function SearchInput({ className, placeholder = "Search", value, onChange, ...props }) {
  const t = useT();
  return (
    <div className={cn("relative flex items-center", className)}>
      <Search className="absolute left-3 w-4 h-4 text-muted-foreground" />
      <input
        type="text"
        placeholder={t(placeholder)}
        value={value}
        onChange={onChange}
        className={cn(
          "w-full h-9 pl-9 text-sm bg-card border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring/40 focus:border-primary/40 hover:border-border/80",
          value ? "pr-9" : "pr-3"
        )}
        {...props}
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange?.({ target: { value: "" } })}
          className="absolute right-2.5 p-0.5 rounded-full text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          aria-label={t("Clear search")}
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
}