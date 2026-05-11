-- 005_recurring_sessions_per_day.sql
-- Restructure recurring_sessions: one row per doctor per day (enables different times per day)

-- Drop old integer-array column if it exists (from migration 004)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'recurring_sessions' AND column_name = 'days_of_week'
  ) THEN
    ALTER TABLE recurring_sessions DROP COLUMN days_of_week;
  END IF;
END $$;

-- Add single day_of_week column (0=Sun, 1=Mon, ..., 6=Sat) if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'recurring_sessions' AND column_name = 'day_of_week'
  ) THEN
    ALTER TABLE recurring_sessions ADD COLUMN day_of_week INTEGER NOT NULL DEFAULT 0;
  END IF;
END $$;

-- Add unique constraint (one slot per doctor per day)
ALTER TABLE recurring_sessions
  DROP CONSTRAINT IF EXISTS recurring_sessions_doctor_day_unique;

ALTER TABLE recurring_sessions
  ADD CONSTRAINT recurring_sessions_doctor_day_unique
  UNIQUE (pharmacy_id, doctor_id, day_of_week);
