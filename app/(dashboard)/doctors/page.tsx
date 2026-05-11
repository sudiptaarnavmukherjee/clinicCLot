import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import DashboardShell from "@/components/dashboard/DashboardShell";
import DoctorsClient from "./DoctorsClient";

export const metadata = { title: "Doctors" };

export default async function DoctorsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: pharmacy } = await supabase
    .from("pharmacies")
    .select("*")
    .eq("user_id", user.id)
    .single();

  if (!pharmacy) redirect("/register");

  const { data: doctors } = await supabase
    .from("doctors")
    .select("*")
    .eq("pharmacy_id", pharmacy.id)
    .order("sort_order")
    .order("created_at");

  const { data: schedules } = await supabase
    .from("doctor_schedules")
    .select("*")
    .eq("pharmacy_id", pharmacy.id)
    .order("day_of_week");

  return (
    <DashboardShell
      pharmacyName={pharmacy.name}
      pageTitle="Doctors"
      pageDescription="Manage doctors and their profiles"
    >
      <DoctorsClient pharmacy={pharmacy} initialDoctors={doctors || []} initialSchedules={schedules || []} />
    </DashboardShell>
  );
}
