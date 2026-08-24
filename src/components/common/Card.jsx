import { cn } from "@/lib/utils";

export default function Card({ className, children, ...props }) {
  return (
    <div
      className={cn("bg-card border border-border rounded-lg shadow-sm", className)}
      {...props}
    >
      {children}
    </div>
  );
}