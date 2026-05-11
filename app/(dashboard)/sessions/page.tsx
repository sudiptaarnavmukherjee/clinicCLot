import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import DashboardShell from "@/components/dashboard/DashboardShell";
import SessionsClient from "./SessionsClient";

export const metadata = { title: "Sessions" };

export default async function SessionsPage({
  searchParams,
}: {
  searchParams: Promise<{ new?: string }>;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: pharmacy } = await supabase.from("pharmacies").select("*").eq("user_id", user.id).single();
  if (!pharmacy) redirect("/register");

  const { data: doctors } = await supabase
    .from("doctors")
    .select("*")
    .eq("pharmacy_id", pharmacy.id)
    .eq("is_active", true)
    .order("sort_order");

  // Fetch recurring schedules
  const { data: recurringSessions } = await supabase
    .from("recurring_sessions")
    .select("*, doctors(id, name, specialty)")
    .eq("pharmacy_id", pharmacy.id)
    .order("created_at", { ascending: false });

  // Auto-generate today's sessions from active recurring schedules
  const now = new Date();
  const todayDow = now.getUTCDay(); // 0=Sun … 6=Sat
  const todayStr = now.toISOString().split("T")[0];

  const activeRecurring = (recurringSessions || []).filter(
    (rs) => rs.is_active && rs.day_of_week === todayDow
  );

  for (const rs of activeRecurring) {
    // Only insert if no session already exists for this doctor+date from this template
    const { data: existing } = await supabase
      .from("sessions")
      .select("id")
      .eq("pharmacy_id", pharmacy.id)
      .eq("doctor_id", rs.doctor_id)
      .eq("date", todayStr)
      .eq("recurring_session_id", rs.id)
      .maybeSingle();

    if (!existing) {
      await supabase.from("sessions").insert({
        pharmacy_id: pharmacy.id,
        doctor_id: rs.doctor_id,
        date: todayStr,
        start_time: rs.start_time,
        end_time: rs.end_time,
        max_appointments: rs.max_appointments,
        notes: rs.notes,
        status: "scheduled",
        booking_open: true,
        recurring_session_id: rs.id,
      });
    }
  }

  // Last 30 days sessions
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const { data: sessions } = await supabase
    .from("sessions")
    .select(`*, doctors(id, name, specialty), appointments(status)`)
    .eq("pharmacy_id", pharmacy.id)
    .gte("date", thirtyDaysAgo.toISOString().split("T")[0])
    .order("date", { ascending: false })
    .order("start_time", { ascending: false });

  const params = await searchParams;
  const openNew = params.new === "1";

  return (
    <DashboardShell
      pharmacyName={pharmacy.name}
      pageTitle="Sessions"
      pageDescription="Recurring schedules auto-generate daily sessions"
    >
      <SessionsClient
        pharmacy={pharmacy}
        doctors={doctors || []}
        initialSessions={sessions || []}
        initialRecurringSessions={recurringSessions || []}
        openNew={openNew}
      />
    </DashboardShell>
  );
}
