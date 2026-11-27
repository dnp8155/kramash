import { forwardRef, useState } from "react";
import { CalendarDays, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { useT } from "@/hooks/useT";

const sizes = {
  sm: "h-8 text-base md:text-xs px-2.5",
  md: "h-9 text-base md:text-sm px-3"
};

const base = cn(
  "w-full bg-card border border-border rounded-lg text-foreground placeholder:text-muted-foreground transition-all",
  "focus:outline-none focus:ring-2 focus:ring-ring/40 focus:border-primary/40 hover:border-border/80"
);

// Date / time box. An empty native date or time input is a blank box on iPhone (and "--:--" or
// "dd/mm/yyyy" elsewhere), so while it is empty it shows an icon and a grey label instead.
// Nothing is filled in by itself: the value stays empty until a date/time is picked.
const DateTimeInput = forwardRef(function DateTimeInput(
  { className, wrapperClassName, size = "md", type, value, defaultValue, placeholder, onChange, onFocus, onBlur, disabled, ...props },
  ref
) {
  const t = useT();
  const [focused, setFocused] = useState(false);
  const [typedFilled, setTypedFilled] = useState(!!defaultValue);
  const filled = value !== undefined ? !!value : typedFilled;
  const isTime = type === "time";
  const Icon = isTime ? Clock : CalendarDays;
  const small = size === "sm" || /\b(h-8|text-xs)\b/.test(className || "");
  const label = placeholder || props["aria-label"] || (isTime ? t("Pick time") : t("Pick date"));
  const showLabel = !filled && !focused;

  return (
    <div className={cn("relative w-full min-w-0", wrapperClassName)}>
      <Icon className={cn("absolute top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none z-[1]", small ? "left-2 w-3.5 h-3.5" : "left-2.5 w-4 h-4")} />
      <input
        ref={ref}
        type={type}
        value={value}
        defaultValue={defaultValue}
        disabled={disabled}
        onChange={(e) => { setTypedFilled(!!e.target.value); onChange?.(e); }}
        onFocus={(e) => { setFocused(true); onFocus?.(e); }}
        onBlur={(e) => { setFocused(false); onBlur?.(e); }}
        className={cn(
          base, sizes[small ? "sm" : "md"], "dt-field", small ? "!pl-7" : "!pl-8",
          disabled && "opacity-60 cursor-not-allowed",
          className,
          showLabel && "!text-transparent dt-empty"
        )}
        {...props}
      />
      {showLabel && (
        <span className={cn("absolute top-1/2 -translate-y-1/2 right-2 truncate text-muted-foreground pointer-events-none", small ? "left-7 text-xs" : "left-8 text-sm")}>
          {label}
        </span>
      )}
    </div>
  );
});

const Input = forwardRef(function Input({ className, size = "md", ...props }, ref) {
  if (props.type === "date" || props.type === "time") {
    return <DateTimeInput ref={ref} className={className} size={size} {...props} />;
  }
  const { wrapperClassName: _ignored, ...rest } = props;
  return (
    <input
      ref={ref}
      className={cn(base, sizes[size], className)}
      {...rest}
    />
  );
});

export default Input;
