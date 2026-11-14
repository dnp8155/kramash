import { cn } from "@/lib/utils";
import { countWords, WORD_LIMIT, WORD_LIMIT_WARN_THRESHOLD } from "@/lib/wordLimit";

export default function WordCounterTextarea({
  value,
  onChange,
  maxWords = WORD_LIMIT,
  className,
  ...props
}) {
  const count = countWords(value);
  const isNear = count >= WORD_LIMIT_WARN_THRESHOLD;
  const isOver = count > maxWords;

  return (
    <div className="space-y-1">
      <textarea
        value={value}
        onChange={onChange}
        className={cn(
          "flex min-h-[60px] w-full rounded-md border border-input bg-card px-3 py-2 text-base shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
          className
        )}
        {...props}
      />
      <div className={cn(
        "text-xs text-right tabular-nums",
        isOver ? "text-destructive font-medium" : isNear ? "text-warning" : "text-muted-foreground"
      )}>
        {count} / {maxWords} words
      </div>
    </div>
  );
}