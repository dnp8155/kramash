import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { Button as ShadButton } from "@/components/ui/button";
import { useReducedMotion } from "@/lib/motionVariants";

const variants = {
  primary: "bg-primary text-primary-foreground hover:bg-primary-hover shadow-sm hover:shadow-md",
  outline: "border border-border bg-card text-foreground hover:border-primary/40 hover:text-primary hover:bg-primary/5 shadow-xs",
  ghost: "bg-transparent text-foreground hover:bg-muted",
  dark: "bg-sidebar-primary text-sidebar-primary-foreground hover:opacity-90 shadow-sm",
  success: "bg-success text-success-foreground hover:opacity-90 shadow-sm",
  destructive: "bg-destructive text-destructive-foreground hover:opacity-90 shadow-sm",
  reset: "bg-card border border-destructive/60 text-destructive hover:bg-destructive hover:text-destructive-foreground hover:border-destructive",
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
  asChild,
  ...props
}) {
  const reduce = useReducedMotion();

  if (asChild || reduce) {
    return (
      <ShadButton
        variant="ghost"
        asChild={asChild}
        className={cn(variants[variant], sizes[size], "rounded-full font-medium gap-1.5 transition-all", className)}
        {...props}
      >
        {children}
      </ShadButton>
    );
  }

  return (
    <motion.button
      whileTap={{ scale: 0.97 }}
      whileHover={{ y: -1 }}
      transition={{ duration: 0.12, ease: [0.16, 1, 0.3, 1] }}
      className={cn(
        "inline-flex items-center justify-center whitespace-nowrap rounded-full font-medium gap-1.5 transition-all",
        "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50",
        "[&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    >
      {children}
    </motion.button>
  );
}