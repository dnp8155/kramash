import { forwardRef } from "react";
import { cn } from "@/lib/utils";

const Card = forwardRef(function Card({ className, children, ...props }, ref) {
  return (
    <div
      ref={ref}
      className={cn("bg-card border border-border rounded-lg", className)}
      {...props}
    >
      {children}
    </div>
  );
});

export default Card;