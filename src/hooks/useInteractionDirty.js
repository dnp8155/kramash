import { useEffect, useState } from "react";

// For brand-new documents there is no saved copy to compare against, so "has the person changed
// anything?" is answered by "have they typed or picked anything in a field yet?". Listens for the
// browser's input/change events anywhere on the page while mounted.
export function useInteractionDirty(enabled = true) {
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    if (!enabled) return undefined;
    const mark = () => setTouched(true);
    document.addEventListener("input", mark, true);
    document.addEventListener("change", mark, true);
    return () => {
      document.removeEventListener("input", mark, true);
      document.removeEventListener("change", mark, true);
    };
  }, [enabled]);

  return touched;
}
