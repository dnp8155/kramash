import {
  LayoutDashboard,
  CalendarDays,
  Users,
  UserPlus,
  UserCheck,
  Wallet,
  Calculator,
  FileText,
  Receipt,
  PenLine,
  SlidersHorizontal,
  Smartphone,
  Headphones,
  Info,
  LogOut
} from "lucide-react";

export const workspaceNav = [
  { label: "Dashboard", path: "/dashboard", icon: LayoutDashboard },
  { label: "Events", path: "/events", icon: CalendarDays },
  { label: "Clients", path: "/clients", icon: Users },
  { label: "Team", path: "/team", icon: UserCheck }
];

export const financeNav = [
  { label: "Financial", path: "/financial", icon: Wallet },
  { label: "Leads", path: "/leads", icon: UserPlus },
  { label: "Invoices", path: "/invoices", icon: Receipt }
];

export const toolsNav = [
  { label: "Quotation & Agreement", path: "/quotation", icon: FileText },
  { label: "Rate Estimator", path: "/rate-estimator", icon: Calculator },
  { label: "Sign a PDF", path: "/sign-pdf", icon: PenLine }
];

export const settingsNav = [
  { label: "Preferences", path: "/preferences", icon: SlidersHorizontal },
  { label: "App & Updates", path: "/app-updates", icon: Smartphone },
  { label: "Help & Support", path: "/help", icon: Headphones }
];

export const aboutLegalNav = { label: "About & Legal", path: "/app-updates", icon: Info };
export const logoutNav = { label: "Log out", icon: LogOut };

export const navGroups = [
  { label: "Workspace", items: workspaceNav },
  { label: "Finance", items: financeNav },
  { label: "Tools", items: toolsNav },
  { label: "Settings", items: settingsNav }
];