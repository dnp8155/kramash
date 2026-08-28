import { Search } from "lucide-react";
import { cn } from "@/lib/utils";

export default function SearchInput({ className, placeholder = "Search", ...props }) {
  return (
    <div className={cn("relative flex items-center", className)}>
      <Search className="absolute left-3 w-4 h-4 text-muted-foreground" />
      <input
        type="text"
        placeholder={placeholder}
        className="w-full h-9 pl-9 pr-3 text-sm bg-card border border-border rounded-lg transition-all focus:outline-none focus:ring-2 focus:ring-ring/40 focus:border-primary/40 hover:border-border/80"
        {...props}
      />
    </div>
  );
}