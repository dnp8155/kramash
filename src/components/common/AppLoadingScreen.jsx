// Single shared full-screen loading state used across auth check, workspace
// load, and lazy route transitions. This is a deliberate pixel match for the
// static #app-splash markup in index.html (same background, logo size,
// wordmark, spinner styling, and animation keyframes — see index.css) so the
// handoff from that instant pre-mount HTML splash to this React-rendered
// screen is invisible instead of a visible flick on refresh.
import { LOGO_URL } from "@/components/common/Logo";
import { useT } from "@/hooks/useT";

export default function AppLoadingScreen({ label = "Loading your workspace…" }) {
  const t = useT();
  return (
    <div
      className="fixed inset-0 flex flex-col items-center justify-center z-40"
      style={{ background: "#F5F3EF" }}
    >
      <div
        style={{
          width: 72,
          height: 72,
          borderRadius: 16,
          overflow: "hidden",
          animation: "app-splash-fade-in 0.5s ease-out both",
        }}
      >
        <img
          src={LOGO_URL}
          alt="Kramasha"
          draggable={false}
          style={{ width: "100%", height: "100%", objectFit: "contain" }}
        />
      </div>
      <div
        style={{
          marginTop: 16,
          fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
          fontSize: "1.25rem",
          fontWeight: 700,
          letterSpacing: "-0.02em",
          color: "#1A1A1A",
          animation: "app-splash-fade-in 0.5s ease-out 0.1s both",
        }}
      >
        Kramasha
      </div>
      <div
        style={{
          marginTop: 6,
          fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
          fontSize: "0.8rem",
          fontWeight: 500,
          letterSpacing: "0.01em",
          color: "#8A8580",
          animation: "app-splash-fade-in 0.5s ease-out 0.18s both",
        }}
      >
        {t(label)}
      </div>
      <div
        style={{
          marginTop: 28,
          width: 28,
          height: 28,
          border: "3px solid #E8E3DB",
          borderTopColor: "#C8A95E",
          borderRadius: "50%",
          animation: "app-splash-spin 0.7s linear infinite",
        }}
      />
    </div>
  );
}
