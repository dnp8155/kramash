import { Link, useLocation } from "react-router-dom";
import { ArrowLeft, Compass, MapPinOff } from "lucide-react";
import Logo from "@/components/common/Logo";
import { Button } from "@/components/ui/button";

export default function PageNotFound() {
  const location = useLocation();
  const pageName = location.pathname.substring(1);

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
            <div className="text-6xl font-bold text-foreground/10 font-heading tracking-tight">404</div>
            <div>
              <h1 className="text-2xl font-bold text-foreground font-heading">Page not found</h1>
              <p className="text-sm text-muted-foreground mt-1">
                {pageName ? <>We couldn't find <span className="font-medium text-foreground">"/{pageName}"</span>.</> : "We couldn't find that page."}
              </p>
            </div>
          </div>

          <div className="bg-card border border-border rounded-2xl shadow-md p-6 space-y-3">
            <Button asChild className="w-full h-12 rounded-xl text-sm font-semibold">
              <Link to="/dashboard">Go to Dashboard</Link>
            </Button>
            <Button asChild variant="outline" className="w-full h-12 rounded-xl text-sm font-semibold">
              <Link to="/">Go to Homepage</Link>
            </Button>
          </div>

          <div className="text-center">
            <Link to="/help" className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
              <ArrowLeft className="w-3 h-3" /> Need help? Visit Help & Support
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
            <MapPinOff className="w-10 h-10 text-white" strokeWidth={1.75} />
          </div>
          <h3 className="text-lg font-bold text-[#1A1A1A]">Lost your way?</h3>
          <p className="text-sm text-[#8A8580] mt-2 max-w-[260px]">
            The page you're looking for may have moved or never existed. Let's get you back on track.
          </p>
          <div className="flex items-center gap-2 mt-6 px-4 py-2 rounded-full bg-[#F5F3EF] border border-[#E8E3DB]">
            <Compass className="w-4 h-4 text-[#2D4899] shrink-0" />
            <span className="text-xs font-medium text-[#1A1A1A]">Your data is safe and unaffected</span>
          </div>
        </div>
      </div>
    </div>
  );
}
