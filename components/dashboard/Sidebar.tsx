"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard, Users2, CalendarDays, Activity,
  BarChart3, Settings, LogOut, X, QrCode, Menu
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/queue", label: "Live Queue", icon: Activity, badge: "LIVE" },
  { href: "/doctors", label: "Doctors", icon: Users2 },
  { href: "/sessions", label: "Sessions", icon: CalendarDays },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/settings", label: "Settings", icon: Settings },
];

interface SidebarProps {
  pharmacyName: string;
  onClose?: () => void;
  mobile?: boolean;
}

export default function Sidebar({ pharmacyName, onClose, mobile }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    toast.success("Signed out successfully");
    router.push("/login");
    router.refresh();
  }

  return (
    <aside className={cn(
      "flex flex-col h-full bg-white border-r border-border",
      mobile ? "w-full" : "w-64"
    )}>
      {/* Logo */}
      <div className="flex items-center justify-between p-5 border-b border-border">
        <Link href="/dashboard" className="flex items-center gap-2.5">
          <div className="w-9 h-9 bg-gradient-to-br from-blue-600 to-teal-600 rounded-xl flex items-center justify-center shadow-sm">
            <Activity className="w-4.5 h-4.5 text-white w-5 h-5" />
          </div>
          <div>
            <p className="font-bold text-foreground text-sm leading-none">ClinicQ</p>
            <p className="text-xs text-muted-foreground mt-0.5 truncate max-w-[120px]">{pharmacyName}</p>
          </div>
        </Link>
        {mobile && (
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onClose}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200",
                isActive
                  ? "bg-gradient-to-r from-blue-600 to-teal-600 text-white shadow-sm shadow-blue-500/20"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <item.icon className="w-4.5 h-4.5 flex-shrink-0 w-5 h-5" />
              <span className="flex-1">{item.label}</span>
              {item.badge && (
                <span className={cn(
                  "text-[10px] font-bold px-1.5 py-0.5 rounded-full",
                  isActive ? "bg-white/20 text-white" : "bg-green-100 text-green-700"
                )}>
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Bottom actions */}
      <div className="p-4 border-t border-border space-y-2">
        <Link
          href="/settings?tab=booking-link"
          onClick={onClose}
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-all"
        >
          <QrCode className="w-5 h-5" />
          Booking QR Code
        </Link>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-red-600 hover:bg-red-50 transition-all"
        >
          <LogOut className="w-5 h-5" />
          Sign Out
        </button>
      </div>
    </aside>
  );
}

export function MobileSidebarToggle({ onOpen }: { onOpen: () => void }) {
  return (
    <button
      onClick={onOpen}
      className="p-2 rounded-xl hover:bg-muted transition-colors"
      aria-label="Open menu"
    >
      <Menu className="w-5 h-5 text-muted-foreground" />
    </button>
  );
}
