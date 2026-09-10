import { cn } from "@/lib/utils";
import { Button as ShadButton } from "@/components/ui/button";

const variants = {
  primary: "bg-primary text-primary-foreground hover:bg-primary-hover shadow-sm hover:shadow-md",
  outline: "border border-border bg-card text-foreground hover:bg-muted shadow-xs",
  ghost: "bg-transparent text-foreground hover:bg-muted",
  dark: "bg-sidebar-primary text-sidebar-primary-foreground hover:opacity-90 shadow-sm",
  success: "bg-success text-success-foreground hover:opacity-90 shadow-sm",
  destructive: "bg-card border border-destructive/60 text-destructive hover:bg-destructive/5",
  subtle: "bg-muted text-foreground hover:bg-secondary"
};

const sizes = {
  sm: "h-8 px-3 text-xs",
  md: "h-9 px-4 text-sm",
  lg: "h-10 px-5 text-sm",
  icon: "h-9 w-9"
};

export default function Button({
  variant = "primary",
  size = "md",
  className,
  children,
  ...props
}) {
  return (
    <ShadButton
      variant="ghost"
      className={cn(variants[variant], sizes[size], "rounded-lg font-medium gap-1.5 transition-all", className)}
      {...props}
    >
      {children}
    </ShadButton>
  );
}