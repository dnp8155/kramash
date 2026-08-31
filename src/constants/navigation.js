import {
  LayoutDashboard,
  CalendarDays,
  Users,
  UserCheck,
  Wallet,
  Calculator,
  FileText,
  PenLine,
  SlidersHorizontal,
  Smartphone,
  Crown,
  Grid,
  ChevronDown,
  Settings,
  User,
  Building2,
  Palette,
  Bell,
  CreditCard,
  KeyRound,
  LifeBuoy
} from "lucide-react";

export const mainNav = [
  { label: "Dashboard", path: "/dashboard", icon: LayoutDashboard },
  { label: "Events", path: "/events", icon: CalendarDays },
  { label: "Clients", path: "/clients", icon: Users },
  { label: "Team", path: "/team", icon: UserCheck },
  { label: "Financial", path: "/financial", icon: Wallet },
  { label: "Quotation & Agreement", path: "/quotation", icon: FileText },
  { label: "Help & Support", path: "/help", icon: LifeBuoy }
];

export const moreNav = [
  { label: "Rate Estimator", path: "/rate-estimator", icon: Calculator },
  { label: "Sign a PDF", path: "/sign-pdf", icon: PenLine },
  { label: "Preferences", path: "/preferences", icon: SlidersHorizontal },
  { label: "App & Updates", path: "/app-updates", icon: Smartphone },
  { label: "Your Plan", path: "/plan", icon: Crown }
];

export const settingsNav = [
  { label: "Profile", path: "/settings/profile", icon: User },
  { label: "Workspace", path: "/settings/workspace", icon: Building2 },
  { label: "Appearance", path: "/settings/appearance", icon: Palette },
  { label: "Notifications", path: "/settings/notifications", icon: Bell },
  { label: "Billing & Plan", path: "/settings/billing", icon: CreditCard },
  { label: "Session", path: "/settings/session", icon: KeyRound }
];

export const moreGroup = { label: "More", icon: Grid, caret: ChevronDown };
export const settingsGroup = { label: "Settings", icon: Settings, caret: ChevronDown };