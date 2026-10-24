import { useNavigate } from "react-router-dom";
import Logo from "@/components/common/Logo";
import { useAccessibilityPrefs, LOGO_TARGETS } from "@/lib/accessibilityPrefs";
import { useT } from "@/hooks/useT";

// Logo that opens the Dashboard or Events page, per the "Logo tap" accessibility option.
export default function HomeLogo({ size, className }) {
  const t = useT();
  const navigate = useNavigate();
  const { logoTarget } = useAccessibilityPrefs();
  const target = LOGO_TARGETS.find((l) => l.value === logoTarget);
  if (!target?.path) return <Logo size={size} className={className} />;
  return (
    <button type="button" onClick={() => navigate(target.path)} aria-label={`${t("Go to")} ${target.label}`} className="rounded-lg shrink-0">
      <Logo size={size} className={className} />
    </button>
  );
}
