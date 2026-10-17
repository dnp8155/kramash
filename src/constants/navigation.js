import {
  LayoutDashboard,
  CalendarDays,
  Users,
  UserPlus,
  UserCheck,
  IdCard,
  Wallet,
  Calculator,
  FileText,
  ReceiptIndianRupee,
  PenLine,
  HardDrive,
  SlidersHorizontal,
  Smartphone,
  Headphones,
  Info,
  ShieldCheck,
  LogOut
} from "lucide-react";

export const workspaceNav = [
  { label: "Dashboard", path: "/dashboard", icon: LayoutDashboard },
  { label: "Events", path: "/events", icon: CalendarDays },
  { label: "Clients", path: "/clients", icon: Users },
  { label: "Team", path: "/team", icon: UserCheck }
];

// Sits on its own: above the Workspace group in the desktop sidebar, and above Your Plan on the mobile More page.
export const profileNav = { label: "My Profile", path: "/my-profile", icon: IdCard };

export const financeNav = [
  { label: "Financial", path: "/financial", icon: Wallet },
  { label: "Leads", path: "/leads", icon: UserPlus },
  { label: "Invoices", path: "/invoices", icon: ReceiptIndianRupee }
];

export const toolsNav = [
  { label: "Quotation & Agreement", path: "/quotation", icon: FileText },
  { label: "Rate Estimator", path: "/rate-estimator", icon: Calculator },
  { label: "Storage", path: "/storage", icon: HardDrive },
  { label: "Sign a PDF", path: "/sign-pdf", icon: PenLine }
];

export const settingsNav = [
  { label: "Preferences", path: "/preferences", icon: SlidersHorizontal },
  { label: "App & Updates", path: "/app-updates", icon: Smartphone },
  { label: "Help & Support", path: "/help", icon: Headphones }
];

export const aboutLegalNav = [
  { label: "About", path: "/about", icon: Info },
  { label: "Terms & Conditions", path: "/terms", icon: FileText },
  { label: "Privacy Policy", path: "/privacy", icon: ShieldCheck }
];
export const logoutNav = { label: "Log out", icon: LogOut };

export const navGroups = [
  { label: "Workspace", items: workspaceNav },
  { label: "Finance", items: financeNav },
  { label: "Tools", items: toolsNav },
  { label: "Settings", items: settingsNav }
];