import { useEffect, useState } from "react";

// True once `open` has stayed true past the open animation (300 ms); false the moment it closes.
// Fold-open sections clip their body only while closed or moving, so a suggestion list or menu inside an
// open section can hang below it instead of being cut off (found 2026-11-16, quotation Side / Context).
export function useSettledOpen(open, ms = 320) {
  const [settled, setSettled] = useState(open);
  useEffect(() => {
    if (!open) { setSettled(false); return undefined; }
    const id = setTimeout(() => setSettled(true), ms);
    return () => clearTimeout(id);
  }, [open, ms]);
  return settled;
}
