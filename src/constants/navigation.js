import {
  CalendarDays,
  Users,
  Wallet,
  Calculator,
  FileText,
  PenLine,
  SlidersHorizontal,
  Smartphone,
  Crown,
  Grid,
  ChevronDown
} from "lucide-react";

export const mainNav = [
  { label: "Events", path: "/events", icon: CalendarDays },
  { label: "Team", path: "/team", icon: Users },
  { label: "Financial", path: "/financial", icon: Wallet }
];

export const moreNav = [
  { label: "Rate Estimator", path: "/rate-estimator", icon: Calculator },
  { label: "Quotation & Agreement", path: "/quotation", icon: FileText },
  { label: "Sign a PDF", path: "/sign-pdf", icon: PenLine },
  { label: "Preferences", path: "/preferences", icon: SlidersHorizontal },
  { label: "App & Updates", path: "/app-updates", icon: Smartphone },
  { label: "Your Plan", path: "/plan", icon: Crown }
];

export const moreGroup = { label: "More", icon: Grid, caret: ChevronDown };