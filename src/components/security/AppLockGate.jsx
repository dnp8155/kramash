import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/lib/AuthContext";
import AppLockScreen from "@/components/security/AppLockScreen";

const UNLOCK_KEY = "kramasha_app_unlocked";
const ACTIVITY_KEY = "kramasha_last_activity";

function getUserField(user, field, defaultValue) {
  if (user && user[field] !== undefined && user[field] !== null) return user[field];
  if (user?.data && user.data[field] !== undefined && user.data[field] !== null) return user.data[field];
  return defaultValue;
}

export default function AppLockGate({ children }) {
  const { user } = useAuth();
  const [locked, setLocked] = useState(false);
  const relockTimerRef = useRef(null);

  const appLockEnabled = getUserField(user, "app_lock_enabled", false);
  const relockAfter = Number(getUserField(user, "app_lock_relock_after", 0));

  useEffect(() => {
    if (!user) {
      setLocked(false);
      return;
    }
    if (!appLockEnabled) {
      setLocked(false);
      return;
    }
    // Check sessionStorage for unlock state
    const unlocked = sessionStorage.getItem(UNLOCK_KEY);
    if (unlocked === "true") {
      // Check re-lock timeout
      if (relockAfter > 0) {
        const lastActivity = Number(sessionStorage.getItem(ACTIVITY_KEY) || Date.now());
        const elapsed = Date.now() - lastActivity;
        if (elapsed > relockAfter * 60 * 1000) {
          setLocked(true);
        } else {
          setLocked(false);
        }
      } else {
        setLocked(false);
      }
    } else {
      setLocked(true);
    }
  }, [user, appLockEnabled, relockAfter]);

  // Set up re-lock timer
  useEffect(() => {
    if (locked || !appLockEnabled || relockAfter <= 0) {
      if (relockTimerRef.current) {
        clearTimeout(relockTimerRef.current);
        relockTimerRef.current = null;
      }
      return;
    }
    // Track activity and reset timer
    const resetTimer = () => {
      sessionStorage.setItem(ACTIVITY_KEY, String(Date.now()));
      if (relockTimerRef.current) clearTimeout(relockTimerRef.current);
      relockTimerRef.current = setTimeout(() => {
        sessionStorage.removeItem(UNLOCK_KEY);
        setLocked(true);
      }, relockAfter * 60 * 1000);
    };
    resetTimer();
    const events = ["mousedown", "keydown", "touchstart"];
    events.forEach((e) => window.addEventListener(e, resetTimer));
    return () => {
      events.forEach((e) => window.removeEventListener(e, resetTimer));
      if (relockTimerRef.current) clearTimeout(relockTimerRef.current);
    };
  }, [locked, appLockEnabled, relockAfter]);

  const handleUnlock = () => {
    sessionStorage.setItem(UNLOCK_KEY, "true");
    sessionStorage.setItem(ACTIVITY_KEY, String(Date.now()));
    setLocked(false);
  };

  // App Lock temporarily disabled — missing BASE44_APP_ID secret breaks WebAuthn.
  // Re-enable by restoring: if (locked && user && appLockEnabled) return <AppLockScreen onUnlock={handleUnlock} />;
  return children;
}