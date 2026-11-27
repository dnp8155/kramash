import SegmentedTabs from "@/components/common/SegmentedTabs";
import { useAccessibilityPrefs, setAccessibilityPref, TEXT_SIZES, LOGO_TARGETS } from "@/lib/accessibilityPrefs";

const Beta = () => (
  <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-warning/15 text-warning">Beta</span>
);

// Saved on this device only, so a larger text size on a phone doesn't change the desktop.
export default function AccessibilitySection() {
  const { textSize, logoTarget } = useAccessibilityPrefs();

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <div className="bg-card border border-border rounded-[15px] p-4 space-y-3">
        <h3 className="text-sm font-semibold flex items-center gap-2">Text size <Beta /></h3>
        <p className="text-xs text-muted-foreground">Make text smaller or larger across the app. Some small labels may not change yet. Saved on this device only.</p>
        <SegmentedTabs items={TEXT_SIZES} value={textSize} onChange={(v) => setAccessibilityPref({ textSize: v })} layoutId="a11y-text-size" />
      </div>

      <div className="bg-card border border-border rounded-[15px] p-4 space-y-3">
        <h3 className="text-sm font-semibold">Logo tap</h3>
        <p className="text-xs text-muted-foreground">Choose where tapping the logo at the top takes you. Saved on this device only.</p>
        <SegmentedTabs items={LOGO_TARGETS} value={logoTarget} onChange={(v) => setAccessibilityPref({ logoTarget: v })} layoutId="a11y-logo-tap" />
      </div>
    </div>
  );
}
