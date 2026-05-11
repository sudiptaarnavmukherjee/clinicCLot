"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  Activity, Mail, Lock, Eye, EyeOff, Store, Phone, MapPin, ArrowRight, CheckCircle
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { generateSlug } from "@/lib/utils";
import { toast } from "sonner";

const STEPS = ["Account", "Pharmacy", "Done"];

export default function RegisterPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isSetup = searchParams.get("setup") === "1";
  // If ?setup=1, user is already authenticated — jump to pharmacy step
  const [step, setStep] = useState(isSetup ? 1 : 0);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [existingUser, setExistingUser] = useState<{ id: string; email: string } | null>(null);
  const [form, setForm] = useState({
    email: "",
    password: "",
    pharmacy_name: "",
    phone: "",
    address: "",
  });

  // Load existing session user when in setup mode (?setup=1)
  useEffect(() => {
    if (isSetup) {
      createClient().auth.getUser().then(({ data }) => {
        if (data.user) setExistingUser({ id: data.user.id, email: data.user.email! });
      });
    }
  }, [isSetup]);

  function updateForm(key: string, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    if (step === 0) {
      if (!form.email || !form.password) { toast.error("Please fill all fields"); return; }
      if (form.password.length < 6) { toast.error("Password must be at least 6 characters"); return; }
      setStep(1);
      return;
    }

    if (!form.pharmacy_name) { toast.error("Pharmacy name is required"); return; }
    setLoading(true);

    try {
      const supabase = createClient();
      let userId: string;
      let userEmail: string;

      if (isSetup && existingUser) {
        // User already authenticated — just create the pharmacy
        userId = existingUser.id;
        userEmail = existingUser.email;
      } else {
        // 1. Sign up new user
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email: form.email,
          password: form.password,
        });

        if (authError || !authData.user) {
          toast.error(authError?.message || "Registration failed");
          return;
        }

        // Ensure session is set before inserting (email confirm is disabled)
        if (authData.session) {
          await supabase.auth.setSession(authData.session);
        }

        userId = authData.user.id;
        userEmail = form.email;
      }

      // Create pharmacy profile
      const slug =
        form.pharmacy_name
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-|-$/g, "")
          .slice(0, 50) +
        "-" +
        Math.random().toString(36).slice(2, 6);

      const { error: pharmacyError } = await supabase.from("pharmacies").insert({
        user_id: userId,
        name: form.pharmacy_name,
        slug,
        phone: form.phone || null,
        address: form.address || null,
        email: userEmail,
      });

      if (pharmacyError) {
        toast.error("Could not create pharmacy profile: " + pharmacyError.message);
        return;
      }

      setStep(2);
      setTimeout(() => router.push("/dashboard"), 2000);
    } catch {
      toast.error("An error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 via-white to-blue-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -left-40 w-80 h-80 bg-teal-400/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -right-40 w-80 h-80 bg-blue-400/10 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-md relative">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 mb-6">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-teal-600 rounded-2xl flex items-center justify-center shadow-lg">
              <Activity className="w-5 h-5 text-white" />
            </div>
            <span className="text-2xl font-bold text-foreground">ClinicQ</span>
          </Link>

          {step < 2 && (
            <>
              <h1 className="text-3xl font-bold text-foreground">Register your pharmacy</h1>
              <p className="text-muted-foreground mt-2">Set up in 2 minutes, free forever</p>
            </>
          )}

          {/* Step indicator */}
          {step < 2 && (
            <div className="flex items-center justify-center gap-2 mt-6">
              {STEPS.slice(0, 2).map((s, i) => (
                <div key={s} className="flex items-center gap-2">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all ${i <= step ? "bg-gradient-to-br from-blue-600 to-teal-600 text-white" : "bg-muted text-muted-foreground"}`}>
                    {i < step ? <CheckCircle className="w-4 h-4" /> : i + 1}
                  </div>
                  <span className={`text-sm font-medium ${i === step ? "text-foreground" : "text-muted-foreground"}`}>{s}</span>
                  {i < 1 && <div className={`w-8 h-0.5 ${i < step ? "bg-gradient-to-r from-blue-600 to-teal-600" : "bg-border"}`} />}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Success step */}
        {step === 2 ? (
          <div className="bg-white rounded-3xl border border-border shadow-xl p-8 text-center">
            <div className="w-20 h-20 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
              <CheckCircle className="w-10 h-10 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-foreground mb-3">You&apos;re all set! 🎉</h2>
            <p className="text-muted-foreground mb-8 leading-relaxed">
              Your pharmacy is registered. You can now log in and start managing your queue.
            </p>
            <Link
              href="/login"
              className="block w-full h-12 bg-gradient-to-r from-blue-600 to-teal-600 text-white font-semibold rounded-xl flex items-center justify-center gap-2 hover:shadow-lg transition-all duration-200"
            >
              Go to Login
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        ) : (
          <div className="bg-white rounded-3xl border border-border shadow-xl p-8">
            <form onSubmit={handleRegister} className="space-y-5">
              {step === 0 && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">Email Address</label>
                    <div className="relative">
                      <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <input
                        type="email"
                        value={form.email}
                        onChange={(e) => updateForm("email", e.target.value)}
                        placeholder="pharmacy@example.com"
                        className="w-full h-12 pl-10 pr-4 rounded-xl border border-input bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                        required
                        autoComplete="email"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">Password</label>
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <input
                        type={showPassword ? "text" : "password"}
                        value={form.password}
                        onChange={(e) => updateForm("password", e.target.value)}
                        placeholder="Min. 6 characters"
                        className="w-full h-12 pl-10 pr-12 rounded-xl border border-input bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                        required
                        autoComplete="new-password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">At least 6 characters</p>
                  </div>
                </>
              )}

              {step === 1 && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">Pharmacy / Clinic Name *</label>
                    <div className="relative">
                      <Store className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <input
                        type="text"
                        value={form.pharmacy_name}
                        onChange={(e) => updateForm("pharmacy_name", e.target.value)}
                        placeholder="Green Valley Pharmacy"
                        className="w-full h-12 pl-10 pr-4 rounded-xl border border-input bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                        required
                      />
                    </div>
                    {form.pharmacy_name && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Booking link: <span className="font-medium text-primary">/book/{generateSlug(form.pharmacy_name)}-xxxx</span>
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">Phone Number</label>
                    <div className="relative">
                      <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <input
                        type="tel"
                        value={form.phone}
                        onChange={(e) => updateForm("phone", e.target.value)}
                        placeholder="+880 1700-000000"
                        className="w-full h-12 pl-10 pr-4 rounded-xl border border-input bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">Address</label>
                    <div className="relative">
                      <MapPin className="absolute left-3.5 top-3.5 w-4 h-4 text-muted-foreground" />
                      <textarea
                        value={form.address}
                        onChange={(e) => updateForm("address", e.target.value)}
                        placeholder="123 Main Street, Dhaka"
                        rows={2}
                        className="w-full pl-10 pr-4 py-3 rounded-xl border border-input bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all resize-none"
                      />
                    </div>
                  </div>
                </>
              )}

              <div className="flex gap-3 pt-2">
                {step > 0 && (
                  <button
                    type="button"
                    onClick={() => setStep(step - 1)}
                    className="flex-1 h-12 border-2 border-border rounded-xl text-sm font-semibold text-foreground hover:border-primary/30 hover:bg-blue-50/50 transition-all"
                  >
                    Back
                  </button>
                )}
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 h-12 bg-gradient-to-r from-blue-600 to-teal-600 text-white font-semibold rounded-xl flex items-center justify-center gap-2 hover:shadow-lg hover:shadow-blue-500/25 transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <>
                      <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Creating...
                    </>
                  ) : (
                    <>
                      {step === 0 ? "Next" : "Create Pharmacy"}
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </form>

            <div className="mt-6 text-center">
              <p className="text-sm text-muted-foreground">
                Already have an account?{" "}
                <Link href="/login" className="text-primary font-semibold hover:underline">Sign in</Link>
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
