import { Crown } from "lucide-react";
import { Link } from "react-router-dom";
import { useWorkspace } from "@/lib/WorkspaceContext";

const FREE_LIMIT = 5;

export default function UpgradeBanner({ used = 0 }) {
  const { workspace } = useWorkspace();
  const isPro = workspace?.plan_type === "pro";

  if (isPro) return null;

  const limit = FREE_LIMIT;
  const over = used >= limit;

  return (
    <div className="flex items-center gap-3 px-4 py-3 bg-warning/10 border border-warning/20 rounded-lg">
      <Crown className="w-4 h-4 text-warning shrink-0" />
      <p className="text-sm text-foreground">
        Free plan: {used} / {limit} events used —{" "}
        <Link to="/plan" className="font-medium text-warning underline">upgrade to Pro for unlimited</Link>.
      </p>
    </div>
  );
}