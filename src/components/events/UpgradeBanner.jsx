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
    <div className="flex items-center gap-3 px-4 py-3 bg-amber-50 border border-amber-200 rounded-lg">
      <Crown className="w-4 h-4 text-amber-600 shrink-0" />
      <p className="text-sm text-amber-900">
        Free plan: {used} / {limit} events used —{" "}
        <Link to="/plan" className="font-medium underline">upgrade to Pro for unlimited</Link>.
      </p>
    </div>
  );
}