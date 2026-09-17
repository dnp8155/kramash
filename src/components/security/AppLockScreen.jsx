import { useState } from "react";
import { useAuth } from "@/lib/AuthContext";
import { verifyPassword } from "@/lib/appLockPassword";
import { Lock, Loader2, Eye, EyeOff } from "lucide-react";
import Logo from "@/components/common/Logo";
import Button from "@/components/common/Button";

function getUserField(user, field, defaultValue) {
  if (user && user[field] !== undefined && user[field] !== null) return user[field];
  if (user?.data && user.data[field] !== undefined && user.data[field] !== null) return user.data[field];
  return defaultValue;
}

export default function AppLockScreen({ onUnlock }) {
  const { user } = useAuth();
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const storedHash = getUserField(user, "app_lock_password_hash", "");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const ok = await verifyPassword(password, storedHash);
      if (!ok) {
        setError("Incorrect password. Please try again.");
        setPassword("");
        return;
      }
      onUnlock();
    } catch (err) {
      setError("Unlock failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-sm text-center space-y-6">
        <div className="flex justify-center">
          <Logo size="md" />
        </div>

        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
          <Lock className="w-8 h-8 text-primary" />
        </div>

        <div>
          <h1 className="text-xl font-bold text-foreground">App Locked</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Enter your password to unlock the app.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoFocus
              autoComplete="off"
              placeholder="Password"
              className="w-full h-11 px-4 pr-11 rounded-lg border border-border bg-card text-foreground text-center text-base tracking-widest focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
            <button
              type="button"
              onClick={() => setShowPassword((s) => !s)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              tabIndex={-1}
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>

          {error && (
            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          <Button type="submit" variant="primary" size="lg" disabled={loading || !password} className="w-full">
            {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Unlocking…</> : "Unlock"}
          </Button>
        </form>
      </div>
    </div>
  );
}