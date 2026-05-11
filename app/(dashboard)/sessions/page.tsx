import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import DashboardShell from "@/components/dashboard/DashboardShell";
import SessionsClient from "./SessionsClient";

export const metadata = { title: "Sessions" };

export default async function SessionsPage() {
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

  // Last 30 days sessions
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const { data: sessions } = await supabase
    .from("sessions")
    .select(`
      *,
      doctors(id, name, specialty),
      appointments(status)
    `)
    .eq("pharmacy_id", pharmacy.id)
    .gte("date", thirtyDaysAgo.toISOString().split("T")[0])
    .order("date", { ascending: false })
    .order("start_time", { ascending: false });

  return (
    <DashboardShell
      pharmacyName={pharmacy.name}
      pageTitle="Sessions"
      pageDescription="Schedule and manage doctor availability sessions"
    >
      <SessionsClient pharmacy={pharmacy} doctors={doctors || []} initialSessions={sessions || []} />
    </DashboardShell>
  );
}
