import { cn } from "@/lib/utils";

export default function AdminFunnel({ stages }) {
  return (
    <div className="space-y-3">
      {stages.map((s, i) => (
        <div key={s.label}>
          <div className="flex items-center justify-between text-sm mb-1">
            <span className="text-foreground font-medium">{s.label}</span>
            <span className="text-muted-foreground tabular-nums">{s.value}</span>
          </div>
          <div className="h-6 bg-muted rounded-md overflow-hidden">
            <div
              className={cn("h-full rounded-md transition-all duration-500", s.color)}
              style={{ width: `${Math.max(s.width, s.value > 0 ? 8 : 0)}%` }}
            />
          </div>
          {i < stages.length - 1 && (
            <div className="text-[10px] text-muted-foreground text-right mt-0.5">
              {stages[i + 1].value} of {s.value} → {s.value > 0 ? Math.round((stages[i + 1].value / s.value) * 100) : 0}%
            </div>
          )}
        </div>
      ))}
    </div>
  );
}