-- 005_recurring_sessions_per_day.sql
-- Creates recurring_sessions (if not exists) with per-day schema.
-- Also handles upgrading from the old days_of_week[] schema (migration 004).

-- Step 1: Create table if it doesn't exist yet (fresh installs / 004 never run)
CREATE TABLE IF NOT EXISTS recurring_sessions (
  id                UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  pharmacy_id       UUID        NOT NULL REFERENCES pharmacies(id) ON DELETE CASCADE,
  doctor_id         UUID        NOT NULL REFERENCES doctors(id)    ON DELETE CASCADE,
  day_of_week       INTEGER     NOT NULL DEFAULT 0, -- 0=Sun 1=Mon 2=Tue 3=Wed 4=Thu 5=Fri 6=Sat
  start_time        TIME        NOT NULL,
  end_time          TIME        NOT NULL,
  max_appointments  INTEGER     NOT NULL DEFAULT 30,
  is_active         BOOLEAN     NOT NULL DEFAULT true,
  notes             TEXT,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

-- Step 2: Track which sessions were auto-generated from a recurring template
ALTER TABLE sessions
  ADD COLUMN IF NOT EXISTS recurring_session_id UUID
  REFERENCES recurring_sessions(id) ON DELETE SET NULL;

-- Step 3: If upgrading from old schema — drop days_of_week[] and add day_of_week
DO $$
BEGIN
  -- Drop old array column if it exists
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'recurring_sessions' AND column_name = 'days_of_week'
  ) THEN
    ALTER TABLE recurring_sessions DROP COLUMN days_of_week;
  END IF;

  -- Add day_of_week if it somehow doesn't exist yet
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'recurring_sessions' AND column_name = 'day_of_week'
  ) THEN
    ALTER TABLE recurring_sessions ADD COLUMN day_of_week INTEGER NOT NULL DEFAULT 0;
  END IF;
END $$;

-- Step 4: Unique constraint (one time slot per doctor per day)
ALTER TABLE recurring_sessions
  DROP CONSTRAINT IF EXISTS recurring_sessions_doctor_day_unique;

ALTER TABLE recurring_sessions
  ADD CONSTRAINT recurring_sessions_doctor_day_unique
  UNIQUE (pharmacy_id, doctor_id, day_of_week);

-- Step 5: RLS
ALTER TABLE recurring_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Owners manage recurring_sessions" ON recurring_sessions;
CREATE POLICY "Owners manage recurring_sessions"
  ON recurring_sessions FOR ALL
  USING (pharmacy_id IN (SELECT id FROM pharmacies WHERE user_id = auth.uid()));

GRANT SELECT, INSERT, UPDATE, DELETE ON recurring_sessions TO authenticated;
GRANT SELECT ON recurring_sessions TO anon;
