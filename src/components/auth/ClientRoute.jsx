import { Outlet, Navigate } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";

// Guards routes meant for client portal users.
// If not authenticated → redirect to /client-login.
// Any authenticated user is allowed through — the ClientPortal page auto-links
// invited users (role "user") to their Client record on first access, upgrading
// them to role "client". This avoids a hard role check that would redirect
// newly-invited clients away before they can be linked.
export default function ClientRoute() {
  const { isAuthenticated, isLoadingAuth, authChecked, authError } = useAuth();

  if (isLoadingAuth || !authChecked) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (authError || !isAuthenticated) {
    return <Navigate to="/client-login" replace />;
  }

  return <Outlet />;
}