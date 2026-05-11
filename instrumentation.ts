/**
 * instrumentation.ts — runs once on server startup.
 * Validates required environment variables so missing config
 * fails loudly at boot rather than crashing at request time.
 */
export function register() {
  const required = [
    "NEXT_PUBLIC_SUPABASE_URL",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    "NEXT_PUBLIC_APP_URL",
  ];

  const missing = required.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    throw new Error(
      `[ClinicQ] Missing required environment variables:\n  ${missing.join("\n  ")}\n` +
        `Copy .env.local.example to .env.local and fill in the values.`
    );
  }

  // Warn (not throw) for service role key — only needed if /api/register is used
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY === "YOUR_SERVICE_ROLE_KEY_HERE") {
    console.warn(
      "[ClinicQ] SUPABASE_SERVICE_ROLE_KEY is not set. Admin operations will be unavailable."
    );
  }
}
