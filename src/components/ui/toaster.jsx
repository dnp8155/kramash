import { useToast } from "@/components/ui/use-toast";
import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
  TOAST_ICONS,
} from "@/components/ui/toast";
import { cn } from "@/lib/utils";

// Most callers only pass `variant: "destructive"` for errors and nothing for everything
// else, so a plain toast that reads like a heads-up (not a success) gets the info style.
const INFO_HINT = /^(no |not )|cancel|unavailable|\boff\b|already|nothing/i;

function resolveVariant({ variant, title }) {
  if (variant && variant !== "default") return variant;
  return INFO_HINT.test(String(title || "")) ? "info" : "success";
}

export function Toaster() {
  const { toasts } = useToast();

  return (
    <ToastProvider swipeDirection="right">
      {toasts.map(function ({ id, title, description, action, ...props }) {
        const variant = resolveVariant({ variant: props.variant, title });
        const { Icon, className } = TOAST_ICONS[variant] || TOAST_ICONS.default;
        return (
          <Toast key={id} {...props} variant={variant}>
            <Icon className={cn("mt-0.5 h-5 w-5 shrink-0", className)} aria-hidden />
            <div className="grid min-w-0 flex-1 gap-0.5">
              {title && <ToastTitle>{title}</ToastTitle>}
              {description && <ToastDescription>{description}</ToastDescription>}
            </div>
            {action}
            <ToastClose />
          </Toast>
        );
      })}
      <ToastViewport />
    </ToastProvider>
  );
}
