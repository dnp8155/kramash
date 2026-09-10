import { Outlet } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import { WorkspaceProvider, useWorkspace } from "@/lib/WorkspaceContext";
import { useRealtimeSync } from "@/hooks/useRealtimeSync";
import UserNotRegisteredError from "@/components/UserNotRegisteredError";

const Spinner = () => (
  <div className="fixed inset-0 flex items-center justify-center">
    <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
  </div>
);

function WorkspaceGate({ noWorkspaceElement }) {
  const { workspace, loading } = useWorkspace();
  useRealtimeSync();
  if (loading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="flex items-center gap-3 text-muted-foreground">
          <div className="w-5 h-5 border-2 border-muted border-t-primary rounded-full animate-spin" />
          <span className="text-sm">Loading your workspace…</span>
        </div>
      </div>
    );
  }
  if (!workspace) return noWorkspaceElement;
  return <Outlet />;
}

export default function WorkspaceRoute({ unauthenticatedElement, noWorkspaceElement }) {
  const { isAuthenticated, isLoadingAuth, authChecked, authError } = useAuth();

  if (isLoadingAuth || !authChecked) return <Spinner />;

  if (authError) {
    if (authError.type === "user_not_registered") return <UserNotRegisteredError />;
    return unauthenticatedElement;
  }

  if (!isAuthenticated) return unauthenticatedElement;

  return (
    <WorkspaceProvider>
      <WorkspaceGate noWorkspaceElement={noWorkspaceElement} />
    </WorkspaceProvider>
  );
}