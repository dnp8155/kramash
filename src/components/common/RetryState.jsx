import { AlertCircle, RotateCw } from "lucide-react";
import Button from "@/components/common/Button";
import { useT } from "@/hooks/useT";

export default function RetryState({ onRetry, message }) {
  const t = useT();
  return (
    <div className="flex flex-col items-center text-center p-10 rounded-xl border border-border bg-card">
      <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center mb-3">
        <AlertCircle className="w-6 h-6 text-destructive" />
      </div>
      <h3 className="text-base font-semibold text-foreground">
        {t("Couldn't load data")}
      </h3>
      <p className="text-sm text-muted-foreground mt-1 max-w-sm">
        {message || t("A temporary error occurred. Please try again.")}
      </p>
      {onRetry && (
        <Button variant="outline" size="sm" className="mt-4" onClick={onRetry}>
          <RotateCw className="w-3.5 h-3.5" /> {t("Retry")}
        </Button>
      )}
    </div>
  );
}