"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
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
  Store,
} from "lucide-react";
import { t } from "@/lib/i18n";
import { useAuthStore } from "@/store/auth";

const navItems = [
  { href: "/pos", icon: ShoppingCart, label: t.nav.sales },
  { href: "/catalog", icon: Package, label: t.nav.products },
  { href: "/customers", icon: Users, label: t.nav.customers },
  { href: "/suppliers", icon: Truck, label: t.nav.suppliers },
  { href: "/purchases", icon: ShoppingBag, label: t.nav.purchases },
  { href: "/gift-cards", icon: Gift, label: t.nav.giftCards },
  { href: "/returns", icon: RotateCcw, label: t.nav.returns },
  { href: "/reports", icon: BarChart2, label: t.nav.reports },
  { href: "/settings", icon: Settings, label: t.nav.settings },
];

const roleBadgeMap: Record<string, string> = {
  admin: "Administrador",
  supervisor: "Supervisor",
  cashier: "Cajero",
};

interface SidebarProps {
  onClose?: () => void;
}

export function Sidebar({ onClose }: SidebarProps) {
  const pathname = usePathname();
  const { user, clearAuth } = useAuthStore();

  function handleLogout() {
    clearAuth();
  }

  return (
    <aside
      style={{
        width: "240px",
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        backgroundColor: "var(--bg-sidebar)",
        borderRight: "1px solid var(--border)",
        flexShrink: 0,
      }}
    >
      {/* Header — business name */}
      <div
        style={{
          padding: "1.25rem 1rem",
          borderBottom: "1px solid rgba(255,255,255,0.08)",
          display: "flex",
          alignItems: "center",
          gap: "0.625rem",
        }}
      >
        <div
          style={{
            width: "2rem",
            height: "2rem",
            borderRadius: "var(--radius-sm)",
            backgroundColor: "var(--accent)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <Store size={16} color="white" />
        </div>
        <span
          style={{
            fontWeight: 700,
            fontSize: "0.9375rem",
            color: "var(--text-on-dark)",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          POS
        </span>
      </div>

      {/* Navigation */}
      <nav
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "0.5rem 0",
        }}
      >
        {navItems.map(({ href, icon: Icon, label }) => {
          const isActive =
            href === "/pos"
              ? pathname === "/pos" || pathname === "/"
              : pathname.startsWith(href);

          return (
            <Link
              key={href}
              href={href}
              onClick={onClose}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.75rem",
                padding: "0.625rem 1rem",
                margin: "0.125rem 0.5rem",
                borderRadius: "var(--radius)",
                textDecoration: "none",
                fontSize: "0.875rem",
                fontWeight: isActive ? 600 : 400,
                color: isActive
                  ? "var(--text-on-sidebar-active)"
                  : "var(--text-on-sidebar)",
                backgroundColor: isActive
                  ? "var(--bg-sidebar-active)"
                  : "transparent",
                borderLeft: isActive
                  ? "3px solid var(--accent)"
                  : "3px solid transparent",
                transition:
                  "background-color 150ms ease-in-out, color 150ms ease-in-out",
              }}
              onMouseEnter={(e) => {
                if (!isActive) {
                  (e.currentTarget as HTMLAnchorElement).style.backgroundColor =
                    "var(--bg-sidebar-item)";
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  (e.currentTarget as HTMLAnchorElement).style.backgroundColor =
                    "transparent";
                }
              }}
            >
              <Icon size={18} style={{ flexShrink: 0 }} />
              <span>{label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Footer — user info + logout */}
      <div
        style={{
          padding: "0.75rem 1rem",
          borderTop: "1px solid rgba(255,255,255,0.08)",
        }}
      >
        {user && (
          <div
            style={{
              marginBottom: "0.5rem",
              display: "flex",
              flexDirection: "column",
              gap: "0.25rem",
            }}
          >
            <span
              style={{
                fontSize: "0.875rem",
                fontWeight: 600,
                color: "var(--text-on-dark)",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {user.full_name || user.username}
            </span>
            <span
              style={{
                display: "inline-block",
                fontSize: "0.6875rem",
                fontWeight: 600,
                padding: "0.125rem 0.5rem",
                borderRadius: "9999px",
                backgroundColor: "var(--accent-subtle)",
                color: "var(--accent)",
                width: "fit-content",
              }}
            >
              {roleBadgeMap[user.role] ?? user.role}
            </span>
          </div>
        )}

        <button
          onClick={handleLogout}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            width: "100%",
            padding: "0.5rem 0.75rem",
            borderRadius: "var(--radius)",
            border: "none",
            backgroundColor: "transparent",
            color: "var(--text-on-sidebar)",
            fontSize: "0.875rem",
            cursor: "pointer",
            transition:
              "background-color 150ms ease-in-out, color 150ms ease-in-out",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.backgroundColor =
              "rgba(239, 68, 68, 0.15)";
            (e.currentTarget as HTMLButtonElement).style.color = "#ef4444";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.backgroundColor =
              "transparent";
            (e.currentTarget as HTMLButtonElement).style.color =
              "var(--text-on-sidebar)";
          }}
        >
          <LogOut size={16} />
          <span>Cerrar sesión</span>
        </button>
      </div>
    </aside>
  );
}
