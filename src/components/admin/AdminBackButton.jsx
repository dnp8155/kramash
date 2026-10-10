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

// Round back arrow next to an admin page title, on desktop and mobile. It only
// steps back within SaaS Admin; leaving admin is done from the sidebar's
// "Back to Dashboard" (desktop) or the header arrow (mobile).
export default function AdminBackButton() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const canGoBack = adminEntryIdx !== null && (window.history.state?.idx ?? 0) > adminEntryIdx;

  if (!canGoBack && pathname === "/admin") return null;

  return (
    <button
      onClick={() => (canGoBack ? navigate(-1) : navigate("/admin"))}
      aria-label="Back"
      title="Back"
      className="flex w-8 h-8 rounded-full border border-border bg-card items-center justify-center text-foreground hover:bg-muted transition-colors shrink-0"
    >
      <ArrowLeft className="w-4 h-4" />
    </button>
  );
}
