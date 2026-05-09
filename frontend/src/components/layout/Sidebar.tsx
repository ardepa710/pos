"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  ShoppingCart,
  Package,
  Users,
  Truck,
  ShoppingBag,
  Gift,
  RotateCcw,
  BarChart2,
  Settings,
  LogOut,
} from "lucide-react";
import { t } from "@/lib/i18n";
import { useAuthStore } from "@/store/auth";

// Role access matrix — which roles can see each nav item.
// cashier  : POS + Customers (lookup during sales)
// supervisor: everything except Settings
// admin    : everything
type Role = "admin" | "supervisor" | "cashier";

const navItems: {
  href: string;
  icon: React.ElementType;
  label: string;
  roles: Role[];
}[] = [
  {
    href: "/pos",
    icon: ShoppingCart,
    label: t.nav.pos,
    roles: ["admin", "supervisor", "cashier"],
  },
  {
    href: "/catalog",
    icon: Package,
    label: t.nav.catalog,
    roles: ["admin", "supervisor", "cashier"],
  },
  {
    href: "/customers",
    icon: Users,
    label: t.nav.customers,
    roles: ["admin", "supervisor", "cashier"],
  },
  {
    href: "/suppliers",
    icon: Truck,
    label: t.nav.suppliers,
    roles: ["admin", "supervisor"],
  },
  {
    href: "/purchases",
    icon: ShoppingBag,
    label: t.nav.purchases,
    roles: ["admin", "supervisor"],
  },
  {
    href: "/gift-cards",
    icon: Gift,
    label: t.nav.gift_cards,
    roles: ["admin", "supervisor"],
  },
  {
    href: "/returns",
    icon: RotateCcw,
    label: t.nav.returns,
    roles: ["admin", "supervisor", "cashier"],
  },
  {
    href: "/reports",
    icon: BarChart2,
    label: t.nav.reports,
    roles: ["admin", "supervisor"],
  },
  {
    href: "/settings",
    icon: Settings,
    label: t.nav.settings,
    roles: ["admin"],
  },
];

const roleBadgeMap: Record<string, string> = {
  admin: "Administrador",
  supervisor: "Supervisor",
  cashier: "Cajero",
};

interface SidebarProps {
  onClose?: () => void;
  businessName?: string;
  logoUrl?: string;
}

export function Sidebar({ onClose, businessName, logoUrl }: SidebarProps) {
  const pathname = usePathname();
  const { user, clearAuth } = useAuthStore();

  function handleLogout() {
    clearAuth();
  }

  return (
    <aside className="w-60 h-screen flex flex-col bg-[var(--bg-sidebar)] border-r border-[var(--border)] shrink-0">
      {/* Header — logo or business name */}
      <div className="px-4 py-5 border-b border-white/8 flex items-center gap-2.5 min-h-16">
        {logoUrl ? (
          <img
            src={logoUrl}
            alt={businessName ?? "Kolekto"}
            className="h-8 object-contain max-w-40"
          />
        ) : (
          /* Kolekto brand fallback — PNG logo */
          <img
            src="/logo-horizontal.png"
            alt="Kolekto"
            className="h-8 object-contain"
          />
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-2">
        {navItems
          .filter(({ roles }) => !user || roles.includes(user.role as Role))
          .map(({ href, icon: Icon, label }) => {
            const isActive =
              href === "/pos"
                ? pathname === "/pos" || pathname === "/"
                : pathname.startsWith(href);

            return (
              <Link
                key={href}
                href={href}
                onClick={onClose}
                className={cn(
                  "flex items-center gap-3 mx-2 px-3 py-2.5 rounded-[var(--radius)] text-sm no-underline",
                  "border-l-[3px] transition-colors",
                  isActive
                    ? "font-semibold text-[var(--text-on-sidebar-active)] bg-[var(--bg-sidebar-active)] border-l-[var(--accent)]"
                    : "font-normal text-[var(--text-on-sidebar)] border-transparent hover:bg-[var(--bg-sidebar-item)]",
                )}
              >
                <Icon size={18} className="shrink-0" />
                <span>{label}</span>
              </Link>
            );
          })}
      </nav>

      {/* Footer — user info + logout */}
      <div className="px-4 py-3 border-t border-white/8">
        {user && (
          <div className="mb-2 flex flex-col gap-1">
            <span className="text-sm font-semibold text-[var(--text-on-dark)] truncate">
              {user.full_name || user.username}
            </span>
            <span className="inline-block text-[0.6875rem] font-semibold px-2 py-0.5 rounded-full bg-[var(--accent-subtle)] text-[var(--accent)] w-fit">
              {roleBadgeMap[user.role] ?? user.role}
            </span>
          </div>
        )}

        <button
          onClick={handleLogout}
          className="flex items-center gap-2 w-full px-3 py-2 rounded-[var(--radius)] border-none bg-transparent text-[var(--text-on-sidebar)] text-sm cursor-pointer transition-colors hover:bg-[var(--error-subtle)] hover:text-[var(--error)]"
        >
          <LogOut size={16} />
          <span>Cerrar sesión</span>
        </button>
      </div>
    </aside>
  );
}
