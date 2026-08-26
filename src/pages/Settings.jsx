import { useParams } from "react-router-dom";
import ProfileSection from "@/components/settings/ProfileSection";
import AppearanceSection from "@/components/settings/AppearanceSection";
import NotificationsSection from "@/components/settings/NotificationsSection";
import BillingSection from "@/components/settings/BillingSection";
import SessionSection from "@/components/settings/SessionSection";
import WorkspaceSettings from "@/components/settings/WorkspaceSettings";

const sections = [
  { id: "profile", label: "Profile", component: ProfileSection },
  { id: "workspace", label: "Workspace", component: WorkspaceSettings },
  { id: "appearance", label: "Appearance", component: AppearanceSection },
  { id: "notifications", label: "Notifications", component: NotificationsSection },
  { id: "billing", label: "Billing & Plan", component: BillingSection },
  { id: "session", label: "Session", component: SessionSection },
];

export default function Settings() {
  const { section } = useParams();
  const active = sections.find((s) => s.id === section)?.id || "profile";
  const ActiveComponent = sections.find((s) => s.id === active)?.component || ProfileSection;
  const activeLabel = sections.find((s) => s.id === active)?.label || "Settings";

  return (
    <div className="p-4 sm:p-6 max-w-[900px] mx-auto">
      <h1 className="text-2xl font-bold mb-1">Settings</h1>
      <p className="text-sm text-muted-foreground mb-5">{activeLabel}</p>
      <ActiveComponent />
    </div>
  );
}