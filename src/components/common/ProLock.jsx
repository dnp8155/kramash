import { cn } from "@/lib/utils";
import { useFeatureGate } from "@/components/common/ProGate";
import ProTag from "@/components/common/ProTag";

// Wraps a Pro-only section (portals, public links...). On the Free plan the section is shown faded with the PRO tag,
// and tapping it explains the Pro plan (upgrade dialog), the same as the locked options in Preferences. Pro users
// get the section untouched. `unlocked` keeps it usable when the feature is already switched on (e.g. after a
// downgrade) so it can still be turned off.
export default function ProLock({ feature, label, unlocked = false, className, children }) {
  const { hasFeature, checkFeature, FeatureGateDialog, loading } = useFeatureGate();
  if (loading || unlocked || hasFeature(feature)) return children;
  return (
    <div className={cn("relative", className)}>
      <span className="absolute -top-2 right-3 z-10 rounded bg-card"><ProTag /></span>
      <div role="button" tabIndex={0} aria-label={label} className="cursor-pointer opacity-60"
        onClick={() => checkFeature(feature, label)}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); checkFeature(feature, label); } }}>
        <div className="pointer-events-none" aria-hidden="true" inert="">{children}</div>
      </div>
      {FeatureGateDialog}
    </div>
  );
}
