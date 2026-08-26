import { useState } from "react";
import SettingsNav from "@/components/settings/SettingsNav";
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
  const [active, setActive] = useState("profile");
  const ActiveComponent = sections.find((s) => s.id === active)?.component || ProfileSection;

  return (
    <div className="p-4 sm:p-6 max-w-[1200px] mx-auto">
      <h1 className="text-2xl font-bold mb-5">Settings</h1>
      <div className="flex flex-col lg:flex-row gap-6">
        <SettingsNav sections={sections} active={active} onSelect={setActive} />
        <div className="flex-1 min-w-0">
          <ActiveComponent />
        </div>
      </div>
    </div>
  );
}