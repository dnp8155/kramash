import { RotateCw, FileQuestion, ArrowLeft } from "lucide-react";
import Button from "@/components/common/Button";
import { useT } from "@/hooks/useT";

export default function DetailErrorState({
  title,
  description,
  onBack,
  onRetry,
  backLabel = "Back"
}) {
  const t = useT();
  return (
    <div className="p-4 sm:p-6 max-w-2xl mx-auto">
      <div className="bg-card border border-border rounded-[15px] shadow-card p-8 text-center">
        <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
          <FileQuestion className="w-7 h-7 text-muted-foreground" />
        </div>
        <h2 className="text-lg font-semibold text-foreground">{title}</h2>
        <p className="text-sm text-muted-foreground mt-1.5 max-w-sm mx-auto leading-relaxed">{description}</p>
        {(onRetry || onBack) && (
          <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-center gap-2 mt-6">
            {onBack && (
              <Button variant="outline" onClick={onBack}>
                <ArrowLeft className="w-4 h-4" /> {t(backLabel)}
              </Button>
            )}
            {onRetry && (
              <Button onClick={onRetry}>
                <RotateCw className="w-4 h-4" /> {t("Retry")}
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
