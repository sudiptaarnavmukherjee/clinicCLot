import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const pharmacyId = searchParams.get("pharmacy_id");
  const phone = searchParams.get("phone");

  if (!pharmacyId || !phone) {
    return NextResponse.json({ error: "Missing pharmacy_id or phone" }, { status: 400 });
  }

  const supabase = await createClient();

  // Get today's sessions for this pharmacy
  const now = new Date();
  const toDate = (d: Date) => d.toISOString().split("T")[0];
  const yesterday = new Date(now); yesterday.setUTCDate(now.getUTCDate() - 1);
  const tomorrow = new Date(now); tomorrow.setUTCDate(now.getUTCDate() + 1);

  const { data: sessions } = await supabase
    .from("sessions")
    .select("id, doctor_id, date, start_time, end_time")
    .eq("pharmacy_id", pharmacyId)
    .gte("date", toDate(yesterday))
    .lte("date", toDate(tomorrow))
    .in("status", ["active", "scheduled", "paused"]);

  if (!sessions || sessions.length === 0) {
    return NextResponse.json({ appointments: [] });
  }

  const sessionIds = sessions.map((s) => s.id);

  // Find appointments by phone in those sessions
  const { data: appointments } = await supabase
    .from("appointments")
    .select("*")
    .in("session_id", sessionIds)
    .eq("patient_phone", phone)
    .not("status", "in", '("cancelled","completed")')
    .order("serial_number");

  if (!appointments || appointments.length === 0) {
    return NextResponse.json({ appointments: [] });
  }

  // For each appointment, calculate queue position and estimated wait
  const enriched = await Promise.all(
    appointments.map(async (apt) => {
      const session = sessions.find((s) => s.id === apt.session_id);
      
      // Count how many are ahead (waiting/called/in-progress with lower serial)
      const { count } = await supabase
        .from("appointments")
        .select("id", { count: "exact", head: true })
        .eq("session_id", apt.session_id)
        .in("status", ["waiting", "called", "in-progress"])
        .lt("serial_number", apt.serial_number);

      const queuePosition = count ?? 0;
      
      return {
        ...apt,
        queue_position: queuePosition,
        estimated_wait: queuePosition * 10, // basic 10 min per patient estimate
        session,
      };
    })
  );

  return NextResponse.json({ appointments: enriched });
}
