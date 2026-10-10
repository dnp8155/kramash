import { Link } from "react-router-dom";
import { ArrowLeft, ShieldAlert, ShieldCheck } from "lucide-react";
import Logo from "@/components/common/Logo";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/AuthContext";

export default function Unauthorized() {
  const { isAuthenticated } = useAuth();

  return (
    <div className="min-h-screen flex bg-background">
      <div className="flex-1 flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md space-y-6">
          <Link to="/" className="flex items-center justify-center gap-2.5">
            <Logo size={40} className="rounded-xl" />
            <div>
              <div className="font-heading text-xl font-bold tracking-tight text-foreground leading-none">Kramasha</div>
              <div className="text-[11px] text-muted-foreground leading-none mt-1">Built for Creative Businesses</div>
            </div>
          </Link>

          <div className="text-center space-y-3">
            <div className="text-6xl font-bold text-foreground/10 font-heading tracking-tight">401</div>
            <div>
              <h1 className="text-2xl font-bold text-foreground font-heading">Access denied</h1>
              <p className="text-sm text-muted-foreground mt-1">
                You don't have permission to view this page.
              </p>
            </div>
          </div>

          <div className="bg-card border border-border rounded-2xl shadow-md p-6 space-y-3">
            <Button asChild className="w-full h-12 rounded-xl text-sm font-semibold">
              <Link to={isAuthenticated ? "/dashboard" : "/login"}>
                {isAuthenticated ? "Go to Dashboard" : "Log In"}
              </Link>
            </Button>
            <Button asChild variant="outline" className="w-full h-12 rounded-xl text-sm font-semibold">
              <Link to="/">Go to Homepage</Link>
            </Button>
          </div>

          <div className="text-center">
            <Link to="/help" className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
              <ArrowLeft className="w-3 h-3" /> Think this is a mistake? Visit Help & Support
            </Link>
          </div>
        </div>
      </div>

      <div className="hidden lg:flex flex-1 max-w-[640px] border-l border-border bg-[#F5F3EF] items-center justify-center p-10 overflow-hidden relative">
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-72 h-72 rounded-full bg-[#C8A95E]/10 blur-3xl" />
        </div>
        <div className="relative w-full max-w-[380px] bg-white border border-[#E8E3DB] rounded-3xl shadow-xl p-10 flex flex-col items-center text-center">
          <div className="w-20 h-20 rounded-2xl bg-[#2D4899] flex items-center justify-center shadow-lg mb-6">
            <ShieldAlert className="w-10 h-10 text-white" strokeWidth={1.75} />
          </div>
          <h3 className="text-lg font-bold text-[#1A1A1A]">Restricted area</h3>
          <p className="text-sm text-[#8A8580] mt-2 max-w-[260px]">
            This section is limited to specific accounts or roles. Switch accounts or head back to somewhere you have access.
          </p>
          <div className="flex items-center gap-2 mt-6 px-4 py-2 rounded-full bg-[#F5F3EF] border border-[#E8E3DB]">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="text-xs font-medium text-[#1A1A1A]">Your account stays secure</span>
          </div>
        </div>
      </div>
    </div>
  );
}
