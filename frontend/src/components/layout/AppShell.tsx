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
        <Sidebar businessName={businessName} logoUrl={logoUrl} />
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
            {logoUrl ? (
              <img
                src={logoUrl}
                alt={businessName ?? "Kolekto"}
                style={{
                  height: "1.75rem",
                  objectFit: "contain",
                  maxWidth: "120px",
                }}
              />
            ) : (
              /* Kolekto brand fallback — PNG logo */
              <img
                src="/logo-horizontal.png"
                alt="Kolekto"
                style={{
                  height: "1.75rem",
                  objectFit: "contain",
                }}
              />
            )}
          </div>
        </header>

        {/* Page content */}
        <main
          style={{
            flex: 1,
            minHeight: 0,
            overflowY: "auto",
            display: "flex",
            flexDirection: "column",
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
