import { ArrowLeft, RotateCw, FileQuestion } from "lucide-react";
import Button from "@/components/common/Button";

export default function DetailErrorState({
  title,
  description,
  onBack,
  onRetry,
  backLabel = "Back"
}) {
  return (
    <div className="p-6 max-w-2xl mx-auto">
      <Button variant="ghost" onClick={onBack} className="mb-4">
        <ArrowLeft className="w-4 h-4" /> {backLabel}
      </Button>
      <div className="bg-card border border-border rounded-lg p-8 text-center">
        <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-3">
          <FileQuestion className="w-6 h-6 text-muted-foreground" />
        </div>
        <h2 className="text-lg font-semibold text-foreground">{title}</h2>
        <p className="text-sm text-muted-foreground mt-1 max-w-sm mx-auto">{description}</p>
        {onRetry && (
          <Button variant="outline" size="sm" onClick={onRetry} className="mt-4">
            <RotateCw className="w-3.5 h-3.5" /> Retry
          </Button>
        )}
      </div>
    </div>
  );
}