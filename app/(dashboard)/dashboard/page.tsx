import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import DashboardShell from "@/components/dashboard/DashboardShell";
import DashboardClient from "./DashboardClient";

export const metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Fetch pharmacy
  const { data: pharmacy } = await supabase
    .from("pharmacies")
    .select("*")
    .eq("user_id", user.id)
    .single();

  if (!pharmacy) redirect("/register?setup=1");

  // Fetch sessions: use a ±1-day window around UTC now so any local-timezone date is captured
  const utcNow = new Date();
  const utcToday = utcNow.toISOString().split("T")[0];
  const utcYesterday = new Date(utcNow);
  utcYesterday.setUTCDate(utcNow.getUTCDate() - 1);
  const utcTomorrow = new Date(utcNow);
  utcTomorrow.setUTCDate(utcNow.getUTCDate() + 1);

  // Fetch today's sessions
  const { data: sessions } = await supabase
    .from("sessions")
    .select("*, doctors(name, specialty)")
    .eq("pharmacy_id", pharmacy.id)
    .gte("date", utcYesterday.toISOString().split("T")[0])
    .lte("date", utcTomorrow.toISOString().split("T")[0])
    .neq("status", "cancelled")
    .order("date")
    .order("start_time");

  // Fetch today's appointments (UTC window covers all local timezones)
  const { data: todayAppointments } = await supabase
    .from("appointments")
    .select("status, created_at")
    .eq("pharmacy_id", pharmacy.id)
    .gte("created_at", utcYesterday.toISOString().split("T")[0] + "T00:00:00.000Z")
    .lte("created_at", utcTomorrow.toISOString().split("T")[0] + "T23:59:59.999Z");

  // Fetch this month's count
  const monthStart = new Date();
  monthStart.setDate(1);
  const { count: monthCount } = await supabase
    .from("appointments")
    .select("*", { count: "exact", head: true })
    .eq("pharmacy_id", pharmacy.id)
    .gte("created_at", monthStart.toISOString());

  const stats = {
    today_total: todayAppointments?.length || 0,
    today_completed: todayAppointments?.filter((a) => a.status === "completed").length || 0,
    today_waiting: todayAppointments?.filter((a) => ["waiting", "called", "in-progress"].includes(a.status)).length || 0,
    today_skipped: todayAppointments?.filter((a) => ["skipped", "no-show"].includes(a.status)).length || 0,
    active_sessions: sessions?.filter((s) => s.status === "active").length || 0,
    total_this_month: monthCount || 0,
  };

  return (
    <DashboardShell
      pharmacyName={pharmacy.name}
      pageTitle="Dashboard"
      pageDescription={`Good ${new Date().getHours() < 12 ? "morning" : new Date().getHours() < 17 ? "afternoon" : "evening"}! Here's what's happening today.`}
    >
      <DashboardClient
        pharmacy={pharmacy}
        sessions={sessions || []}
        stats={stats}
      />
    </DashboardShell>
  );
}
