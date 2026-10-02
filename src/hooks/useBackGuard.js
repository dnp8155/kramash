import { useEffect, useRef, useState, useCallback } from "react";

/**
 * Intercepts back navigation (browser back button + programmatic back) while
 * the form has unsaved changes, showing a confirmation dialog instead of
 * navigating away immediately.
 *
 * @param {boolean} isDirty - whether the form has unsaved changes
 * @returns {{ showConfirm, confirmBack, stayHere, requestBack }}
 *   - showConfirm: whether the confirmation dialog should be shown
 *   - confirmBack: call when the user confirms they want to leave
 *   - stayHere:    call when the user chooses to stay
 *   - requestBack: call from in-app Cancel/Back buttons (shows dialog if dirty)
 */
export function useBackGuard(isDirty) {
  const [showConfirm, setShowConfirm] = useState(false);
  const dirtyRef = useRef(false);
  const leavingRef = useRef(false);

  useEffect(() => {
    dirtyRef.current = isDirty;
  }, [isDirty]);

  useEffect(() => {
    if (!isDirty) return;

    // Push a sentinel state so the browser back triggers popstate (which we
    // can intercept) instead of leaving the page immediately.
    window.history.pushState({ __backGuard: true }, "");

    const onPopState = () => {
      if (dirtyRef.current && !leavingRef.current) {
        // Re-push the sentinel so the user stays on the page, then show dialog.
        window.history.pushState({ __backGuard: true }, "");
        setShowConfirm(true);
      }
    };

    const onBeforeUnload = (e) => {
      if (dirtyRef.current) {
        e.preventDefault();
        e.returnValue = "";
      }
    };

    window.addEventListener("popstate", onPopState);
    window.addEventListener("beforeunload", onBeforeUnload);

    return () => {
      window.removeEventListener("popstate", onPopState);
      window.removeEventListener("beforeunload", onBeforeUnload);
      // Clean up the sentinel if we're leaving cleanly (not via confirmBack).
      if (window.history.state?.__backGuard && !leavingRef.current) {
        window.history.back();
      }
    };
  }, [isDirty]);

  const confirmBack = useCallback(() => {
    leavingRef.current = true;
    dirtyRef.current = false;
    setShowConfirm(false);
    // Pop the sentinel + go back to the previous page (2 history entries).
    window.history.go(-2);
  }, []);

  const stayHere = useCallback(() => setShowConfirm(false), []);

  const markLeaving = useCallback(() => {
    leavingRef.current = true;
  }, []);

  const requestBack = useCallback(() => {
    if (dirtyRef.current) {
      setShowConfirm(true);
    } else {
      leavingRef.current = true;
      window.history.back();
    }
  }, []);

  return { showConfirm, confirmBack, stayHere, requestBack, markLeaving };
}