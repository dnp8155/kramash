import { useEffect, useRef } from "react";
import { useToast } from "@/components/ui/use-toast";
import { useT } from "@/hooks/useT";

const COOLDOWN_MS = 15000;

/**
 * Deduped partial-error toast. Fires only when:
 *  - partialError is true (at least one call failed)
 *  - error is falsy (not a full failure — that's handled separately)
 *  - hasCachedData is true (we ARE showing last-saved data, so the notice is meaningful)
 *
 * Dedupes with a cooldown so it doesn't spam on every refetch / debounce cycle.
 *
 * @param {boolean} partialError
 * @param {*} error
 * @param {boolean} hasCachedData
 */
export function usePartialErrorToast(partialError, error, hasCachedData) {
  const { toast } = useToast();
  const t = useT();
  const lastShownRef = useRef(0);

  useEffect(() => {
    if (error || !partialError || !hasCachedData) return;
    const now = Date.now();
    if (now - lastShownRef.current < COOLDOWN_MS) return;
    lastShownRef.current = now;
    toast({ title: t("Some data could not be loaded — showing last saved."), variant: "default" });
  }, [partialError, error, hasCachedData, toast, t]);
}