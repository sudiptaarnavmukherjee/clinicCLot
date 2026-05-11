import { createClient as createServerClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import QueueTrackingClient from "./QueueTrackingClient";

interface Props {
  params: Promise<{ token: string }>;
}

export default async function QueueTrackingPage({ params }: Props) {
  const { token } = await params;
  const supabase = await createServerClient();

  // Fetch appointment by token
  const { data: appointment } = await supabase
    .from("appointments")
    .select("*, sessions(*), pharmacies(*), doctors(*)")
    .eq("token", token.toUpperCase())
    .single();

  if (!appointment) notFound();

  // Fetch all appointments in the same session for queue context
  const { data: sessionAppointments } = await supabase
    .from("appointments")
    .select("id, serial_number, status, patient_name, created_at")
    .eq("session_id", appointment.session_id)
    .neq("status", "cancelled")
    .order("serial_number", { ascending: true });

  return (
    <QueueTrackingClient
      initialAppointment={appointment}
      pharmacy={appointment.pharmacies}
      doctor={appointment.doctors}
      session={appointment.sessions}
      initialQueueList={sessionAppointments || []}
    />
  );
}
