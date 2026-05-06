"use client";

import { useState } from "react";
import { Menu, X, Store } from "lucide-react";
import { Sidebar } from "@/components/layout/Sidebar";

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div
      style={{
        display: "flex",
        minHeight: "100vh",
        backgroundColor: "var(--bg-base)",
      }}
    >
      {/* Desktop sidebar */}
      <div
        style={{
          display: "none",
          position: "sticky",
          top: 0,
          height: "100vh",
        }}
        className="sidebar-desktop"
      >
        <Sidebar />
      </div>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 40,
            display: "flex",
          }}
        >
          {/* Backdrop */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              backgroundColor: "rgba(0,0,0,0.5)",
            }}
            onClick={() => setMobileOpen(false)}
          />
          {/* Sidebar panel */}
          <div style={{ position: "relative", zIndex: 50 }}>
            <Sidebar onClose={() => setMobileOpen(false)} />
          </div>
        </div>
      )}

      {/* Main content area */}
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          minWidth: 0,
        }}
      >
        {/* Mobile top bar */}
        <header
          className="topbar-mobile"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.75rem",
            padding: "0.75rem 1rem",
            borderBottom: "1px solid var(--border)",
            backgroundColor: "var(--bg-sidebar)",
          }}
        >
          <button
            onClick={() => setMobileOpen(true)}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: "2.25rem",
              height: "2.25rem",
              borderRadius: "var(--radius)",
              border: "none",
              backgroundColor: "transparent",
              color: "var(--text-on-dark)",
              cursor: "pointer",
            }}
            aria-label="Abrir menú"
          >
            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
            }}
          >
            <Store size={18} color="var(--accent)" />
            <span
              style={{
                fontWeight: 700,
                fontSize: "0.9375rem",
                color: "var(--text-on-dark)",
              }}
            >
              POS
            </span>
          </div>
        </header>

        {/* Page content */}
        <main
          style={{
            flex: 1,
            overflowY: "auto",
          }}
        >
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
