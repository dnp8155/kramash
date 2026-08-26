import { useAuth } from "@/lib/AuthContext";

export default function ProfileSection() {
  const { user } = useAuth();

  return (
    <div className="bg-card border border-border rounded-lg p-5 max-w-lg">
      <h3 className="text-sm font-semibold mb-4">Profile</h3>
      <div className="flex items-center gap-3 mb-5">
        <div className="w-14 h-14 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-primary-foreground font-bold text-xl shrink-0">
          {(user?.full_name || user?.email || "K").charAt(0).toUpperCase()}
        </div>
        <div className="min-w-0">
          <div className="font-semibold text-sm truncate">{user?.full_name || "User"}</div>
          <div className="text-xs text-muted-foreground truncate">{user?.email}</div>
        </div>
      </div>
      <div className="space-y-0">
        <Row label="Full Name" value={user?.full_name || "—"} />
        <Row label="Email" value={user?.email || "—"} />
        <Row label="Role" value={user?.role || "—"} />
      </div>
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-border last:border-0">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <span className="text-sm text-foreground truncate ml-3">{value}</span>
    </div>
  );
}