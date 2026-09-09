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
  const [ownerName, setOwnerName] = useState("");

  const resolve = useCallback(async () => {
    if (!user) {
      setLoading(false);
      setWorkspace(null);
      setMembership(null);
      setOwnerName("");
      return;
    }
    setLoading(true);
    try {
      const members = await base44.entities.WorkspaceMember.filter({ user_id: user.id });
      if (!members || members.length === 0) {
        setWorkspace(null);
        setMembership(null);
        setOwnerName("");
        setLoading(false);
        return;
      }
      const activeId = user.active_workspace_id || members[0].workspace_id;
      const m = members.find((x) => x.workspace_id === activeId) || members[0];
      const ws = await base44.entities.Workspace.get(m.workspace_id);
      setCurrencySymbol(ws?.currency);
      setWorkspace(ws);
      setMembership(m);

      // Resolve the workspace owner's name for SELF detection.
      // If the current user IS the owner, use their full_name directly.
      // Otherwise, fetch the owner's User record (service-role not needed —
      // User.get is readable by workspace members).
      let resolvedOwnerName = "";
      if (ws?.owner_user_id) {
        if (ws.owner_user_id === user.id) {
          resolvedOwnerName = user.full_name || "";
        } else {
          try {
            const ownerUser = await base44.entities.User.get(ws.owner_user_id);
            resolvedOwnerName = ownerUser?.full_name || "";
          } catch {
            // If the owner User can't be fetched, SELF detection is skipped.
          }
        }
      }
      setOwnerName(resolvedOwnerName);

      setLoading(false);
    } catch (e) {
      setWorkspace(null);
      setMembership(null);
      setOwnerName("");
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
        ownerName,
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