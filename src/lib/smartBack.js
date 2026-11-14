// "Back" that always goes somewhere. navigate(-1) does nothing when the page being viewed is the first
// entry of this tab's history — e.g. a notification tapped on the home screen, a link opened in a new tab,
// or a refresh on a deep page. In that case we go up to the section's list page (/events/123 → /events),
// or the dashboard for a top-level page.
export function hasInAppHistory() {
  // React Router's BrowserRouter stamps every entry it creates with an increasing `idx` (0 = first).
  const idx = window.history.state?.idx;
  return typeof idx === "number" && idx > 0;
}

export function backFallbackFor(pathname) {
  const parts = String(pathname || "").split("/").filter(Boolean);
  return parts.length > 1 ? `/${parts[0]}` : "/dashboard";
}

export function goBack(navigate, pathname) {
  if (hasInAppHistory()) navigate(-1);
  else navigate(backFallbackFor(pathname), { replace: true });
}
