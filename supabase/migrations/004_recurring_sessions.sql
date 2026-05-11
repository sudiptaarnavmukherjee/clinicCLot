-- 004_recurring_sessions.sql
-- Recurring session templates that auto-generate daily sessions

CREATE TABLE IF NOT EXISTS recurring_sessions (
  id                UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  pharmacy_id       UUID        NOT NULL REFERENCES pharmacies(id) ON DELETE CASCADE,
  doctor_id         UUID        NOT NULL REFERENCES doctors(id)   ON DELETE CASCADE,
  days_of_week      INTEGER[]   NOT NULL DEFAULT '{}', -- 0=Sun 1=Mon 2=Tue 3=Wed 4=Thu 5=Fri 6=Sat
  start_time        TIME        NOT NULL,
  end_time          TIME        NOT NULL,
  max_appointments  INTEGER     NOT NULL DEFAULT 30,
  is_active         BOOLEAN     NOT NULL DEFAULT true,
  notes             TEXT,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

-- Track which sessions were auto-generated from a recurring template
ALTER TABLE sessions
  ADD COLUMN IF NOT EXISTS recurring_session_id UUID
  REFERENCES recurring_sessions(id) ON DELETE SET NULL;

-- RLS
ALTER TABLE recurring_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners manage recurring_sessions"
  ON recurring_sessions FOR ALL
  USING (pharmacy_id IN (SELECT id FROM pharmacies WHERE user_id = auth.uid()));

GRANT SELECT, INSERT, UPDATE, DELETE ON recurring_sessions TO authenticated;
GRANT SELECT ON recurring_sessions TO anon;
