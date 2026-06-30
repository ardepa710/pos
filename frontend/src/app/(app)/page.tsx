"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { DashboardHome } from "@/components/dashboard/DashboardHome";

export default function Home() {
  const { user } = useAuth();
  const router = useRouter();
  // Admin/supervisor land on the dashboard; cashiers go straight to the POS
  // (their job — and they can't read the report data the dashboard shows).
  const canSeeDashboard = user?.role === "admin" || user?.role === "supervisor";

  useEffect(() => {
    if (user && !canSeeDashboard) router.replace("/pos");
  }, [user, canSeeDashboard, router]);

  if (!user || !canSeeDashboard) return null;
  return <DashboardHome />;
}
