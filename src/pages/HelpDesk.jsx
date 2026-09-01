import PageHeader from "@/components/common/PageHeader";
import FeatureGuide from "@/components/help/FeatureGuide";
import { BookOpen } from "lucide-react";
import { useT } from "@/hooks/useT";

export default function HelpDesk() {
  const t = useT();
  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-[1400px] mx-auto">
      <PageHeader
        title={t("Help Desk")}
        subtitle={t("Browse all features and learn how to use them step by step")}
        icon={BookOpen}
      />
      <FeatureGuide />
    </div>
  );
}