import {
  LayoutDashboard,
  CalendarDays,
  Users,
  Wallet,
  Calculator,
  FileText,
  Settings,
  RefreshCw,
  CreditCard,
} from "lucide-react";

export const navItems = [
  { label: "Dashboard", path: "/", icon: LayoutDashboard },
  { label: "Events", path: "/events", icon: CalendarDays },
  { label: "Team", path: "/team", icon: Users },
  { label: "Financial", path: "/financial", icon: Wallet },
  { label: "Rate Estimator", path: "/rate-estimator", icon: Calculator },
  { label: "Quotation & Agreement", path: "/quotation", icon: FileText },
  { label: "Preferences", path: "/preferences", icon: Settings },
  { label: "App & Updates", path: "/app-updates", icon: RefreshCw },
  { label: "Your Plan", path: "/plan", icon: CreditCard },
];

export const workspaceName = "Kramashah";