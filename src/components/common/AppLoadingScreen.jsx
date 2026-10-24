// Single shared full-screen loading state used across auth check, workspace
// load, and lazy route transitions. This is a deliberate pixel match for the
// static #app-splash markup in index.html (same background, logo size,
// wordmark, spinner styling, and animation keyframes — see index.css) so the
// handoff from that instant pre-mount HTML splash to this React-rendered
// screen is invisible instead of a visible flick on refresh.
// The very same image as the static splash in index.html (already in the browser cache), so the handoff to this screen shows no pop.
const SPLASH_LOGO_URL = "/kramasha_logo_192x192.png";
import { useLayoutEffect, useRef, useState } from "react";
import { useT } from "@/hooks/useT";
import { justUpdatedRecently } from "@/hooks/usePWA";

// The entrance animation plays once per page load. The static splash in index.html has already played it, and this screen
// is often swapped for another copy of itself (auth check, then workspace, then a lazy route), so replaying it would
// flash the logo from invisible each time.
let entrancePlayed = false;
const EXIT_FADE_MS = 400;

export default function AppLoadingScreen({ label = "Loading your workspace…" }) {
  const t = useT();
  const rootRef = useRef(null);
  const [animate] = useState(() => {
    const play = !entrancePlayed && !document.getElementById("app-splash");
    entrancePlayed = true;
    return play;
  });
  const anim = (value) => (animate ? value : "none");

  // When this screen goes away, leave a copy of it behind that fades out over whatever replaces it (the app, or the
  // same screen again), instead of vanishing in one frame.
  useLayoutEffect(() => {
    const node = rootRef.current;
    return () => {
      if (!node || !node.isConnected) return;
      const ghost = node.cloneNode(true);
      ghost.style.zIndex = "9999";
      ghost.style.pointerEvents = "none";
      ghost.style.transition = `opacity ${EXIT_FADE_MS}ms ease-out`;
      ghost.querySelectorAll("*").forEach((el) => { el.style.animation = "none"; });
      document.body.appendChild(ghost);
      requestAnimationFrame(() => requestAnimationFrame(() => { ghost.style.opacity = "0"; }));
      window.setTimeout(() => ghost.remove(), EXIT_FADE_MS + 100);
    };
  }, []);
  // Right after "Update now" the app restarts; say so instead of "Loading your workspace…".
  if (label === "Loading your workspace…" && justUpdatedRecently()) label = "Updating Kramasha…";
  return (
    <div
      ref={rootRef}
      className="fixed inset-0 flex flex-col items-center justify-center z-40"
      style={{ background: "#F5F3EF" }}
    >
      <div
        style={{
          width: 72,
          height: 72,
          borderRadius: 16,
          overflow: "hidden",
          animation: anim("app-splash-fade-in 0.5s ease-out both"),
        }}
      >
        <img
          src={SPLASH_LOGO_URL}
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
          animation: anim("app-splash-fade-in 0.5s ease-out 0.1s both"),
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
          animation: anim("app-splash-fade-in 0.5s ease-out 0.18s both"),
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
