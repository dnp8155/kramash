import { Outlet, Navigate } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import { WorkspaceProvider, useWorkspace } from "@/lib/WorkspaceContext";
import UserNotRegisteredError from "@/components/UserNotRegisteredError";
import AppLoadingScreen from "@/components/common/AppLoadingScreen";

function WorkspaceGate({ noWorkspaceElement }) {
  const { workspace, loading, error, refresh } = useWorkspace();
  if (loading) {
    return <AppLoadingScreen />;
  }
  if (error) {
    return (
      <div className="fixed inset-0 flex flex-col items-center justify-center gap-4 px-4">
        <div className="text-center">
          <p className="text-sm font-medium text-foreground">Couldn't load your workspace</p>
          <p className="text-xs text-muted-foreground mt-1">Check your connection and try again.</p>
        </div>
        <button
          onClick={refresh}
          className="h-9 px-5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary-hover transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }
  if (!workspace) return noWorkspaceElement;
  return <Outlet />;
}

export default function WorkspaceRoute({ unauthenticatedElement, noWorkspaceElement }) {
  const { isAuthenticated, isLoadingAuth, authChecked, authError, user } = useAuth();

  if (isLoadingAuth || !authChecked) return <AppLoadingScreen />;

  if (authError) {
    if (authError.type === "user_not_registered") return <UserNotRegisteredError />;
    return <Navigate to="/login?reason=expired" replace />;
  }

  if (!isAuthenticated) return unauthenticatedElement;

  if (user?.role === "client") {
    return <Navigate to="/client-portal" replace />;
  }

  return (
    <WorkspaceProvider>
      <WorkspaceGate noWorkspaceElement={noWorkspaceElement} />
    </WorkspaceProvider>
  );
}