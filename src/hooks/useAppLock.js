import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/lib/AuthContext";

const UNLOCK_KEY = "kramasha_app_unlocked";
const ACTIVITY_KEY = "kramasha_last_activity";

function getUserField(user, field, defaultValue) {
  if (user && user[field] !== undefined && user[field] !== null) return user[field];
  if (user?.data && user.data[field] !== undefined && user.data[field] !== null) return user.data[field];
  return defaultValue;
}

// Shared app-lock state — single source of truth so the lock screen and the
// rest of the layout (e.g. the mobile nav bar) never disagree about whether
// the app is currently locked.
export function useAppLock() {
  const { user } = useAuth();
  const [locked, setLocked] = useState(false);
  const relockTimerRef = useRef(null);

  const appLockEnabled = getUserField(user, "app_lock_enabled", false);
  const relockAfter = Number(getUserField(user, "app_lock_relock_after", 0));

  useEffect(() => {
    if (!user || !appLockEnabled) { setLocked(false); return; }
    const unlocked = sessionStorage.getItem(UNLOCK_KEY);
    if (unlocked === "true") {
      if (relockAfter > 0) {
        const lastActivity = Number(sessionStorage.getItem(ACTIVITY_KEY) || Date.now());
        if (Date.now() - lastActivity > relockAfter * 60 * 1000) setLocked(true);
        else setLocked(false);
      } else setLocked(false);
    } else setLocked(true);
  }, [user, appLockEnabled, relockAfter]);

  useEffect(() => {
    if (locked || !appLockEnabled || relockAfter <= 0) {
      if (relockTimerRef.current) { clearTimeout(relockTimerRef.current); relockTimerRef.current = null; }
      return;
    }
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

  const unlock = () => {
    sessionStorage.setItem(UNLOCK_KEY, "true");
    sessionStorage.setItem(ACTIVITY_KEY, String(Date.now()));
    setLocked(false);
  };

  return { isLocked: !!(locked && user && appLockEnabled), unlock };
}
