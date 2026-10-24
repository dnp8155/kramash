import React, { createContext, useState, useContext, useEffect, useCallback, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { withRetry } from "@/lib/apiRetry";
import { setDateFormat, setFyStartMonth } from "@/lib/dates";
import { setNumberFormat } from "@/utils/format";
import { setExportBusinessName } from "@/lib/exportUtils";

import { queryClientInstance } from "@/lib/query-client";
import { markResumed } from "@/lib/queryPersistence";

const WorkspaceContext = createContext(null);

// Away from the app at least this long → refresh its data when it comes back (shorter hops, like a quick app switch, don't).
const RESUME_REFRESH_AFTER_MS = 8 * 1000;
// While the app stays open on screen, it also refreshes quietly this often.
const OPEN_REFRESH_EVERY_MS = 60 * 1000;

// The last workspace loaded for a user. The provider is unmounted whenever someone opens a page outside the app
// layout (FAQ, Terms, Privacy…) and mounted again on the way back; starting from this copy lets that return be
// instant, while a quiet refresh below keeps it current.
let lastLoaded = null; // { userId, workspace, membership }

// The same copy is kept on the device, so opening the app again (a phone often discards a backgrounded app) shows
// the workspace right after sign-in is confirmed, without waiting for the workspace to be fetched again. It is
// per user, refreshed in the background every time, and removed on sign-out.
const SNAPSHOT_KEY = "kramasha:workspace-snapshot";
const readSnapshot = (userId) => {
  try {
    const v = JSON.parse(localStorage.getItem(SNAPSHOT_KEY) || "null");
    return v && v.userId === userId && v.workspace?.id ? v : null;
  } catch { return null; }
};
const writeSnapshot = (value) => {
  try {
    if (value) localStorage.setItem(SNAPSHOT_KEY, JSON.stringify(value));
    else localStorage.removeItem(SNAPSHOT_KEY);
  } catch { /* storage full or unavailable: the app just loads as before */ }
};

export const WorkspaceProvider = ({ children }) => {
  const { user, isAuthenticated, authChecked } = useAuth();
  const cached = (lastLoaded && lastLoaded.userId === user?.id ? lastLoaded : null) || (user?.id ? readSnapshot(user.id) : null);
  const [workspace, setWorkspace] = useState(cached?.workspace || null);
  const [membership, setMembership] = useState(cached?.membership || null);
  const [loading, setLoading] = useState(!cached);
  const [error, setError] = useState(null);
  // Tracks the workspace id we've persisted to the user record this session,
  // so RLS rules keyed on `user.data.active_workspace_id` scope entity queries.
  const syncedWorkspaceId = useRef(null);

  const resolve = useCallback(async (showLoading = true) => {
    if (!user?.id) {
      setWorkspace(null);
      setMembership(null);
      setLoading(false);
      return;
    }
    if (showLoading && !workspace) setLoading(true);
    setError(null);
    try {
      const memberships = await withRetry(() => base44.entities.WorkspaceMember.filter({ user_id: user.id }));
      if (!memberships || memberships.length === 0) {
        setWorkspace(null);
        setMembership(null);
        setLoading(false);
        return;
      }
      const activeMembership = memberships[0];
      setMembership((prev) => (prev && JSON.stringify(prev) === JSON.stringify(activeMembership) ? prev : activeMembership));
      try {
        const ws = await withRetry(() => base44.entities.Workspace.get(activeMembership.workspace_id));
        // Unchanged → keep the very same object, so a quiet refresh can't reset a form someone is typing in.
        setWorkspace((prev) => (prev && JSON.stringify(prev) === JSON.stringify(ws) ? prev : ws));
        // Persist active workspace on the user so RLS scopes Client/Event queries.
        if (ws && syncedWorkspaceId.current !== ws.id) {
          try {
            await base44.auth.updateMe({ active_workspace_id: ws.id }, { silent: true });
            syncedWorkspaceId.current = ws.id;
          } catch (e) {
            /* non-fatal: RLS will fall back to empty results */
          }
        }
      } catch (e) {
        // A quiet refresh that fails (e.g. offline) keeps the copy already on screen.
        if (showLoading) {
          setError(e?.message || "Failed to load workspace");
          setWorkspace(null);
        }
      }
    } catch (e) {
      if (showLoading) {
        setError(e.message || "Failed to load workspace");
        setWorkspace(null);
      }
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  // Started from the saved copy: refresh it in the background (no loading screen).
  const refreshedFromCache = useRef(false);
  useEffect(() => {
    if (cached && !refreshedFromCache.current && authChecked && isAuthenticated && user?.id) {
      refreshedFromCache.current = true;
      resolve(false);
    }
  }, [cached, authChecked, isAuthenticated, user?.id, resolve]);

  useEffect(() => {
    if (workspace && user?.id) {
      lastLoaded = { userId: user.id, workspace, membership };
      writeSnapshot(lastLoaded);
    }
  }, [workspace, membership, user?.id]);

  useEffect(() => {
    if (authChecked && isAuthenticated && user?.id) {
      if (!workspace) {
        resolve();
      }
    } else if (authChecked && !isAuthenticated) {
      lastLoaded = null;
      writeSnapshot(null);
      setWorkspace(null);
      setMembership(null);
      setLoading(false);
    }
  }, [authChecked, isAuthenticated, user?.id, workspace, resolve]);

  // Keeping several devices in step (no live sync). Coming back to the app after a while away (installed PWA
  // resumed, tab re-opened): pull in what was changed on another device, showing "Syncing…". Nothing remounts on
  // resume, so without this the old copy stays on screen until the app is cleared. While the app is in view, the
  // same refresh also runs quietly when the window is clicked back into and once a minute (no capsule unless it fails).
  const resumeResolve = useRef(resolve);
  resumeResolve.current = resolve;
  useEffect(() => {
    if (!isAuthenticated || !user?.id) return undefined;
    let hiddenAt = 0;
    let lastRefresh = Date.now();
    const refresh = () => {
      lastRefresh = Date.now();
      resumeResolve.current(false);
      queryClientInstance.invalidateQueries(); // refetches what is on screen, marks the rest out of date
    };
    const quietRefresh = () => {
      if (document.visibilityState !== "visible" || navigator.onLine === false) return;
      if (Date.now() - lastRefresh < RESUME_REFRESH_AFTER_MS) return;
      refresh();
    };
    const onChange = () => {
      if (document.visibilityState === "hidden") { hiddenAt = Date.now(); return; }
      if (!hiddenAt || Date.now() - hiddenAt < RESUME_REFRESH_AFTER_MS) return;
      hiddenAt = 0;
      markResumed(); // before the refresh starts, so the capsule knows which data is old
      refresh();
    };
    const timer = setInterval(quietRefresh, OPEN_REFRESH_EVERY_MS);
    document.addEventListener("visibilitychange", onChange);
    window.addEventListener("focus", quietRefresh);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onChange);
      window.removeEventListener("focus", quietRefresh);
    };
  }, [isAuthenticated, user?.id]);

  // Keep the workspace's display-format preferences in sync with the shared
  // formatters (dates.js / utils/format.js) so every consumer — from event
  // cards to PDFs — reflects Preferences without threading `workspace` through
  // each call site. Runs whenever the active workspace loads or is updated.
  useEffect(() => {
    setDateFormat(workspace?.date_format);
    setNumberFormat(workspace?.number_format);
    setFyStartMonth(workspace?.fy_start_month);
    setExportBusinessName(workspace?.name);
  }, [workspace?.date_format, workspace?.number_format, workspace?.fy_start_month, workspace?.name]);

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