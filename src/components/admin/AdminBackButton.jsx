import { useNavigate, useLocation } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

// History index of the first SaaS Admin page in this visit. AdminLayout sets
// it when it mounts, so the back arrow can tell "previous page is inside
// admin" apart from "previous page is the main app".
let adminEntryIdx = null;
export const markAdminEntry = () => {
  if (adminEntryIdx === null) adminEntryIdx = window.history.state?.idx ?? 0;
};
export const resetAdminEntry = () => { adminEntryIdx = null; };

// Round back arrow next to the title of an admin detail page (a single workspace).
// Top-level admin pages are reached from the sidebar / bottom bar, so they get no
// arrow. It steps back within admin when it can, otherwise goes to the list;
// leaving admin is done with "Back to App".
export default function AdminBackButton() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  if (!/^\/admin\/workspaces\/[^/]+$/.test(pathname)) return null;
  const canGoBack = adminEntryIdx !== null && (window.history.state?.idx ?? 0) > adminEntryIdx;

  return (
    <button
      onClick={() => (canGoBack ? navigate(-1) : navigate("/admin/workspaces"))}
      aria-label="Back"
      title="Back"
      className="flex w-8 h-8 rounded-full border border-border bg-card items-center justify-center text-foreground hover:bg-muted transition-colors shrink-0"
    >
      <ArrowLeft className="w-4 h-4" />
    </button>
  );
}
