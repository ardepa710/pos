"use client";

import { useState } from "react";
import { Menu, X } from "lucide-react";
import { Sidebar } from "@/components/layout/Sidebar";

interface AppShellProps {
  children: React.ReactNode;
  businessName?: string;
  logoUrl?: string;
}

export function AppShell({ children, businessName, logoUrl }: AppShellProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-[var(--bg-base)]">
      {/* Desktop sidebar */}
      <div className="sidebar-desktop hidden sticky top-0 h-screen">
        <Sidebar businessName={businessName} logoUrl={logoUrl} />
      </div>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 flex">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setMobileOpen(false)}
          />
          {/* Sidebar panel */}
          <div className="relative z-50">
            <Sidebar onClose={() => setMobileOpen(false)} />
          </div>
        </div>
      )}

      {/* Main content area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile top bar */}
        <header className="topbar-mobile flex items-center gap-3 px-4 py-3 border-b border-[var(--border)] bg-[var(--bg-sidebar)]">
          <button
            onClick={() => setMobileOpen(true)}
            className="flex items-center justify-center w-9 h-9 rounded-[var(--radius)] border-none bg-transparent text-[var(--text-on-dark)] cursor-pointer"
            aria-label="Abrir menú"
          >
            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
          <div className="flex items-center gap-2">
            {logoUrl ? (
              <img
                src={logoUrl}
                alt={businessName ?? "Kolekto"}
                className="h-7 object-contain max-w-[120px]"
              />
            ) : (
              /* Kolekto brand fallback — PNG logo */
              <img
                src="/logo-horizontal.png"
                alt="Kolekto"
                className="h-7 object-contain"
              />
            )}
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 min-h-0 overflow-y-auto flex flex-col">
          {children}
        </main>
      </div>

      {/* Responsive styles via a style tag */}
      <style>{`
        @media (min-width: 768px) {
          .sidebar-desktop {
            display: block !important;
          }
          .topbar-mobile {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
}
