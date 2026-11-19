import { useEffect } from "react";

// Sets the browser tab title for authenticated app pages to "<Page> | Kramasha".
// Lighter than useSEO (no meta/OG/canonical rewriting) since these pages sit
// behind auth and aren't meant for search indexing.
export function usePageTitle(title) {
  useEffect(() => {
    const prev = document.title;
    document.title = title ? `${title} | Kramasha` : "Kramasha";
    return () => { document.title = prev; };
  }, [title]);
}

export default usePageTitle;
