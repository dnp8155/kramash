import { cn } from "@/lib/utils";

// Small "Last used" pill shown on the sign-in method the person used last on this device.
// `onDark` is for sitting on the blue primary button: a white pill with blue text, so it stays readable there.
export default function LastUsedTag({ onDark = false, className = "" }) {
  return (
    <span
      className={cn(
        "absolute -top-2 right-3 z-10 rounded-full px-2 py-0.5 text-[10px] font-semibold leading-none shadow-sm",
        onDark ? "bg-white text-[#2D4899] border border-[#2D4899]/30" : "bg-[#2D4899] text-white",
        className
      )}
    >
      Last used
    </span>
  );
}
