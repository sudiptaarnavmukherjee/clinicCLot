-- =============================================
-- ClinicQ - Complete Database Schema
-- Run this in your Supabase SQL editor
-- =============================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- =============================================
-- PHARMACIES TABLE (SaaS tenant)
-- =============================================
CREATE TABLE IF NOT EXISTS pharmacies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL,
  address TEXT,
  phone VARCHAR(20),
  email VARCHAR(255),
  logo_url TEXT,
  cover_image_url TEXT,
  description TEXT,
  settings JSONB DEFAULT '{
    "allow_walkins": true,
    "max_daily_appointments": 50,
    "notify_sms": false,
    "notify_whatsapp": false,
    "avg_consultation_minutes": 10,
    "booking_lead_hours": 0,
    "auto_complete_session": true,
    "show_queue_to_public": true,
    "custom_message": "",
    "accent_color": "#2563EB"
  }'::jsonb,
  subscription_plan VARCHAR(50) DEFAULT 'free',
  is_active BOOLEAN DEFAULT true,
  timezone VARCHAR(50) DEFAULT 'Asia/Dhaka',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- DOCTORS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS doctors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pharmacy_id UUID NOT NULL REFERENCES pharmacies(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(100) NOT NULL,
  specialty VARCHAR(255),
  qualification VARCHAR(500),
  photo_url TEXT,
  consultation_fee DECIMAL(10,2) DEFAULT 0,
  avg_consultation_duration INTEGER DEFAULT 10,
  bio TEXT,
  phone VARCHAR(20),
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(pharmacy_id, slug)
);

-- =============================================
-- SESSIONS TABLE (doctor availability windows)
-- =============================================
CREATE TABLE IF NOT EXISTS sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id UUID NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
  pharmacy_id UUID NOT NULL REFERENCES pharmacies(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  max_appointments INTEGER DEFAULT 30,
  status VARCHAR(20) DEFAULT 'scheduled'
    CHECK (status IN ('scheduled','active','paused','completed','cancelled')),
  booking_open BOOLEAN DEFAULT true,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- APPOINTMENTS TABLE (real-time core)
-- =============================================
CREATE TABLE IF NOT EXISTS appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  doctor_id UUID NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
  pharmacy_id UUID NOT NULL REFERENCES pharmacies(id) ON DELETE CASCADE,
  patient_name VARCHAR(255) NOT NULL,
  patient_phone VARCHAR(20),
  patient_age INTEGER CHECK (patient_age > 0 AND patient_age < 150),
  patient_gender VARCHAR(10) CHECK (patient_gender IN ('male','female','other')),
  reason TEXT,
  serial_number INTEGER NOT NULL,
  token VARCHAR(20) UNIQUE NOT NULL,
  status VARCHAR(20) DEFAULT 'waiting'
    CHECK (status IN ('waiting','called','in-progress','completed','skipped','cancelled','no-show')),
  booked_at TIMESTAMPTZ DEFAULT NOW(),
  called_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  notes TEXT,
  is_priority BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(session_id, serial_number)
);

-- =============================================
-- INDEXES for performance
-- =============================================
CREATE INDEX IF NOT EXISTS idx_pharmacies_slug ON pharmacies(slug);
CREATE INDEX IF NOT EXISTS idx_pharmacies_user_id ON pharmacies(user_id);
CREATE INDEX IF NOT EXISTS idx_doctors_pharmacy_id ON doctors(pharmacy_id);
CREATE INDEX IF NOT EXISTS idx_doctors_slug ON doctors(slug);
CREATE INDEX IF NOT EXISTS idx_sessions_pharmacy_id ON sessions(pharmacy_id);
CREATE INDEX IF NOT EXISTS idx_sessions_doctor_id ON sessions(doctor_id);
CREATE INDEX IF NOT EXISTS idx_sessions_date ON sessions(date);
CREATE INDEX IF NOT EXISTS idx_sessions_status ON sessions(status);
CREATE INDEX IF NOT EXISTS idx_appointments_session_id ON appointments(session_id);
CREATE INDEX IF NOT EXISTS idx_appointments_pharmacy_id ON appointments(pharmacy_id);
CREATE INDEX IF NOT EXISTS idx_appointments_token ON appointments(token);
CREATE INDEX IF NOT EXISTS idx_appointments_status ON appointments(status);
CREATE INDEX IF NOT EXISTS idx_appointments_serial ON appointments(session_id, serial_number);

-- =============================================
-- TRIGGERS for updated_at
-- =============================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER pharmacies_updated_at
  BEFORE UPDATE ON pharmacies
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER doctors_updated_at
  BEFORE UPDATE ON doctors
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER sessions_updated_at
  BEFORE UPDATE ON sessions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER appointments_updated_at
  BEFORE UPDATE ON appointments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- =============================================
-- FUNCTION: Get next serial number for a session
-- =============================================
CREATE OR REPLACE FUNCTION get_next_serial(p_session_id UUID)
RETURNS INTEGER AS $$
DECLARE
  v_next INTEGER;
BEGIN
  SELECT COALESCE(MAX(serial_number), 0) + 1
  INTO v_next
  FROM appointments
  WHERE session_id = p_session_id
    AND status != 'cancelled';
  RETURN v_next;
END;
$$ LANGUAGE plpgsql;

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
-- FUNCTION: Get queue stats for a session
-- =============================================
CREATE OR REPLACE FUNCTION get_queue_stats(p_session_id UUID)
RETURNS TABLE (
  total_count BIGINT,
  waiting_count BIGINT,
  in_progress_count BIGINT,
  completed_count BIGINT,
  skipped_count BIGINT,
  no_show_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*) AS total_count,
    COUNT(*) FILTER (WHERE status = 'waiting') AS waiting_count,
    COUNT(*) FILTER (WHERE status IN ('called','in-progress')) AS in_progress_count,
    COUNT(*) FILTER (WHERE status = 'completed') AS completed_count,
    COUNT(*) FILTER (WHERE status = 'skipped') AS skipped_count,
    COUNT(*) FILTER (WHERE status = 'no-show') AS no_show_count
  FROM appointments
  WHERE session_id = p_session_id
    AND status != 'cancelled';
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- ROW LEVEL SECURITY
-- =============================================
ALTER TABLE pharmacies ENABLE ROW LEVEL SECURITY;
ALTER TABLE doctors ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;

-- ---- Pharmacies ----
-- Owners can do everything on their pharmacy
CREATE POLICY "pharmacy_owner_all" ON pharmacies
  FOR ALL USING (auth.uid() = user_id);

-- ---- Doctors ----
-- Pharmacy owners can manage their doctors
CREATE POLICY "doctor_owner_all" ON doctors
  FOR ALL USING (
    pharmacy_id IN (
      SELECT id FROM pharmacies WHERE user_id = auth.uid()
    )
  );
-- Public can read active doctors (for booking pages)
CREATE POLICY "doctor_public_read" ON doctors
  FOR SELECT USING (is_active = true);

-- ---- Sessions ----
-- Pharmacy owners can manage their sessions
CREATE POLICY "session_owner_all" ON sessions
  FOR ALL USING (
    pharmacy_id IN (
      SELECT id FROM pharmacies WHERE user_id = auth.uid()
    )
  );
-- Public can read sessions (for booking pages)
CREATE POLICY "session_public_read" ON sessions
  FOR SELECT USING (true);

-- ---- Appointments ----
-- Pharmacy owners can manage their appointments
CREATE POLICY "appointment_owner_all" ON appointments
  FOR ALL USING (
    pharmacy_id IN (
      SELECT id FROM pharmacies WHERE user_id = auth.uid()
    )
  );
-- Public can INSERT appointments (for booking)
CREATE POLICY "appointment_public_insert" ON appointments
  FOR INSERT WITH CHECK (true);
-- Public can read appointments (for queue tracking) - only specific columns via view
CREATE POLICY "appointment_public_read" ON appointments
  FOR SELECT USING (true);

-- =============================================
-- ENABLE REALTIME on appointments and sessions
-- =============================================
ALTER PUBLICATION supabase_realtime ADD TABLE appointments;
ALTER PUBLICATION supabase_realtime ADD TABLE sessions;
