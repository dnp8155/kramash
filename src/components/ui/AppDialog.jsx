"use client";
import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

// Unified responsive modal-sheet primitive.
// Mobile (<sm): bottom-anchored sheet, slide up/down.
// Desktop (sm+): centered modal card, slide up/down (no zoom).
const AppDialog = DialogPrimitive.Root;
const AppDialogTrigger = DialogPrimitive.Trigger;

const AppDialogContent = React.forwardRef(({ className, children, maxWidth = "max-w-lg", hideClose = false, ...props }, ref) => (
  <DialogPrimitive.Portal>
    <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/80 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center pointer-events-none sm:p-4">
      <DialogPrimitive.Content
        ref={ref}
        className={cn(
          "pointer-events-auto relative flex flex-col bg-background border shadow-xl w-full overflow-hidden",
          // Mobile: bottom sheet
          "rounded-t-2xl max-h-[92dvh] safe-area-bottom",
          "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom duration-300",
          // Desktop: centered modal (subtle slide, no zoom)
          "sm:rounded-[15px] sm:max-h-[90dvh]",
          "sm:data-[state=closed]:slide-out-to-bottom-4 sm:data-[state=open]:slide-in-from-bottom-4 sm:duration-200",
          maxWidth,
          className
        )}
        {...props}
      >
        {/* Drag handle (mobile only) */}
        <div className="sm:hidden mx-auto mt-3 h-1.5 w-10 rounded-full bg-muted shrink-0" />
        {children}
        {!hideClose && (
          <DialogPrimitive.Close className="absolute right-3 top-3 z-10 w-9 h-9 flex items-center justify-center rounded-full border border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground transition-colors focus:outline-none focus:ring-2 focus:ring-ring disabled:pointer-events-none">
            <X className="h-4 w-4" />
            <span className="sr-only">Close</span>
          </DialogPrimitive.Close>
        )}
      </DialogPrimitive.Content>
    </div>
  </DialogPrimitive.Portal>
));
AppDialogContent.displayName = "AppDialogContent";

const AppDialogHeader = React.forwardRef(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("flex flex-col gap-1 px-5 pt-4 pb-3 sm:px-6 sm:pt-5 sm:pb-4 border-b border-border shrink-0", className)} {...props} />
));
AppDialogHeader.displayName = "AppDialogHeader";

const AppDialogTitle = React.forwardRef(({ className, ...props }, ref) => (
  <DialogPrimitive.Title ref={ref} className={cn("text-base font-semibold leading-tight tracking-tight pr-12 break-anywhere", className)} {...props} />
));
AppDialogTitle.displayName = "AppDialogTitle";

const AppDialogDescription = React.forwardRef(({ className, ...props }, ref) => (
  <DialogPrimitive.Description ref={ref} className={cn("text-sm text-muted-foreground pr-12 break-anywhere", className)} {...props} />
));
AppDialogDescription.displayName = "AppDialogDescription";

const AppDialogBody = React.forwardRef(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("flex-1 overflow-y-auto scrollbar-thin px-5 py-4 sm:px-6 sm:py-5", className)} {...props} />
));
AppDialogBody.displayName = "AppDialogBody";

const AppDialogFooter = React.forwardRef(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("flex flex-col-reverse sm:flex-row sm:justify-end gap-2 px-5 py-4 sm:px-6 border-t border-border shrink-0 [&>button]:w-full sm:[&>button]:w-auto", className)} {...props} />
));
AppDialogFooter.displayName = "AppDialogFooter";

export {
  AppDialog,
  AppDialogTrigger,
  AppDialogContent,
  AppDialogHeader,
  AppDialogTitle,
  AppDialogDescription,
  AppDialogBody,
  AppDialogFooter,
};