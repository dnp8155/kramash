import { Crown } from "lucide-react";
import { planUsage } from "@/data/mockEvents";
import { Link } from "react-router-dom";

export default function UpgradeBanner() {
  return (
    <div className="flex items-center gap-3 px-4 py-3 bg-amber-50 border border-amber-200 rounded-lg">
      <Crown className="w-4 h-4 text-amber-600 shrink-0" />
      <p className="text-sm text-amber-900">
        {planUsage.label}: {planUsage.used} / {planUsage.limit} events used —{" "}
        <Link to="/plan" className="font-medium underline">upgrade to Pro for unlimited</Link>.
      </p>
    </div>
  );
}