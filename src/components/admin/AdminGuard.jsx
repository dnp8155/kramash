import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import FullScreenSpinner from "@/components/FullScreenSpinner";

// Guards admin routes: only platform admins (user.role === "admin") may pass.
// Normal users entering /admin are redirected to the app home.
export default function AdminGuard() {
  const { user, isLoadingAuth } = useAuth();
  if (isLoadingAuth) return <FullScreenSpinner label="Checking access..." />;
  if (user?.role !== "admin") return <Navigate to="/" replace />;
  return <Outlet />;
}