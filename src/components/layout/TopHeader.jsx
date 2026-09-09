import { Menu, Search, Sun, Moon, LogOut, User as UserIcon, Settings } from "lucide-react";
import NotificationBell from "@/components/common/NotificationBell";
import { useTheme } from "@/lib/ThemeProvider";
import { useAuth } from "@/lib/AuthContext";
import { useWorkspace } from "@/lib/WorkspaceContext";
import { useNavigate } from "react-router-dom";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { initials } from "@/utils/format";

export default function TopHeader({ onMenuClick, title }) {
  const { theme, toggleTheme } = useTheme();
  const { user, logout } = useAuth();
  const { currentWorkspace } = useWorkspace();
  const navigate = useNavigate();

  const userInitials = initials(user?.full_name || user?.email || "U");
  const userName = user?.full_name || (user?.email ? user.email.split("@")[0] : "User");
  const planLabel = currentWorkspace?.plan_type
    ? `${currentWorkspace.plan_type[0].toUpperCase()}${currentWorkspace.plan_type.slice(1)} Plan`
    : "Free Plan";

  const handleLogout = () => {
    logout();
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border bg-background/80 px-4 backdrop-blur-md sm:px-6">
      <button
        onClick={onMenuClick}
        className="rounded-md p-2 text-muted-foreground hover:bg-muted lg:hidden"
        aria-label="Open menu"
      >
        <Menu className="h-5 w-5" />
      </button>

      <h2 className="hidden text-sm font-semibold text-foreground sm:block lg:text-base">{title}</h2>

      <div className="relative ml-auto hidden max-w-xs flex-1 md:block">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search events, clients…"
          className="h-10 w-full rounded-lg border border-input bg-card pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/30"
        />
      </div>

      <div className="ml-auto flex items-center gap-1 md:ml-3">
        <button
          onClick={toggleTheme}
          className="rounded-md p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          aria-label="Toggle theme"
        >
          {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
        </button>
        <NotificationBell />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="ml-2 flex items-center gap-2.5 rounded-lg border border-border bg-card py-1 pl-1 pr-2.5 transition-colors hover:bg-muted">
              <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-xs font-semibold text-primary-foreground">
                {userInitials}
              </div>
              <div className="hidden leading-tight sm:block">
                <p className="max-w-[120px] truncate text-xs font-semibold text-foreground">{userName}</p>
                <p className="text-[11px] text-muted-foreground">{planLabel}</p>
              </div>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel className="truncate">{user?.email || "Account"}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => navigate("/preferences")}>
              <UserIcon className="mr-2 h-4 w-4" /> <span>Workspace Settings</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate("/plan")}>
              <Settings className="mr-2 h-4 w-4" /> <span>Your Plan</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:text-destructive">
              <LogOut className="mr-2 h-4 w-4" /> <span>Log out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}