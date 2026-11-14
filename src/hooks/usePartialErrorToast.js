import { createElement, useEffect, useRef } from "react";
import { useToast } from "@/components/ui/use-toast";
import { ToastAction } from "@/components/ui/toast";
import { useT } from "@/hooks/useT";

const COOLDOWN_MS = 15000;

/**
 * Deduped partial-error toast. Fires only when:
 *  - partialError is true (at least one call failed)
 *  - error is falsy (not a full failure — that's handled separately)
 *  - hasCachedData is true (we ARE showing last-saved data, so the notice is meaningful)
 *
 * Dedupes with a cooldown so it doesn't spam on every refetch / debounce cycle.
 * When `onRefresh` is given, the toast carries a "Refresh" action that reloads just that
 * data (no page reload).
 *
 * @param {boolean} partialError
 * @param {*} error
 * @param {boolean} hasCachedData
 * @param {() => void} [onRefresh]
 */
export function usePartialErrorToast(partialError, error, hasCachedData, onRefresh) {
  const { toast } = useToast();
  const t = useT();
  const lastShownRef = useRef(0);
  const refreshRef = useRef(onRefresh);
  refreshRef.current = onRefresh;

  useEffect(() => {
    if (error || !partialError || !hasCachedData) return;
    const now = Date.now();
    if (now - lastShownRef.current < COOLDOWN_MS) return;
    lastShownRef.current = now;
    const action = refreshRef.current
      ? createElement(ToastAction, { altText: t("Refresh"), onClick: () => refreshRef.current?.() }, t("Refresh"))
      : undefined;
    toast({ title: t("Some data could not be loaded — showing last saved."), variant: "warning", action });
  }, [partialError, error, hasCachedData, toast, t]);
}
