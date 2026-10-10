import { Outlet, Navigate } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import { getTeamPortalSession } from "@/lib/teamPortalSession";

export default function TeamMemberRoute() {
  const { isAuthenticated, isLoadingAuth, authChecked, authError } = useAuth();

  if (isLoadingAuth || !authChecked) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (authError || !isAuthenticated) {
    if (getTeamPortalSession()) {
      return <Outlet />;
    }
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}