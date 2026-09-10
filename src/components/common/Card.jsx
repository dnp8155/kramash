import { forwardRef } from "react";
import { cn } from "@/lib/utils";

const Card = forwardRef(function Card({ className, hover = false, children, ...props }, ref) {
  return (
    <div
      ref={ref}
      className={cn(
        "bg-card border border-border rounded-xl shadow-card",
        hover && "hover:shadow-card-hover hover:border-border/80 cursor-pointer transition-shadow duration-200",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
});

export default Card;