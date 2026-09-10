import { Check } from "lucide-react";

export default function ProjectTimeline({ stages }) {
  return (
    <>
      {/* Desktop: horizontal */}
      <div className="hidden sm:block">
        <div className="relative flex items-start justify-between">
          {/* connecting line */}
          <div className="absolute top-5 left-0 right-0 h-0.5 bg-border" />
          <div
            className="absolute top-5 left-0 h-0.5 bg-primary transition-all duration-500"
            style={{ width: `${Math.min((stages.filter((s) => s.completed).length / (stages.length - 1)) * 100, 100)}%` }}
          />
          {stages.map((stage, idx) => (
            <div key={stage.key} className="relative z-10 flex flex-col items-center" style={{ width: `${100 / stages.length}%` }}>
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-full border-2 transition-colors ${
                  stage.completed
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-card text-muted-foreground"
                }`}
              >
                {stage.completed ? <Check className="h-5 w-5" /> : <span className="text-sm font-semibold">{idx + 1}</span>}
              </div>
              <p className={`mt-2 text-center text-xs font-medium ${stage.completed ? "text-foreground" : "text-muted-foreground"}`}>
                {stage.label}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Mobile: vertical stepper */}
      <div className="sm:hidden">
        <div className="relative">
          {/* vertical connecting line */}
          <div className="absolute top-5 bottom-5 left-5 w-0.5 bg-border" />
          <div
            className="absolute top-5 left-5 w-0.5 bg-primary transition-all duration-500"
            style={{ height: `${(stages.filter((s) => s.completed).length / stages.length) * 100}%` }}
          />
          <div className="space-y-6">
            {stages.map((stage, idx) => (
              <div key={stage.key} className="relative flex items-center gap-4">
                <div
                  className={`relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
                    stage.completed
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-card text-muted-foreground"
                  }`}
                >
                  {stage.completed ? <Check className="h-5 w-5" /> : <span className="text-sm font-semibold">{idx + 1}</span>}
                </div>
                <p className={`text-sm font-medium ${stage.completed ? "text-foreground" : "text-muted-foreground"}`}>
                  {stage.label}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}