import { useEffect, useRef } from "react";

// Lets a page tell the mobile nav's round "add" button what to do on that page (e.g. open its
// "Add Client" form) without routes or query params. If the page hasn't registered anything the
// nav falls back to navigating, so nothing breaks while a page is still loading.
let current = null;

export function runPageCreateAction() {
  if (!current) return false;
  current();
  return true;
}

export function usePageCreateAction(fn) {
  const ref = useRef(fn);
  ref.current = fn;
  useEffect(() => {
    const handler = () => ref.current();
    current = handler;
    return () => { if (current === handler) current = null; };
  }, []);
}
