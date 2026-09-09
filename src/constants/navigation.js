import {
  LayoutDashboard,
  CalendarDays,
  Users,
  User,
  Wallet,
  Calculator,
  FileText,
  Settings,
  RefreshCw,
  CreditCard,
} from "lucide-react";

// Base navigation items. The workItems label is resolved dynamically
// via useBusinessTerminology() in the Sidebar/MobileNavigation components.
// The `labelKey` field indicates which terminology key to use.
export const navItems = [
  { label: "Dashboard", path: "/dashboard", icon: LayoutDashboard, labelKey: null },
  { label: "Events", path: "/events", icon: CalendarDays, labelKey: "workItemPlural" },
  { label: "Clients", path: "/clients", icon: User, labelKey: null },
  { label: "Team", path: "/team", icon: Users, labelKey: null },
  { label: "Financial", path: "/financial", icon: Wallet, labelKey: null },
  { label: "Rate Estimator", path: "/rate-estimator", icon: Calculator, labelKey: null },
  { label: "Quotation & Agreement", path: "/quotation", icon: FileText, labelKey: null },
  { label: "Preferences", path: "/preferences", icon: Settings, labelKey: null },
  { label: "App & Updates", path: "/app-updates", icon: RefreshCw, labelKey: null },
  { label: "Your Plan", path: "/plan", icon: CreditCard, labelKey: null },
];

export const workspaceName = "Kramashah";