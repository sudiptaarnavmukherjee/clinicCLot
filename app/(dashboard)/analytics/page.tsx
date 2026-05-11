import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import DashboardShell from "@/components/dashboard/DashboardShell";
import AnalyticsClient from "./AnalyticsClient";

export const metadata = { title: "Analytics" };

export default async function AnalyticsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: pharmacy } = await supabase.from("pharmacies").select("*").eq("user_id", user.id).single();
  if (!pharmacy) redirect("/register");

  // Last 7 days data
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const { data: appointments } = await supabase
    .from("appointments")
    .select("status, created_at, booked_at, completed_at, started_at")
    .eq("pharmacy_id", pharmacy.id)
    .gte("created_at", sevenDaysAgo.toISOString())
    .order("created_at");

  // Monthly totals
  const monthStart = new Date();
  monthStart.setDate(1);
  const { count: monthTotal } = await supabase
    .from("appointments")
    .select("*", { count: "exact", head: true })
    .eq("pharmacy_id", pharmacy.id)
    .gte("created_at", monthStart.toISOString());

  const { count: monthCompleted } = await supabase
    .from("appointments")
    .select("*", { count: "exact", head: true })
    .eq("pharmacy_id", pharmacy.id)
    .eq("status", "completed")
    .gte("created_at", monthStart.toISOString());

  return (
    <DashboardShell
      pharmacyName={pharmacy.name}
      pageTitle="Analytics"
      pageDescription="Insights to help you run a more efficient practice"
    >
      <AnalyticsClient
        appointments={appointments || []}
        monthTotal={monthTotal || 0}
        monthCompleted={monthCompleted || 0}
      />
    </DashboardShell>
  );
}
