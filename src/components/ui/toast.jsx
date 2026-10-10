import * as React from "react";
import * as ToastPrimitives from "@radix-ui/react-toast";
import { cva } from "class-variance-authority";
import { X, CheckCircle2, AlertCircle, AlertTriangle, Info } from "lucide-react";
import { cn } from "@/lib/utils";

const ToastProvider = ToastPrimitives.Provider;

// Floating cards, never a full-width bar: top-centre on phones (below the notch, so
// it can't be mistaken for the offline banner), bottom-right on larger screens.
// The list itself ignores taps so an empty/gap area never blocks the page.
const ToastViewport = React.forwardRef(({ className, ...props }, ref) => (
  <ToastPrimitives.Viewport
    ref={ref}
    className={cn(
      "pointer-events-none fixed inset-x-0 top-0 z-[100] m-0 flex list-none flex-col items-center gap-2 p-3 pt-[calc(env(safe-area-inset-top)+0.75rem)]",
      "sm:inset-x-auto sm:bottom-0 sm:right-0 sm:top-auto sm:items-end sm:p-4 sm:pt-4",
      className
    )}
    {...props}
  />
));
ToastViewport.displayName = ToastPrimitives.Viewport.displayName;

// Coloured border on every side + a faint matching tint over the card colour (not a solid
// slab), so it reads clearly and still works in every theme.
const toastVariants = cva(
  "group pointer-events-auto relative flex w-full max-w-sm items-start gap-3 overflow-hidden rounded-xl border-[1.5px] bg-card p-3.5 pr-10 text-card-foreground transition-all data-[swipe=cancel]:translate-x-0 data-[swipe=end]:translate-x-[var(--radix-toast-swipe-end-x)] data-[swipe=move]:translate-x-[var(--radix-toast-swipe-move-x)] data-[swipe=move]:transition-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[swipe=end]:animate-out data-[state=closed]:fade-out-80 data-[state=closed]:slide-out-to-top-2 data-[state=open]:slide-in-from-top-4 sm:data-[state=closed]:slide-out-to-right-full sm:data-[state=open]:slide-in-from-bottom-4",
  {
    variants: {
      variant: {
        default: "border-success/50 bg-[linear-gradient(hsl(var(--success)/0.09),hsl(var(--success)/0.09))] shadow-[0_10px_24px_-10px_hsl(var(--success)/0.45)]",
        success: "border-success/50 bg-[linear-gradient(hsl(var(--success)/0.09),hsl(var(--success)/0.09))] shadow-[0_10px_24px_-10px_hsl(var(--success)/0.45)]",
        destructive: "destructive border-destructive/50 bg-[linear-gradient(hsl(var(--destructive)/0.08),hsl(var(--destructive)/0.08))] shadow-[0_10px_24px_-10px_hsl(var(--destructive)/0.45)]",
        warning: "border-warning/55 bg-[linear-gradient(hsl(var(--warning)/0.10),hsl(var(--warning)/0.10))] shadow-[0_10px_24px_-10px_hsl(var(--warning)/0.45)]",
        info: "border-primary/45 bg-[linear-gradient(hsl(var(--primary)/0.08),hsl(var(--primary)/0.08))] shadow-[0_10px_24px_-10px_hsl(var(--primary)/0.4)]",
      },
    },
    defaultVariants: { variant: "default" },
  }
);

export const TOAST_ICONS = {
  default: { Icon: CheckCircle2, className: "text-success" },
  success: { Icon: CheckCircle2, className: "text-success" },
  destructive: { Icon: AlertCircle, className: "text-destructive" },
  warning: { Icon: AlertTriangle, className: "text-warning" },
  info: { Icon: Info, className: "text-primary" },
};

// Auto-hide timings (ms): errors linger a little longer so they can be read.
export const TOAST_DURATION = { default: 3500, success: 3500, info: 4000, warning: 5000, destructive: 6000 };

const Toast = React.forwardRef(({ className, variant, ...props }, ref) => {
  return (
    <ToastPrimitives.Root
      ref={ref}
      duration={TOAST_DURATION[variant || "default"]}
      className={cn(toastVariants({ variant }), className)}
      {...props}
    />
  );
});
Toast.displayName = ToastPrimitives.Root.displayName;

const ToastAction = React.forwardRef(({ className, ...props }, ref) => (
  <ToastPrimitives.Action
    ref={ref}
    className={cn(
      "inline-flex h-8 shrink-0 items-center justify-center rounded-md border bg-transparent px-3 text-sm font-medium ring-offset-background transition-colors hover:bg-secondary focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
      className
    )}
    {...props}
  />
));
ToastAction.displayName = ToastPrimitives.Action.displayName;

const ToastClose = React.forwardRef(({ className, ...props }, ref) => (
  <ToastPrimitives.Close
    ref={ref}
    className={cn(
      "absolute right-2 top-2 rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus:outline-none focus:ring-2 focus:ring-ring",
      className
    )}
    toast-close=""
    {...props}
  >
    <X className="h-4 w-4" />
  </ToastPrimitives.Close>
));
ToastClose.displayName = ToastPrimitives.Close.displayName;

const ToastTitle = React.forwardRef(({ className, ...props }, ref) => (
  <ToastPrimitives.Title
    ref={ref}
    className={cn("text-sm font-semibold leading-snug", className)}
    {...props}
  />
));
ToastTitle.displayName = ToastPrimitives.Title.displayName;

const ToastDescription = React.forwardRef(({ className, ...props }, ref) => (
  <ToastPrimitives.Description
    ref={ref}
    className={cn("text-sm text-muted-foreground leading-snug", className)}
    {...props}
  />
));
ToastDescription.displayName = ToastPrimitives.Description.displayName;

export {
  ToastProvider,
  ToastViewport,
  Toast,
  ToastTitle,
  ToastDescription,
  ToastClose,
  ToastAction,
};
