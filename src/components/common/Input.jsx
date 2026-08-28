import { forwardRef } from "react";
import { cn } from "@/lib/utils";

const sizes = {
  sm: "h-8 text-xs px-2.5",
  md: "h-9 text-sm px-3"
};

const Input = forwardRef(function Input({ className, size = "md", ...props }, ref) {
  return (
    <input
      ref={ref}
      className={cn(
        "w-full bg-card border border-border rounded-md text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/40",
        sizes[size],
        className
      )}
      {...props}
    />
  );
});

export default Input;