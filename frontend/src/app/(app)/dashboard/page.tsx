"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { DashboardHome } from "@/components/dashboard/DashboardHome";

export default function DashboardPage() {
  const { user } = useAuth();
  const router = useRouter();
  // Dashboard is for admin/supervisor; cashiers go to the POS (their flow,
  // and they can't read the report data the dashboard shows).
  const allowed = user?.role === "admin" || user?.role === "supervisor";

  useEffect(() => {
    if (user && !allowed) router.replace("/pos");
  }, [user, allowed, router]);

  if (!user || !allowed) return null;
  return <DashboardHome />;
}
