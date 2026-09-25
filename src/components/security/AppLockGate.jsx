import AppLockScreen from "@/components/security/AppLockScreen";

export default function AppLockGate({ isLocked, unlock, children }) {
  if (isLocked) return <AppLockScreen onUnlock={unlock} />;
  return children;
}
