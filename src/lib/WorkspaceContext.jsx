import React, { createContext, useState, useContext, useEffect, useCallback, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";

const WorkspaceContext = createContext(null);

export const WorkspaceProvider = ({ children }) => {
  const { user, isAuthenticated, authChecked } = useAuth();
  const [workspace, setWorkspace] = useState(null);
  const [membership, setMembership] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  // Tracks the workspace id we've persisted to the user record this session,
  // so RLS rules keyed on `user.data.active_workspace_id` scope entity queries.
  const syncedWorkspaceId = useRef(null);

  const resolve = useCallback(async () => {
    if (!user?.id) {
      setWorkspace(null);
      setMembership(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const memberships = await base44.entities.WorkspaceMember.filter({ user_id: user.id });
      if (!memberships || memberships.length === 0) {
        setWorkspace(null);
        setMembership(null);
        setLoading(false);
        return;
      }
      const activeMembership = memberships[0];
      setMembership(activeMembership);
      try {
        const ws = await base44.entities.Workspace.get(activeMembership.workspace_id);
        setWorkspace(ws);
        // Persist active workspace on the user so RLS scopes Client/Event queries.
        if (ws && syncedWorkspaceId.current !== ws.id) {
          try {
            await base44.auth.updateMe({ active_workspace_id: ws.id });
            syncedWorkspaceId.current = ws.id;
          } catch (e) {
            /* non-fatal: RLS will fall back to empty results */
          }
        }
      } catch (e) {
        setWorkspace(null);
      }
    } catch (e) {
      setError(e.message || "Failed to load workspace");
      setWorkspace(null);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    if (authChecked && isAuthenticated && user) {
      resolve();
    } else if (authChecked && !isAuthenticated) {
      setWorkspace(null);
      setMembership(null);
      setLoading(false);
    }
  }, [authChecked, isAuthenticated, user, resolve]);

  return (
    <WorkspaceContext.Provider
      value={{
        workspace,
        membership,
        workspaceId: workspace?.id || null,
        role: membership?.role || null,
        loading,
        error,
        refresh: resolve,
        setWorkspace
      }}
    >
      {children}
    </WorkspaceContext.Provider>
  );
};

export const useWorkspace = () => {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) {
    throw new Error("useWorkspace must be used within a WorkspaceProvider");
  }
  return ctx;
};