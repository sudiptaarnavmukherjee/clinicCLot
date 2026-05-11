import { NextRequest, NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";

// --- Simple in-memory rate limiter (per IP, resets on cold start) ---
// For production scale, replace with Upstash Redis.
const RATE_LIMIT_WINDOW_MS = 60_000; // 1 minute
const RATE_LIMIT_MAX = 5;            // max 5 bookings per IP per minute
const ipBuckets = new Map<string, { count: number; resetAt: number }>();

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const bucket = ipBuckets.get(ip);
  if (!bucket || now >= bucket.resetAt) {
    ipBuckets.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return false;
  }
  if (bucket.count >= RATE_LIMIT_MAX) return true;
  bucket.count++;
  return false;
}

// --- Input validation ---
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const PHONE_RE = /^[\d\s+\-().]{7,20}$/;
const VALID_GENDERS = new Set(["male", "female", "other"]);

function validate(body: Record<string, unknown>): string | null {
  const { session_id, doctor_id, pharmacy_id, patient_name, token } = body;

  if (
    !session_id || !UUID_RE.test(String(session_id)) ||
    !doctor_id  || !UUID_RE.test(String(doctor_id))  ||
    !pharmacy_id || !UUID_RE.test(String(pharmacy_id))
  ) return "Invalid request";

  if (!token || typeof token !== "string" || token.length < 4 || token.length > 24) {
    return "Invalid token";
  }

  const name = String(patient_name ?? "").trim();
  if (!name) return "Patient name is required";
  if (name.length > 255) return "Name is too long";

  const phone = String(body.patient_phone ?? "").trim();
  if (phone && !PHONE_RE.test(phone)) return "Invalid phone number";

  const age = body.patient_age;
  if (age !== null && age !== undefined && age !== "") {
    const n = Number(age);
    if (!Number.isFinite(n) || !Number.isInteger(n) || n < 1 || n > 149) {
      return "Age must be between 1 and 149";
    }
  }

  const gender = body.patient_gender;
  if (gender && !VALID_GENDERS.has(String(gender))) return "Invalid gender value";

  const reason = String(body.reason ?? "").trim();
  if (reason.length > 500) return "Reason is too long (max 500 characters)";

  return null;
}

// --- Error messages for RPC error codes ---
const RPC_ERRORS: Record<string, { status: number; message: string }> = {
  session_not_found: { status: 404, message: "Session not found" },
  booking_closed:    { status: 409, message: "This session is no longer accepting bookings" },
  session_full:      { status: 409, message: "This session is full. No more bookings available." },
};

export async function POST(request: NextRequest) {
  // Rate limit by IP
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
    request.headers.get("x-real-ip") ??
    "unknown";
  if (isRateLimited(ip)) {
    return NextResponse.json(
      { error: "Too many requests. Please wait a minute before trying again." },
      { status: 429 }
    );
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const validationError = validate(body);
  if (validationError) {
    return NextResponse.json({ error: validationError }, { status: 400 });
  }

  const {
    session_id, doctor_id, pharmacy_id,
    patient_name, patient_phone, patient_age, patient_gender, reason, token,
  } = body as Record<string, unknown>;

  const supabase = await createClient();

  // Single atomic RPC call — uses SELECT FOR UPDATE inside the function
  const { data, error } = await supabase.rpc("book_appointment_atomic", {
    p_session_id:    session_id,
    p_doctor_id:     doctor_id,
    p_pharmacy_id:   pharmacy_id,
    p_patient_name:  String(patient_name).trim(),
    p_patient_phone: patient_phone ? String(patient_phone).trim() : null,
    p_patient_age:   patient_age !== null && patient_age !== "" ? Number(patient_age) : null,
    p_patient_gender: patient_gender || null,
    p_reason:        reason ? String(reason).trim() : null,
    p_token:         token,
  });

  if (error) {
    // RPC function may not exist yet (migration not applied) — fall back to direct insert
    if (error.code === "42883" || error.message?.includes("book_appointment_atomic")) {
      return await directInsertFallback({
        session_id, doctor_id, pharmacy_id,
        patient_name, patient_phone, patient_age, patient_gender, reason, token,
      });
    }
    return NextResponse.json({ error: "Booking failed. Please try again." }, { status: 500 });
  }

  // RPC returns { error: "code" } or the appointment object
  const result = data as Record<string, unknown>;
  if (result.error) {
    const mapped = RPC_ERRORS[String(result.error)];
    if (mapped) return NextResponse.json({ error: mapped.message }, { status: mapped.status });
    return NextResponse.json({ error: "Booking failed. Please try again." }, { status: 500 });
  }

  return NextResponse.json({ appointment: result });
}

// Fallback: direct insert used when the atomic RPC function is not deployed yet.
// Uses the service-role admin client to bypass RLS.
async function directInsertFallback(params: Record<string, unknown>): Promise<NextResponse> {
  try {
    const admin = await createAdminClient();
    const { session_id, doctor_id, pharmacy_id,
            patient_name, patient_phone, patient_age, patient_gender, reason, token } = params;

    // Verify session exists, is open, and has capacity
    const { data: session, error: sessionErr } = await admin
      .from("sessions")
      .select("id, max_appointments, status, booking_open")
      .eq("id", session_id)
      .single();

    if (sessionErr || !session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }
    if (!session.booking_open || !["scheduled", "active", "paused"].includes(session.status)) {
      return NextResponse.json({ error: "This session is no longer accepting bookings" }, { status: 409 });
    }

    // Count current non-cancelled appointments
    const { count } = await admin
      .from("appointments")
      .select("*", { count: "exact", head: true })
      .eq("session_id", session_id)
      .neq("status", "cancelled");

    const currentCount = count ?? 0;
    if (currentCount >= session.max_appointments) {
      return NextResponse.json({ error: "This session is full. No more bookings available." }, { status: 409 });
    }

    const serial = currentCount + 1;

    const { data: apt, error: insertErr } = await admin
      .from("appointments")
      .insert({
        session_id, doctor_id, pharmacy_id,
        patient_name: String(patient_name).trim(),
        patient_phone: patient_phone ? String(patient_phone).trim() : null,
        patient_age: patient_age !== null && patient_age !== "" ? Number(patient_age) : null,
        patient_gender: patient_gender || null,
        reason: reason ? String(reason).trim() : null,
        serial_number: serial,
        token,
        status: "waiting",
      })
      .select()
      .single();

    if (insertErr) {
      // Unique constraint violation — serial conflict, retry with max+1
      if (insertErr.code === "23505") {
        const { data: maxRow } = await admin
          .from("appointments")
          .select("serial_number")
          .eq("session_id", session_id)
          .neq("status", "cancelled")
          .order("serial_number", { ascending: false })
          .limit(1)
          .single();
        const retrySerial = (maxRow?.serial_number ?? 0) + 1;
        const { data: retryApt, error: retryErr } = await admin
          .from("appointments")
          .insert({ session_id, doctor_id, pharmacy_id,
            patient_name: String(patient_name).trim(),
            patient_phone: patient_phone ? String(patient_phone).trim() : null,
            patient_age: patient_age !== null && patient_age !== "" ? Number(patient_age) : null,
            patient_gender: patient_gender || null,
            reason: reason ? String(reason).trim() : null,
            serial_number: retrySerial, token, status: "waiting" })
          .select().single();
        if (retryErr) return NextResponse.json({ error: "Booking failed. Please try again." }, { status: 500 });
        return NextResponse.json({ appointment: retryApt });
      }
      return NextResponse.json({ error: "Booking failed. Please try again." }, { status: 500 });
    }

    return NextResponse.json({ appointment: apt });
  } catch {
    return NextResponse.json({ error: "Booking failed. Please try again." }, { status: 500 });
  }
}
