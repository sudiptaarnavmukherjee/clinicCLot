-- =============================================
-- DOCTOR RECURRING SCHEDULES
-- Which days each doctor works on a regular basis
-- 0=Sunday, 1=Monday, ... 6=Saturday
-- =============================================
CREATE TABLE IF NOT EXISTS doctor_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id UUID NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
  pharmacy_id UUID NOT NULL REFERENCES pharmacies(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  max_appointments INTEGER DEFAULT 30 CHECK (max_appointments > 0 AND max_appointments <= 500),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(doctor_id, day_of_week)
);

CREATE INDEX IF NOT EXISTS idx_doctor_schedules_doctor_id ON doctor_schedules(doctor_id);
CREATE INDEX IF NOT EXISTS idx_doctor_schedules_pharmacy_id ON doctor_schedules(pharmacy_id);
CREATE INDEX IF NOT EXISTS idx_doctor_schedules_day ON doctor_schedules(day_of_week);

CREATE TRIGGER doctor_schedules_updated_at
  BEFORE UPDATE ON doctor_schedules
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE doctor_schedules ENABLE ROW LEVEL SECURITY;

-- Clinic owners manage their schedules
CREATE POLICY "schedule_owner_all" ON doctor_schedules
  FOR ALL USING (
    pharmacy_id IN (SELECT id FROM pharmacies WHERE user_id = auth.uid())
  );

-- Public can read schedules (for booking page display)
CREATE POLICY "schedule_public_read" ON doctor_schedules
  FOR SELECT USING (true);

GRANT SELECT ON doctor_schedules TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON doctor_schedules TO authenticated;
