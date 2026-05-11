"use client";

import { useState } from "react";
import {
  Activity, Clock, Users, CheckCircle2, ArrowRight, Share2,
  Copy, MapPin, Phone, Stethoscope, Calendar, AlertCircle
} from "lucide-react";
import { generateToken, formatTime, getTrackingUrl, copyToClipboard, maskName } from "@/lib/utils";
import { toast } from "sonner";
import type { Doctor, Pharmacy, Session, Appointment } from "@/lib/types";

type SessionWithAppointments = Session & {
  appointments: { status: string; serial_number: number }[];
};

interface Props {
  pharmacy: Pharmacy;
  doctors: Doctor[];
  sessions: SessionWithAppointments[];
}

type BookingStep = "select-doctor" | "fill-form" | "confirmed";

interface BookingResult {
  appointment: Appointment;
  doctor: Doctor;
  session: Session;
  position: number;
  estimatedWait: number;
}

export default function BookingClient({ pharmacy, doctors, sessions }: Props) {
  const [step, setStep] = useState<BookingStep>(doctors.length === 1 ? "fill-form" : "select-doctor");
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(doctors.length === 1 ? doctors[0] : null);
  const [selectedSession, setSelectedSession] = useState<SessionWithAppointments | null>(
    sessions.length === 1 ? sessions[0] : null
  );
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<BookingResult | null>(null);
  const [form, setForm] = useState({
    patient_name: "",
    patient_phone: "",
    patient_age: "",
    patient_gender: "",
    reason: "",
  });

  function getDoctorSessions(doctorId: string) {
    return sessions.filter((s) => s.doctor_id === doctorId);
  }

  function selectDoctor(doctor: Doctor) {
    setSelectedDoctor(doctor);
    const doctorSessions = getDoctorSessions(doctor.id);
    if (doctorSessions.length === 1) setSelectedSession(doctorSessions[0]);
    else setSelectedSession(null);
    setStep("fill-form");
  }

  async function handleBook(e: React.FormEvent) {
    e.preventDefault();
    if (!form.patient_name.trim()) { toast.error("Please enter your name"); return; }
    if (!selectedSession) { toast.error("Please select a session"); return; }
    if (!selectedDoctor) { toast.error("No doctor selected"); return; }

    const waitingBefore = selectedSession.appointments?.filter((a) => a.status === "waiting").length || 0;
    const avgDuration = selectedDoctor.avg_consultation_duration || 10;
    const token = generateToken(8);

    setLoading(true);
    try {
      const res = await fetch("/api/book", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_id: selectedSession.id,
          doctor_id: selectedDoctor.id,
          pharmacy_id: pharmacy.id,
          patient_name: form.patient_name.trim(),
          patient_phone: form.patient_phone.trim() || null,
          patient_age: form.patient_age ? parseInt(form.patient_age) : null,
          patient_gender: form.patient_gender || null,
          reason: form.reason.trim() || null,
          token,
        }),
      });

      const json = await res.json();

      if (!res.ok) {
        toast.error(json.error || "Booking failed. Please try again.");
        return;
      }

      setResult({
        appointment: json.appointment,
        doctor: selectedDoctor,
        session: selectedSession,
        position: waitingBefore,
        estimatedWait: waitingBefore * avgDuration,
      });
      setStep("confirmed");
    } finally {
      setLoading(false);
    }
  }

  const trackingUrl = result ? getTrackingUrl(result.appointment.token) : "";

  // ===== STEP: CONFIRMED =====
  if (step === "confirmed" && result) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-teal-50 flex items-start justify-center p-4 pt-8">
        <div className="w-full max-w-md">
          {/* Pharmacy header */}
          <div className="text-center mb-6">
            <div className="w-14 h-14 bg-gradient-to-br from-blue-600 to-teal-600 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-lg">
              <Activity className="w-7 h-7 text-white" />
            </div>
            <h1 className="font-bold text-lg text-foreground">{pharmacy.name}</h1>
          </div>

          {/* Confirmation card */}
          <div className="bg-white rounded-3xl border border-green-200 shadow-xl overflow-hidden">
            <div className="bg-gradient-to-r from-green-500 to-emerald-600 px-6 py-8 text-center">
              <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-white mb-1">Booking Confirmed!</h2>
              <p className="text-green-100 text-sm">You&apos;re in the queue</p>
            </div>

            <div className="p-6">
              {/* Token & Serial */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 text-center">
                  <p className="text-xs text-blue-600 font-semibold mb-1">Your Number</p>
                  <p className="text-4xl font-black text-blue-700 animate-serial-glow">
                    #{result.appointment.serial_number.toString().padStart(2, "0")}
                  </p>
                </div>
                <div className="bg-muted rounded-2xl p-4 text-center">
                  <p className="text-xs text-muted-foreground font-semibold mb-1">Token</p>
                  <p className="text-xl font-black text-foreground font-mono">{result.appointment.token}</p>
                </div>
              </div>

              {/* Details */}
              <div className="space-y-3 mb-6">
                <div className="flex items-center gap-3 p-3 bg-muted rounded-xl">
                  <Stethoscope className="w-4 h-4 text-blue-600" />
                  <div>
                    <p className="text-xs text-muted-foreground">Doctor</p>
                    <p className="text-sm font-semibold text-foreground">Dr. {result.doctor.name}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-muted rounded-xl">
                  <Clock className="w-4 h-4 text-amber-600" />
                  <div>
                    <p className="text-xs text-muted-foreground">Estimated Wait</p>
                    <p className="text-sm font-semibold text-foreground">
                      {result.position === 0
                        ? "You may be next!"
                        : `~${result.estimatedWait} minutes (${result.position} before you)`}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-muted rounded-xl">
                  <Users className="w-4 h-4 text-purple-600" />
                  <div>
                    <p className="text-xs text-muted-foreground">Session Time</p>
                    <p className="text-sm font-semibold text-foreground">
                      {formatTime(result.session.start_time)} – {formatTime(result.session.end_time)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Live tracking link */}
              <div className="bg-gradient-to-r from-blue-600 to-teal-600 rounded-2xl p-4 mb-4">
                <p className="text-xs text-blue-200 font-semibold mb-2">📱 Track Your Position Live</p>
                <p className="text-white text-sm font-mono break-all bg-white/10 rounded-lg px-3 py-2 mb-3">
                  {trackingUrl.replace("https://", "").replace("http://", "")}
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => { copyToClipboard(trackingUrl); toast.success("Tracking link copied!"); }}
                    className="flex-1 flex items-center justify-center gap-1.5 bg-white/20 hover:bg-white/30 rounded-xl py-2.5 text-xs font-bold text-white transition-colors"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    Copy Link
                  </button>
                  <a
                    href={trackingUrl}
                    className="flex-1 flex items-center justify-center gap-1.5 bg-white text-blue-700 rounded-xl py-2.5 text-xs font-bold hover:bg-blue-50 transition-colors"
                  >
                    <ArrowRight className="w-3.5 h-3.5" />
                    Track Live
                  </a>
                </div>
              </div>

              <p className="text-xs text-center text-muted-foreground">
                Please arrive a few minutes before your expected turn.
                Show your token <strong>{result.appointment.token}</strong> to the staff.
              </p>
            </div>
          </div>

          {/* Share */}
          <div className="mt-4 flex gap-3">
            <button
              onClick={() => {
                if (navigator.share) {
                  navigator.share({ title: "My Queue Position", url: trackingUrl, text: `My booking token: ${result.appointment.token}` });
                } else {
                  copyToClipboard(trackingUrl);
                  toast.success("Link copied!");
                }
              }}
              className="flex-1 flex items-center justify-center gap-2 bg-white border border-border rounded-2xl py-3 text-sm font-semibold text-foreground hover:bg-muted transition-colors"
            >
              <Share2 className="w-4 h-4" />
              Share Tracking Link
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ===== BOOKING FORM =====
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-teal-50">
      {/* Pharmacy header */}
      <div className="bg-gradient-to-r from-blue-600 to-teal-600 px-4 py-6 text-white text-center">
        <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-3">
          <Activity className="w-7 h-7 text-white" />
        </div>
        <h1 className="text-xl font-bold">{pharmacy.name}</h1>
        {pharmacy.address && (
          <p className="text-blue-100 text-xs mt-1 flex items-center justify-center gap-1">
            <MapPin className="w-3 h-3" /> {pharmacy.address}
          </p>
        )}
        {pharmacy.phone && (
          <p className="text-blue-100 text-xs mt-0.5 flex items-center justify-center gap-1">
            <Phone className="w-3 h-3" /> {pharmacy.phone}
          </p>
        )}
      </div>

      <div className="max-w-md mx-auto p-4 pt-6">
        {/* No sessions available */}
        {sessions.length === 0 && (
          <div className="bg-white rounded-3xl border border-border shadow-xl p-8 text-center">
            <div className="w-16 h-16 bg-amber-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-8 h-8 text-amber-500" />
            </div>
            <h2 className="text-xl font-bold text-foreground mb-2">No Active Sessions</h2>
            <p className="text-muted-foreground text-sm">
              {pharmacy.settings?.custom_message ||
                "There are no active booking sessions right now. Please check back later or contact the pharmacy directly."}
            </p>
            {pharmacy.phone && (
              <a
                href={`tel:${pharmacy.phone}`}
                className="inline-flex items-center gap-2 mt-6 bg-gradient-to-r from-blue-600 to-teal-600 text-white px-6 py-3 rounded-xl text-sm font-semibold"
              >
                <Phone className="w-4 h-4" />
                Call {pharmacy.name}
              </a>
            )}
          </div>
        )}

        {/* Doctor selection step */}
        {step === "select-doctor" && sessions.length > 0 && (
          <div className="space-y-4">
            <div>
              <h2 className="text-xl font-bold text-foreground mb-1">Select Doctor</h2>
              <p className="text-sm text-muted-foreground">Choose which doctor you want to see</p>
            </div>
            {doctors
              .filter((d) => getDoctorSessions(d.id).length > 0)
              .map((doctor) => {
                const doctorSessions = getDoctorSessions(doctor.id);
                const totalWaiting = doctorSessions.reduce(
                  (sum, s) => sum + (s.appointments?.filter((a) => ["waiting", "called", "in-progress"].includes(a.status)).length || 0),
                  0
                );
                return (
                  <button
                    key={doctor.id}
                    onClick={() => selectDoctor(doctor)}
                    className="w-full bg-white rounded-2xl border border-border p-5 text-left hover:border-blue-300 hover:shadow-lg transition-all group"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 bg-gradient-to-br from-blue-100 to-teal-100 rounded-2xl flex items-center justify-center flex-shrink-0">
                        <Stethoscope className="w-7 h-7 text-blue-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-foreground">Dr. {doctor.name}</p>
                        {doctor.specialty && <p className="text-sm text-muted-foreground">{doctor.specialty}</p>}
                        {doctor.qualification && <p className="text-xs text-muted-foreground/70">{doctor.qualification}</p>}
                        <div className="flex items-center gap-3 mt-2">
                          <span className="text-xs font-medium text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full">
                            {totalWaiting} waiting
                          </span>
                          {doctor.consultation_fee > 0 && (
                            <span className="text-xs text-muted-foreground">৳{doctor.consultation_fee} fee</span>
                          )}
                        </div>
                      </div>
                      <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                    </div>
                  </button>
                );
              })}
          </div>
        )}

        {/* Booking form */}
        {step === "fill-form" && selectedDoctor && (
          <div className="space-y-4">
            {/* Doctor info bar */}
            <div className="bg-white rounded-2xl border border-border p-4 flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-100 to-teal-100 rounded-xl flex items-center justify-center">
                <Stethoscope className="w-6 h-6 text-blue-600" />
              </div>
              <div className="flex-1">
                <p className="font-bold text-foreground text-sm">Dr. {selectedDoctor.name}</p>
                <p className="text-xs text-muted-foreground">{selectedDoctor.specialty}</p>
              </div>
              {getDoctorSessions(selectedDoctor.id).length > 0 && (
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">Today</p>
                  {getDoctorSessions(selectedDoctor.id).map((s) => (
                    <p key={s.id} className="text-xs font-semibold text-foreground">
                      {formatTime(s.start_time)}-{formatTime(s.end_time)}
                    </p>
                  ))}
                </div>
              )}
            </div>

            {/* Session selector (if multiple) */}
            {getDoctorSessions(selectedDoctor.id).length > 1 && (
              <div>
                <p className="text-sm font-medium text-foreground mb-2">Select Session</p>
                {getDoctorSessions(selectedDoctor.id).map((session) => {
                  const waiting = session.appointments?.filter((a) => ["waiting"].includes(a.status)).length || 0;
                  const total = session.appointments?.filter((a) => a.status !== "cancelled").length || 0;
                  const isFull = total >= session.max_appointments;
                  return (
                    <button
                      key={session.id}
                      onClick={() => !isFull && setSelectedSession(session)}
                      disabled={isFull}
                      className={`w-full p-4 rounded-xl border text-left transition-all mb-2 ${
                        selectedSession?.id === session.id
                          ? "border-blue-400 bg-blue-50"
                          : isFull
                          ? "border-border bg-muted opacity-60 cursor-not-allowed"
                          : "border-border bg-white hover:border-blue-300"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-semibold text-foreground">
                            {formatTime(session.start_time)} – {formatTime(session.end_time)}
                          </p>
                          <p className="text-xs text-muted-foreground">{waiting} currently waiting</p>
                        </div>
                        {isFull ? (
                          <span className="text-xs font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded-full">FULL</span>
                        ) : (
                          <span className="text-xs font-bold text-green-700 bg-green-50 px-2 py-0.5 rounded-full">Open</span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Queue status */}
            {selectedSession && (
              <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                    <p className="text-sm font-semibold text-blue-800">Live Queue Status</p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-black text-blue-700">
                      {selectedSession.appointments?.filter((a) => ["waiting", "called", "in-progress"].includes(a.status)).length || 0}
                    </p>
                    <p className="text-xs text-blue-600">Ahead of you</p>
                  </div>
                </div>
                <p className="text-xs text-blue-700 mt-2">
                  You&apos;ll be #{((selectedSession.appointments?.filter((a) => a.status !== "cancelled").length) || 0) + 1}
                  {" "}· Est. wait: ~{((selectedSession.appointments?.filter((a) => ["waiting", "called", "in-progress"].includes(a.status)).length || 0)) * (selectedDoctor.avg_consultation_duration || 10)} min
                </p>
              </div>
            )}

            {/* Booking form */}
            <div className="bg-white rounded-3xl border border-border shadow-xl overflow-hidden">
              <div className="px-6 py-5 border-b border-border">
                <h2 className="font-bold text-foreground">Your Details</h2>
                <p className="text-xs text-muted-foreground mt-0.5">No account needed — just your name</p>
              </div>
              <form onSubmit={handleBook} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">Full Name *</label>
                  <input
                    type="text"
                    value={form.patient_name}
                    onChange={(e) => setForm((p) => ({ ...p, patient_name: e.target.value }))}
                    placeholder="Your full name"
                    required
                    autoFocus
                    className="w-full h-12 px-4 rounded-xl border border-input text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">Phone Number</label>
                  <input
                    type="tel"
                    value={form.patient_phone}
                    onChange={(e) => setForm((p) => ({ ...p, patient_phone: e.target.value }))}
                    placeholder="01XXXXXXXXX (to receive notifications)"
                    className="w-full h-12 px-4 rounded-xl border border-input text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1.5">Age</label>
                    <input
                      type="number"
                      value={form.patient_age}
                      onChange={(e) => setForm((p) => ({ ...p, patient_age: e.target.value }))}
                      placeholder="25"
                      min="1"
                      max="120"
                      className="w-full h-12 px-4 rounded-xl border border-input text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1.5">Gender</label>
                    <select
                      value={form.patient_gender}
                      onChange={(e) => setForm((p) => ({ ...p, patient_gender: e.target.value }))}
                      className="w-full h-12 px-4 rounded-xl border border-input text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all bg-white"
                    >
                      <option value="">Select</option>
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">
                    Reason for Visit <span className="text-muted-foreground font-normal">(optional)</span>
                  </label>
                  <textarea
                    value={form.reason}
                    onChange={(e) => setForm((p) => ({ ...p, reason: e.target.value }))}
                    placeholder="Briefly describe your symptoms or reason..."
                    rows={3}
                    className="w-full px-4 py-3 rounded-xl border border-input text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all resize-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading || !selectedSession}
                  className="w-full h-14 bg-gradient-to-r from-blue-600 to-teal-600 text-white font-bold text-base rounded-2xl flex items-center justify-center gap-2 shadow-xl shadow-blue-500/25 hover:shadow-2xl hover:shadow-blue-500/30 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]"
                >
                  {loading ? (
                    <>
                      <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Booking your slot...
                    </>
                  ) : (
                    <>
                      Book My Slot
                      <ArrowRight className="w-5 h-5" />
                    </>
                  )}
                </button>

                <p className="text-center text-xs text-muted-foreground">
                  Free booking · No account required · Track your position live
                </p>
              </form>
            </div>

            {doctors.length > 1 && (
              <button
                onClick={() => { setSelectedDoctor(null); setSelectedSession(null); setStep("select-doctor"); }}
                className="w-full py-3 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                ← Choose a different doctor
              </button>
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="text-center py-8 mt-8">
        <p className="text-xs text-muted-foreground">
          Powered by{" "}
          <a href="/" className="font-semibold text-primary hover:underline">ClinicQ</a>
          {" "}· Smart Queue Management
        </p>
      </div>
    </div>
  );
}
