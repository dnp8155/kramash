"use client";
import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

const AppDialog = DialogPrimitive.Root;
const AppDialogTrigger = DialogPrimitive.Trigger;

// Swipe-to-dismiss for the phone bottom sheet. The sheet follows the finger from its handle or
// header, the backdrop fades with it, and on release it either slides away (closing through the
// normal Close path, so any unsaved-changes guard still runs) or springs back. Desktop and
// reduced-motion users are untouched.
const SPRING = "transform 320ms cubic-bezier(0.32, 0.72, 0, 1)";
const isPhoneSheet = () =>
  typeof window !== "undefined" &&
  window.matchMedia("(max-width: 639px)").matches &&
  !window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function useSheetSwipe(contentRef, overlayRef, closeRef) {
  const drag = React.useRef(null);

  const setOverlay = (opacity, transition) => {
    const o = overlayRef.current;
    if (!o) return;
    o.style.transition = transition || "none";
    o.style.opacity = opacity;
  };

  const springBack = () => {
    const el = contentRef.current;
    if (!el) return;
    el.style.animation = "";
    el.style.transition = SPRING;
    el.style.transform = "";
    setOverlay("", "opacity 320ms ease");
    setTimeout(() => {
      if (!contentRef.current) return;
      el.style.transition = "";
      el.style.willChange = "";
      if (overlayRef.current) overlayRef.current.style.transition = "";
    }, 340);
  };

  const onPointerDown = (e) => {
    if (!isPhoneSheet() || e.button > 0) return;
    const grip = e.target.closest?.("[data-sheet-grip]");
    if (!grip || e.target.closest("button, a, input, select, textarea, [contenteditable]")) return;
    const el = contentRef.current;
    if (!el) return;
    drag.current = { id: e.pointerId, startY: e.clientY, dy: 0, lastY: e.clientY, lastT: e.timeStamp, v: 0, h: el.offsetHeight };
    el.setPointerCapture?.(e.pointerId);
    el.style.willChange = "transform";
  };

  const onPointerMove = (e) => {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    const el = contentRef.current;
    d.dy = Math.max(0, e.clientY - d.startY);
    const dt = e.timeStamp - d.lastT;
    if (dt > 0) d.v = (e.clientY - d.lastY) / dt;
    d.lastY = e.clientY;
    d.lastT = e.timeStamp;
    el.style.animation = "none";
    el.style.transition = "none";
    el.style.transform = `translateY(${d.dy}px)`;
    setOverlay(String(Math.max(0, 1 - d.dy / d.h)));
  };

  const finish = (e, cancelled) => {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    drag.current = null;
    const el = contentRef.current;
    el?.releasePointerCapture?.(e.pointerId);
    if (!el) return;
    const dismiss = !cancelled && (d.dy > Math.min(140, d.h * 0.3) || (d.v > 0.5 && d.dy > 30));
    if (!dismiss) {
      if (d.dy > 0) springBack(); else el.style.willChange = "";
      return;
    }
    el.style.transition = "transform 220ms cubic-bezier(0.32, 0.72, 0, 1)";
    el.style.transform = "translateY(100%)";
    setOverlay("0", "opacity 220ms ease");
    setTimeout(() => {
      if (!contentRef.current) return;
      // Skip Radix's own exit animation (we're already off-screen), then close via the usual path.
      el.style.animation = "none";
      closeRef.current?.click();
      // A guard (e.g. "discard changes?") may keep the sheet open — bring it back.
      setTimeout(() => { if (contentRef.current && contentRef.current.dataset.state === "open") springBack(); }, 120);
    }, 230);
  };

  return {
    onPointerDown,
    onPointerMove,
    onPointerUp: (e) => finish(e, false),
    onPointerCancel: (e) => finish(e, true),
  };
}

const AppDialogContent = React.forwardRef(({ className, children, maxWidth = "max-w-lg", hideClose = false, ...props }, ref) => {
  const contentRef = React.useRef(null);
  const overlayRef = React.useRef(null);
  const closeRef = React.useRef(null);
  const swipe = useSheetSwipe(contentRef, overlayRef, closeRef);
  const setRefs = React.useCallback((node) => {
    contentRef.current = node;
    if (typeof ref === "function") ref(node);
    else if (ref) ref.current = node;
  }, [ref]);
  return (
  <DialogPrimitive.Portal>
    <DialogPrimitive.Overlay ref={overlayRef} className="fixed inset-0 z-50 bg-black/80 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center pointer-events-none sm:p-4">
      <DialogPrimitive.Content
        ref={setRefs}
        {...swipe}
        onOpenAutoFocus={(e) => e.preventDefault()}
        onFocusCapture={(e) => {
          const target = e.target;
          if (
            target instanceof HTMLInputElement ||
            target instanceof HTMLTextAreaElement ||
            target instanceof HTMLSelectElement ||
            target.isContentEditable
          ) {
            setTimeout(() => {
              target.scrollIntoView({ block: "center", behavior: "smooth" });
            }, 300);
          }
        }}
        className={cn(
          "pointer-events-auto relative flex flex-col bg-background border shadow-xl w-full overflow-hidden",
          "rounded-t-2xl sheet-max safe-area-bottom",
          "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom duration-300 [animation-timing-function:cubic-bezier(0.32,0.72,0,1)] data-[state=closed]:[animation-timing-function:cubic-bezier(0.4,0,0.7,0.6)]",
          "sm:rounded-[15px]",
          "sm:data-[state=closed]:slide-out-to-bottom-0 sm:data-[state=open]:slide-in-from-bottom-0 sm:data-[state=open]:zoom-in-95 sm:data-[state=closed]:zoom-out-95 sm:duration-[250ms]",
          maxWidth,
          className
        )}
        {...props}
      >
        <div data-sheet-grip className="sm:hidden relative mx-auto mt-3 h-1.5 w-12 rounded-full bg-foreground/30 shrink-0 touch-none before:absolute before:-inset-x-12 before:-inset-y-3 before:content-['']" />
        {children}
        <DialogPrimitive.Close ref={closeRef} aria-hidden="true" tabIndex={-1} className="hidden" />
        {!hideClose && (
          <DialogPrimitive.Close className="absolute right-3 top-3 z-10 w-9 h-9 flex items-center justify-center rounded-full border border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground transition-colors focus:outline-none focus:ring-2 focus:ring-ring disabled:pointer-events-none">
            <X className="h-4 w-4" />
            <span className="sr-only">Close</span>
          </DialogPrimitive.Close>
        )}
      </DialogPrimitive.Content>
    </div>
  </DialogPrimitive.Portal>
  );
});
AppDialogContent.displayName = "AppDialogContent";

const AppDialogHeader = React.forwardRef(({ className, ...props }, ref) => (
  <div ref={ref} data-sheet-grip className={cn("flex flex-col gap-1 px-5 pt-4 pb-3 sm:px-6 sm:pt-5 sm:pb-4 border-b border-border shrink-0 max-sm:touch-none", className)} {...props} />
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