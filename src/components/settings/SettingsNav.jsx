import { User, Building2, Palette, Bell, CreditCard, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";

const icons = {
  profile: User,
  workspace: Building2,
  appearance: Palette,
  notifications: Bell,
  billing: CreditCard,
  session: LogOut,
};

export default function SettingsNav({ sections, active, onSelect }) {
  return (
    <nav className="w-full lg:w-52 shrink-0">
      <div className="flex lg:flex-col gap-1 overflow-x-auto lg:overflow-visible pb-2 lg:pb-0 scrollbar-thin">
        {sections.map((s) => {
          const Icon = icons[s.id] || User;
          return (
            <button
              key={s.id}
              onClick={() => onSelect(s.id)}
              className={cn(
                "flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm whitespace-nowrap transition-colors",
                active === s.id
                  ? "bg-primary/10 text-primary font-semibold"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <Icon className="w-4 h-4 shrink-0" />
              {s.label}
            </button>
          );
        })}
      </div>
    </nav>
  );
}