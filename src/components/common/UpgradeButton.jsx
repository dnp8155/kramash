import { Link } from "react-router-dom";
import Button from "@/components/common/Button";
import { useT } from "@/hooks/useT";

// The "Upgrade" button used by every upgrade prompt (usage cards, locked options, notes), so none of them is a bare text link.
export default function UpgradeButton({ label, className }) {
  const t = useT();
  return (
    <Link to="/plan" className={className ?? "shrink-0"}>
      <Button variant="outline" size="sm">{label || t("Upgrade")}</Button>
    </Link>
  );
}
