// Offline guard for mutations.
// Financial and critical writes must NOT be attempted when offline —
// attempting them risks duplicate records on retry and misleading "saved" states.
// Instead, block the write and tell the user to retry when online.

import { toast } from "@/components/ui/use-toast";

// Returns true if online, false if offline (and shows a toast).
export function assertOnline() {
  if (typeof navigator === "undefined") return true;
  if (navigator.onLine) return true;
  toast({
    title: "You're offline",
    description: "This action will be available when you're back online.",
    variant: "destructive",
  });
  return false;
}

// Silent check — returns true/false without showing a toast.
export function isOnline() {
  return typeof navigator === "undefined" ? true : navigator.onLine;
}