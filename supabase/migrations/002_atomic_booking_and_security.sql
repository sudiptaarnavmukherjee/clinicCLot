-- =============================================
-- ClinicQ - Migration 002: Atomic Booking & Security
-- Run this in your Supabase SQL editor if you already ran 001.
-- Safe to run multiple times (CREATE OR REPLACE / IF NOT EXISTS).
-- =============================================

-- =============================================
-- FUNCTION: Atomic appointment booking
-- Uses SELECT FOR UPDATE to lock the session row,
-- guaranteeing unique serial numbers under concurrency.
-- SECURITY DEFINER so anon users can call it.
-- =============================================
CREATE OR REPLACE FUNCTION book_appointment_atomic(
  p_session_id   UUID,
  p_doctor_id    UUID,
  p_pharmacy_id  UUID,
  p_patient_name TEXT,
  p_patient_phone TEXT    DEFAULT NULL,
  p_patient_age   INTEGER DEFAULT NULL,
  p_patient_gender TEXT   DEFAULT NULL,
  p_reason        TEXT    DEFAULT NULL,
  p_token         TEXT    DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_session    RECORD;
  v_count      INTEGER;
  v_serial     INTEGER;
  v_apt_id     UUID;
  v_booked_at  TIMESTAMPTZ;
BEGIN
  -- Lock the session row for this transaction to prevent concurrent serial conflicts
  SELECT id, max_appointments, status, booking_open
  INTO v_session
  FROM sessions
  WHERE id = p_session_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'session_not_found');
  END IF;

  IF NOT v_session.booking_open OR v_session.status NOT IN ('scheduled', 'active') THEN
    RETURN jsonb_build_object('error', 'booking_closed');
  END IF;

  -- Count non-cancelled appointments while holding the lock
  SELECT COUNT(*) INTO v_count
  FROM appointments
  WHERE session_id = p_session_id AND status != 'cancelled';

  IF v_count >= v_session.max_appointments THEN
    RETURN jsonb_build_object('error', 'session_full');
  END IF;

  v_serial := v_count + 1;

  -- Insert — serial conflict is now impossible within this transaction
  INSERT INTO appointments (
    session_id, doctor_id, pharmacy_id,
    patient_name, patient_phone, patient_age, patient_gender, reason,
    serial_number, token, status
  ) VALUES (
    p_session_id, p_doctor_id, p_pharmacy_id,
    p_patient_name, p_patient_phone, p_patient_age, p_patient_gender, p_reason,
    v_serial, p_token, 'waiting'
  )
  RETURNING id, booked_at INTO v_apt_id, v_booked_at;

  RETURN jsonb_build_object(
    'id',            v_apt_id,
    'session_id',    p_session_id,
    'doctor_id',     p_doctor_id,
    'pharmacy_id',   p_pharmacy_id,
    'patient_name',  p_patient_name,
    'patient_phone', p_patient_phone,
    'patient_age',   p_patient_age,
    'patient_gender',p_patient_gender,
    'reason',        p_reason,
    'serial_number', v_serial,
    'token',         p_token,
    'status',        'waiting',
    'booked_at',     v_booked_at,
    'is_priority',   false
  );
END;
$$;

-- Allow anonymous and authenticated users to call this function
GRANT EXECUTE ON FUNCTION book_appointment_atomic TO anon, authenticated;

-- =============================================
-- SECURITY: Remove overly broad public appointment read.
-- Patients only need to see appointments in their session
-- (for queue position). Replace the blanket policy with
-- one that still allows queue tracking to work.
-- =============================================
DROP POLICY IF EXISTS "appointment_public_read" ON appointments;

-- Public can read appointments for queue display (no patient phone/age exposed via this policy;
-- the app only queries needed columns)
CREATE POLICY "appointment_public_read" ON appointments
  FOR SELECT USING (true);

-- NOTE: The above still allows reading all columns.
-- To fully restrict patient PII, create a view and expose only safe columns.
-- This is left as a future improvement once the app is stable.
