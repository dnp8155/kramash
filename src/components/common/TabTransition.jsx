// Plain CSS fade, keyed by tab. It used to be an AnimatePresence "wait" exit-then-enter: if the exit animation never
// finished (a page that was backgrounded mid-switch, a quick double tap, a lazy tab still loading) the new tab was
// never mounted and the page stayed blank. A keyed div swaps the content instantly and cannot get stuck.
export default function TabTransition({ tabKey, children, className }) {
  return (
    <div key={tabKey} className={["motion-safe:animate-fade-in", className].filter(Boolean).join(" ")}>
      {children}
    </div>
  );
}
