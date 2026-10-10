import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

// Horizontal timeline on desktop, vertical stepper on mobile.
// currentStage: 0 = before booking, 1 = booking confirmed, 2 = planning, 3 = event day, 4 = delivery
export default function PortalTimeline({ currentStage, stages }) {
  return (
    <div className="bg-card border border-border rounded-xl p-5">
      <h3 className="text-sm font-semibold text-foreground mb-4">Project Timeline</h3>

      {/* Desktop: horizontal */}
      <div className="hidden sm:flex items-center justify-between relative">
        {/* Connecting line */}
        <div className="absolute top-5 left-0 right-0 h-0.5 bg-border" />
        <div
          className="absolute top-5 left-0 h-0.5 bg-primary transition-all duration-500"
          style={{ width: `${Math.min(100, (currentStage / 4) * 100)}%` }}
        />
        {stages.map((stage) => {
          const step = stage.step;
          const isCompleted = currentStage > step;
          const isActive = currentStage === step;
          const isUpcoming = currentStage < step;
          return (
            <div key={stage.step} className="flex flex-col items-center relative z-10 flex-1">
              <div
                className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center text-xs font-semibold border-2 transition-all",
                  isCompleted && "bg-primary border-primary text-primary-foreground",
                  isActive && "bg-primary border-primary text-primary-foreground ring-4 ring-primary/20",
                  isUpcoming && "bg-card border-border text-muted-foreground"
                )}
              >
                {isCompleted ? <Check className="w-4 h-4" /> : stage.step}
              </div>
              <span
                className={cn(
                  "text-xs mt-2 text-center font-medium max-w-[80px]",
                  isCompleted && "text-foreground",
                  isActive && "text-foreground",
                  isUpcoming && "text-muted-foreground"
                )}
              >
                {stage.label}
              </span>
            </div>
          );
        })}
      </div>

      {/* Mobile: vertical stepper */}
      <div className="sm:hidden space-y-0">
        {stages.map((stage, idx) => {
          const step = stage.step;
          const isCompleted = currentStage > step;
          const isActive = currentStage === step;
          const isUpcoming = currentStage < step;
          const isLast = idx === stages.length - 1;
          return (
            <div key={stage.step} className="flex items-start gap-3">
              <div className="flex flex-col items-center">
                <div
                  className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold border-2 shrink-0 transition-all",
                    isCompleted && "bg-primary border-primary text-primary-foreground",
                    isActive && "bg-primary border-primary text-primary-foreground ring-4 ring-primary/20",
                    isUpcoming && "bg-card border-border text-muted-foreground"
                  )}
                >
                  {isCompleted ? <Check className="w-3.5 h-3.5" /> : stage.step}
                </div>
                {!isLast && (
                  <div className={cn("w-0.5 h-8 mt-1", isCompleted ? "bg-primary" : "bg-border")} />
                )}
              </div>
              <div className="pt-1.5 pb-2">
                <span
                  className={cn(
                    "text-sm font-medium",
                    isCompleted && "text-foreground",
                    isActive && "text-foreground",
                    isUpcoming && "text-muted-foreground"
                  )}
                >
                  {stage.label}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}