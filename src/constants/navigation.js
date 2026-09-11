import {
  LayoutDashboard,
  CalendarDays,
  CalendarRange,
  Users,
  UserCheck,
  UserPlus,
  Wallet,
  Calculator,
  FileText,
  Receipt,
  PenLine,
  SlidersHorizontal,
  Smartphone,
  Crown,
  Grid,
  ChevronDown,
  LifeBuoy,
  Headphones
} from "lucide-react";

export const mainNav = [
  { label: "Dashboard", path: "/dashboard", icon: LayoutDashboard },
  { label: "Events", path: "/events", icon: CalendarDays },
  { label: "Calendar", path: "/calendar", icon: CalendarRange },
  { label: "Clients", path: "/clients", icon: Users },
  { label: "Leads", path: "/leads", icon: UserPlus },
  { label: "Team", path: "/team", icon: UserCheck },
  { label: "Financial", path: "/financial", icon: Wallet },
  { label: "Quotation & Agreement", path: "/quotation", icon: FileText },
  { label: "Invoices", path: "/invoices", icon: Receipt },
  { label: "Help & Support", path: "/help", icon: Headphones }
];

export const moreNav = [
  { label: "Rate Estimator", path: "/rate-estimator", icon: Calculator },
  { label: "Sign a PDF", path: "/sign-pdf", icon: PenLine },
  { label: "Preferences", path: "/preferences", icon: SlidersHorizontal },
  { label: "App & Updates", path: "/app-updates", icon: Smartphone },
  { label: "Your Plan", path: "/plan", icon: Crown }
];

export const moreGroup = { label: "More", icon: Grid, caret: ChevronDown };