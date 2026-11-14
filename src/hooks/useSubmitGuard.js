// Double-submit protection hook.
// Uses a synchronous ref guard PLUS React state for UI feedback.
// The ref prevents a second submission within the same render cycle
// (before setSaving(true) has re-rendered and disabled the button).
import { useState, useRef, useCallback } from "react";

export function useSubmitGuard() {
  const [saving, setSaving] = useState(false);
  const ref = useRef(false);

  // Call at the start of a submit handler. Returns true if the submission
  // should proceed, false if a submission is already in flight.
  const start = useCallback(() => {
    if (ref.current) return false;
    ref.current = true;
    setSaving(true);
    return true;
  }, []);

  // Call in the finally block of the submit handler.
  const stop = useCallback(() => {
    ref.current = false;
    setSaving(false);
  }, []);

  return { saving, start, stop };
}