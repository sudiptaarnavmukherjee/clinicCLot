import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import DashboardShell from "@/components/dashboard/DashboardShell";
import QueueClient from "./QueueClient";

export const metadata = { title: "Live Queue" };

export default async function QueuePage({
  searchParams,
}: {
  searchParams: Promise<{ session?: string }>;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: pharmacy } = await supabase
    .from("pharmacies")
    .select("*")
    .eq("user_id", user.id)
    .single();

  if (!pharmacy) redirect("/register");

  const params = await searchParams;
  const today = new Date().toISOString().split("T")[0];

  // Fetch sessions for today + any active session passed in URL
  const { data: sessions } = await supabase
    .from("sessions")
    .select("*, doctors(id, name, specialty, avg_consultation_duration)")
    .eq("pharmacy_id", pharmacy.id)
    .eq("date", today)
    .neq("status", "cancelled")
    .order("start_time");

  const selectedSessionId = params.session || sessions?.[0]?.id || null;

  // Fetch appointments for selected session
  let appointments = [];
  if (selectedSessionId) {
    const { data } = await supabase
      .from("appointments")
      .select("*")
      .eq("session_id", selectedSessionId)
      .neq("status", "cancelled")
      .order("serial_number");
    appointments = data || [];
  }

  return (
    <DashboardShell
      pharmacyName={pharmacy.name}
      pageTitle="Live Queue"
      pageDescription="Real-time patient queue management"
    >
      <QueueClient
        pharmacy={pharmacy}
        sessions={sessions || []}
        initialAppointments={appointments}
        initialSessionId={selectedSessionId}
      />
    </DashboardShell>
  );
}
