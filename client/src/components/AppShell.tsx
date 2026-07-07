import { useState } from "react";
import type { ReactNode } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  MessageCircle,
  Users,
  ShoppingCart,
  CalendarClock,
  Package,
  Megaphone,
  Settings as SettingsIcon,
  Sun,
  Moon,
  Menu,
  X,
  LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useTheme } from "@/hooks/useTheme";
import { trpc } from "@/lib/trpc";

const NAV_ITEMS = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/chat", label: "Live Chat", icon: MessageCircle },
  { to: "/contacts", label: "Contacts", icon: Users },
  { to: "/orders", label: "Orders", icon: ShoppingCart },
  { to: "/appointments", label: "Appointments", icon: CalendarClock },
  { to: "/products", label: "Products", icon: Package },
  { to: "/broadcast", label: "Broadcast", icon: Megaphone },
  { to: "/settings", label: "Settings", icon: SettingsIcon },
];

export function AppShell({ children }: { children: ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { theme, toggle } = useTheme();
  const navigate = useNavigate();
  const utils = trpc.useUtils();
  const logout = trpc.auth.logout.useMutation({
    onSuccess: () => {
      utils.auth.me.setData(undefined, null);
      navigate("/login");
    },
  });

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-navy-900">
      {mobileOpen && (
        <div className="fixed inset-0 z-40 bg-black/40 md:hidden" onClick={() => setMobileOpen(false)} />
      )}

      <aside
        className={cn(
          "fixed z-50 flex h-full w-64 flex-col border-r border-slate-200 bg-white transition-transform dark:border-navy-800/60 dark:bg-navy-900 md:static md:translate-x-0",
          mobileOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex items-center justify-between px-4 py-5">
          <div>
            <p className="text-sm font-semibold text-navy-900 dark:text-slate-100">น้องแคร์ AI</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">บ้านเด็ก คลินิก</p>
          </div>
          <button className="md:hidden" onClick={() => setMobileOpen(false)} aria-label="ปิดเมนู">
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 space-y-1 px-3">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              onClick={() => setMobileOpen(false)}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-accent-600/10 text-accent-700 dark:text-accent-600"
                    : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-navy-800/60",
                )
              }
            >
              <item.icon className="h-4 w-4 shrink-0" />
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-slate-100 p-3 dark:border-navy-800/60">
          <button
            onClick={() => logout.mutate()}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-navy-800/60"
          >
            <LogOut className="h-4 w-4" />
            ออกจากระบบ
          </button>
        </div>
      </aside>

      <div className="flex min-h-screen flex-1 flex-col md:pl-0">
        <header className="sticky top-0 z-30 flex items-center justify-between border-b border-slate-200 bg-white/80 px-4 py-3 backdrop-blur dark:border-navy-800/60 dark:bg-navy-900/80">
          <button className="md:hidden" onClick={() => setMobileOpen(true)} aria-label="เปิดเมนู">
            <Menu className="h-5 w-5 text-navy-900 dark:text-slate-100" />
          </button>
          <div className="hidden md:block" />
          <button
            onClick={toggle}
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-navy-800/60"
            aria-label="สลับธีม"
          >
            {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </button>
        </header>
        <main className="flex-1 p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
