import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { Navigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { setCurrencySymbol } from "@/utils/format";
import FullScreenSpinner from "@/components/FullScreenSpinner";

const WorkspaceContext = createContext(null);

export const WorkspaceProvider = ({ children }) => {
  const { user, isAuthenticated } = useAuth();
  const [loading, setLoading] = useState(true);
  const [workspace, setWorkspace] = useState(null);
  const [membership, setMembership] = useState(null);

  const resolve = useCallback(async () => {
    if (!user) {
      setLoading(false);
      setWorkspace(null);
      setMembership(null);
      return;
    }
    setLoading(true);
    try {
      const members = await base44.entities.WorkspaceMember.filter({ user_id: user.id });
      if (!members || members.length === 0) {
        setWorkspace(null);
        setMembership(null);
        setLoading(false);
        return;
      }
      const activeId = user.active_workspace_id || members[0].workspace_id;
      const m = members.find((x) => x.workspace_id === activeId) || members[0];
      const ws = await base44.entities.Workspace.get(m.workspace_id);
      setCurrencySymbol(ws?.currency);
      setWorkspace(ws);
      setMembership(m);
      setLoading(false);
    } catch (e) {
      setWorkspace(null);
      setMembership(null);
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    resolve();
  }, [user?.id, isAuthenticated]);

  const refresh = useCallback(() => resolve(), [resolve]);

  return (
    <WorkspaceContext.Provider
      value={{
        currentWorkspace: workspace,
        workspaceId: workspace?.id || null,
        membership,
        role: membership?.role || null,
        loading,
        needsOnboarding: !loading && !workspace,
        refresh,
      }}
    >
      {children}
    </WorkspaceContext.Provider>
  );
};

export const useWorkspace = () => {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) throw new Error("useWorkspace must be used within WorkspaceProvider");
  return ctx;
};

// Gate for the main application: requires an active workspace.
export const WorkspaceGate = ({ children }) => {
  const { loading, needsOnboarding } = useWorkspace();
  if (loading) return <FullScreenSpinner label="Loading your workspace..." />;
  if (needsOnboarding) return <Navigate to="/onboarding" replace />;
  return children;
};