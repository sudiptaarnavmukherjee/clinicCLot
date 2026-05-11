"use client";

import { useState } from "react";
import {
  Plus, Users2, Edit2, Trash2, Stethoscope, Phone, Clock, DollarSign,
  CheckCircle, XCircle, Calendar, ChevronDown, ChevronUp
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { generateSlug } from "@/lib/utils";
import { toast } from "sonner";
import type { Doctor, Pharmacy, DoctorSchedule } from "@/lib/types";

interface Props {
  pharmacy: Pharmacy;
  initialDoctors: Doctor[];
  initialSchedules: DoctorSchedule[];
}

const SPECIALTIES = [
  "General Physician", "Internal Medicine", "Pediatrics", "Gynecology",
  "Cardiology", "Orthopedics", "Dermatology", "ENT", "Ophthalmology",
  "Neurology", "Psychiatry", "Dentistry", "Homeopathy", "Other"
];

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const DAY_FULL = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export default function DoctorsClient({ pharmacy, initialDoctors, initialSchedules }: Props) {
  const [doctors, setDoctors] = useState<Doctor[]>(initialDoctors);
  const [schedules, setSchedules] = useState<DoctorSchedule[]>(initialSchedules);
  const [showForm, setShowForm] = useState(false);
  const [editingDoctor, setEditingDoctor] = useState<Doctor | null>(null);
  const [loading, setLoading] = useState(false);
  const [expandedSchedule, setExpandedSchedule] = useState<string | null>(null);
  const [scheduleLoading, setScheduleLoading] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    specialty: "",
    qualification: "",
    consultation_fee: "",
    avg_consultation_duration: "10",
    bio: "",
    phone: "",
  });

  function resetForm() {
    setForm({ name: "", specialty: "", qualification: "", consultation_fee: "", avg_consultation_duration: "10", bio: "", phone: "" });
    setEditingDoctor(null);
  }

  function openEdit(doctor: Doctor) {
    setForm({
      name: doctor.name,
      specialty: doctor.specialty || "",
      qualification: doctor.qualification || "",
      consultation_fee: doctor.consultation_fee?.toString() || "",
      avg_consultation_duration: doctor.avg_consultation_duration?.toString() || "10",
      bio: doctor.bio || "",
      phone: doctor.phone || "",
    });
    setEditingDoctor(doctor);
    setShowForm(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) { toast.error("Doctor name is required"); return; }
    if (form.name.trim().length > 255) { toast.error("Name is too long"); return; }

    const fee = parseFloat(form.consultation_fee);
    if (form.consultation_fee && (isNaN(fee) || fee < 0 || fee > 999999)) {
      toast.error("Invalid consultation fee"); return;
    }
    const duration = parseInt(form.avg_consultation_duration);
    if (isNaN(duration) || duration < 1 || duration > 480) {
      toast.error("Consultation duration must be between 1–480 minutes"); return;
    }
    setLoading(true);
    try {
      const supabase = createClient();
      const doctorData = {
        name: form.name.trim(),
        specialty: form.specialty || null,
        qualification: form.qualification || null,
        consultation_fee: form.consultation_fee ? parseFloat(form.consultation_fee) : 0,
        avg_consultation_duration: parseInt(form.avg_consultation_duration) || 10,
        bio: form.bio || null,
        phone: form.phone || null,
      };

      if (editingDoctor) {
        const { data, error } = await supabase
          .from("doctors")
          .update(doctorData)
          .eq("id", editingDoctor.id)
          .select()
          .single();
        if (error) { toast.error(error.message); return; }
        setDoctors((prev) => prev.map((d) => (d.id === editingDoctor.id ? data : d)));
        toast.success("Doctor updated successfully");
      } else {
        const slug = generateSlug(form.name) + "-" + Math.random().toString(36).slice(2, 5);
        const { data, error } = await supabase
          .from("doctors")
          .insert({ ...doctorData, pharmacy_id: pharmacy.id, slug })
          .select()
          .single();
        if (error) { toast.error(error.message); return; }
        setDoctors((prev) => [...prev, data]);
        toast.success("Doctor added successfully!");
      }
      setShowForm(false);
      resetForm();
    } finally {
      setLoading(false);
    }
  }

  async function toggleActive(doctor: Doctor) {
    const supabase = createClient();
    const { error } = await supabase
      .from("doctors")
      .update({ is_active: !doctor.is_active })
      .eq("id", doctor.id);
    if (error) { toast.error(error.message); return; }
    setDoctors((prev) => prev.map((d) => (d.id === doctor.id ? { ...d, is_active: !d.is_active } : d)));
    toast.success(`Doctor ${doctor.is_active ? "deactivated" : "activated"}`);
  }

  async function deleteDoctor(doctor: Doctor) {
    if (!confirm(`Delete Dr. ${doctor.name}? This cannot be undone.`)) return;
    const supabase = createClient();
    const { error } = await supabase.from("doctors").delete().eq("id", doctor.id);
    if (error) { toast.error(error.message); return; }
    setDoctors((prev) => prev.filter((d) => d.id !== doctor.id));
    setSchedules((prev) => prev.filter((s) => s.doctor_id !== doctor.id));
    toast.success("Doctor removed");
  }

  function getDoctorSchedules(doctorId: string) {
    return schedules.filter((s) => s.doctor_id === doctorId);
  }

  async function toggleDaySchedule(doctorId: string, dayOfWeek: number, existing?: DoctorSchedule) {
    const key = `${doctorId}-${dayOfWeek}`;
    setScheduleLoading(key);
    const supabase = createClient();
    try {
      if (existing) {
        const { data, error } = await supabase
          .from("doctor_schedules")
          .update({ is_active: !existing.is_active })
          .eq("id", existing.id)
          .select()
          .single();
        if (error) { toast.error(error.message); return; }
        setSchedules((prev) => prev.map((s) => (s.id === existing.id ? data : s)));
        toast.success(data.is_active ? `${DAY_FULL[dayOfWeek]} enabled` : `${DAY_FULL[dayOfWeek]} disabled`);
      } else {
        const { data, error } = await supabase
          .from("doctor_schedules")
          .insert({ doctor_id: doctorId, pharmacy_id: pharmacy.id, day_of_week: dayOfWeek, start_time: "09:00:00", end_time: "13:00:00", max_appointments: 30, is_active: true })
          .select()
          .single();
        if (error) { toast.error(error.message); return; }
        setSchedules((prev) => [...prev, data]);
        toast.success(`${DAY_FULL[dayOfWeek]} schedule added`);
      }
    } finally {
      setScheduleLoading(null);
    }
  }

  async function updateScheduleField(scheduleId: string, field: string, value: string) {
    const supabase = createClient();
    const update: Record<string, unknown> = {};
    if (field === "start_time" || field === "end_time") {
      update[field] = value + ":00";
    } else if (field === "max_appointments") {
      const n = parseInt(value);
      if (isNaN(n) || n < 1 || n > 500) { toast.error("Max must be 1–500"); return; }
      update[field] = n;
    }
    const { data, error } = await supabase.from("doctor_schedules").update(update).eq("id", scheduleId).select().single();
    if (error) { toast.error(error.message); return; }
    setSchedules((prev) => prev.map((s) => (s.id === scheduleId ? data : s)));
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-sm text-muted-foreground">{doctors.length} doctor{doctors.length !== 1 ? "s" : ""} registered</p>
        </div>
        <button
          onClick={() => { resetForm(); setShowForm(true); }}
          className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-teal-600 text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:shadow-lg transition-all"
        >
          <Plus className="w-4 h-4" />
          Add Doctor
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => { setShowForm(false); resetForm(); }} />
          <div className="relative bg-white rounded-3xl border border-border shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="bg-gradient-to-r from-blue-600 to-teal-600 px-6 py-5 rounded-t-3xl">
              <h2 className="font-bold text-lg text-white">
                {editingDoctor ? "Edit Doctor" : "Add New Doctor"}
              </h2>
              <p className="text-sm text-blue-100 mt-0.5">Fill in the doctor&apos;s information</p>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Full Name *</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                  placeholder="Dr. Full Name"
                  required
                  autoFocus
                  className="w-full h-11 px-4 rounded-xl border border-input text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">Specialty</label>
                  <select
                    value={form.specialty}
                    onChange={(e) => setForm((p) => ({ ...p, specialty: e.target.value }))}
                    className="w-full h-11 px-4 rounded-xl border border-input text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all bg-white"
                  >
                    <option value="">Select specialty</option>
                    {SPECIALTIES.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">Avg. Consult (min)</label>
                  <input
                    type="number"
                    value={form.avg_consultation_duration}
                    onChange={(e) => setForm((p) => ({ ...p, avg_consultation_duration: e.target.value }))}
                    min="1"
                    max="120"
                    className="w-full h-11 px-4 rounded-xl border border-input text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">Consultation Fee (৳)</label>
                  <input
                    type="number"
                    value={form.consultation_fee}
                    onChange={(e) => setForm((p) => ({ ...p, consultation_fee: e.target.value }))}
                    placeholder="500"
                    min="0"
                    className="w-full h-11 px-4 rounded-xl border border-input text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">Phone</label>
                  <input
                    type="tel"
                    value={form.phone}
                    onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
                    placeholder="01XXXXXXXXX"
                    className="w-full h-11 px-4 rounded-xl border border-input text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Qualification</label>
                <input
                  type="text"
                  value={form.qualification}
                  onChange={(e) => setForm((p) => ({ ...p, qualification: e.target.value }))}
                  placeholder="MBBS, MD, etc."
                  className="w-full h-11 px-4 rounded-xl border border-input text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Bio (optional)</label>
                <textarea
                  value={form.bio}
                  onChange={(e) => setForm((p) => ({ ...p, bio: e.target.value }))}
                  placeholder="Brief bio about the doctor..."
                  rows={3}
                  className="w-full px-4 py-3 rounded-xl border border-input text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all resize-none"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => { setShowForm(false); resetForm(); }}
                  className="flex-1 h-11 border-2 border-border rounded-xl text-sm font-semibold text-foreground hover:bg-muted transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 h-11 bg-gradient-to-r from-blue-600 to-teal-600 text-white font-semibold rounded-xl flex items-center justify-center gap-2 hover:shadow-lg transition-all disabled:opacity-60"
                >
                  {loading ? (
                    <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                  ) : editingDoctor ? "Save Changes" : "Add Doctor"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Doctors list */}
      {doctors.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-20 h-20 bg-blue-50 rounded-3xl flex items-center justify-center mb-5">
            <Users2 className="w-10 h-10 text-blue-300" />
          </div>
          <h2 className="text-xl font-bold text-foreground mb-2">No doctors yet</h2>
          <p className="text-muted-foreground mb-6 max-w-xs">Add your first doctor to start creating sessions and accepting bookings</p>
          <button
            onClick={() => { resetForm(); setShowForm(true); }}
            className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-teal-600 text-white px-6 py-3 rounded-xl font-semibold hover:shadow-lg transition-all"
          >
            <Plus className="w-4 h-4" />
            Add First Doctor
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {doctors.map((doctor) => {
            const doctorSchedules = getDoctorSchedules(doctor.id);
            const isExpanded = expandedSchedule === doctor.id;
            const activeDays = doctorSchedules.filter((s) => s.is_active).map((s) => s.day_of_week);

            return (
              <div key={doctor.id} className={`bg-white rounded-2xl border overflow-hidden transition-all hover:shadow-md ${doctor.is_active ? "border-border" : "border-border opacity-60"}`}>
                <div className="p-5">
                  <div className="flex items-start gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-100 to-teal-100 border border-blue-200 flex items-center justify-center flex-shrink-0">
                      <Stethoscope className="w-7 h-7 text-blue-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-bold text-foreground">Dr. {doctor.name}</h3>
                        <div className={`w-2 h-2 rounded-full ${doctor.is_active ? "bg-green-500" : "bg-gray-300"}`} />
                        {!doctor.is_active && <span className="text-xs text-muted-foreground">(inactive)</span>}
                      </div>
                      {doctor.specialty && <p className="text-sm text-muted-foreground mt-0.5">{doctor.specialty}</p>}
                      {doctor.qualification && <p className="text-xs text-muted-foreground/70">{doctor.qualification}</p>}
                      <div className="flex items-center gap-4 mt-2 flex-wrap">
                        <span className="flex items-center gap-1 text-xs text-muted-foreground"><Clock className="w-3 h-3" />{doctor.avg_consultation_duration} min</span>
                        {doctor.consultation_fee > 0 && <span className="flex items-center gap-1 text-xs text-muted-foreground"><DollarSign className="w-3 h-3" />৳{doctor.consultation_fee}</span>}
                        {doctor.phone && <span className="flex items-center gap-1 text-xs text-muted-foreground"><Phone className="w-3 h-3" />{doctor.phone}</span>}
                      </div>
                      {activeDays.length > 0 && (
                        <div className="flex items-center gap-1 mt-2 flex-wrap">
                          <Calendar className="w-3 h-3 text-muted-foreground" />
                          {DAYS.map((day, i) => (
                            <span key={i} className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${activeDays.includes(i) ? "bg-blue-100 text-blue-700" : "bg-muted text-muted-foreground/40"}`}>{day}</span>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col gap-2 flex-shrink-0">
                      <div className="flex gap-1.5">
                        <button onClick={() => openEdit(doctor)} className="flex items-center gap-1 px-2.5 py-1.5 border border-border rounded-lg text-xs font-semibold text-foreground hover:bg-muted transition-colors">
                          <Edit2 className="w-3 h-3" />Edit
                        </button>
                        <button onClick={() => toggleActive(doctor)} className={`flex items-center gap-1 px-2.5 py-1.5 border rounded-lg text-xs font-semibold transition-colors ${doctor.is_active ? "border-red-200 text-red-600 hover:bg-red-50" : "border-green-200 text-green-600 hover:bg-green-50"}`}>
                          {doctor.is_active ? <XCircle className="w-3 h-3" /> : <CheckCircle className="w-3 h-3" />}
                          {doctor.is_active ? "Disable" : "Enable"}
                        </button>
                        <button onClick={() => deleteDoctor(doctor)} className="p-1.5 border border-border rounded-lg text-muted-foreground hover:text-red-600 hover:border-red-200 hover:bg-red-50 transition-colors">
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                      <button onClick={() => setExpandedSchedule(isExpanded ? null : doctor.id)}
                        className="flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700 justify-end">
                        <Calendar className="w-3.5 h-3.5" />Weekly Schedule
                        {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                      </button>
                    </div>
                  </div>
                </div>

                {isExpanded && (
                  <div className="border-t border-border bg-blue-50/40 px-5 py-4">
                    <p className="text-xs font-bold text-foreground mb-3 uppercase tracking-wider">Weekly Schedule — tap to toggle days</p>
                    <div className="grid grid-cols-7 gap-1.5 mb-4">
                      {DAYS.map((day, dayIndex) => {
                        const existing = doctorSchedules.find((s) => s.day_of_week === dayIndex);
                        const isActive = existing?.is_active ?? false;
                        const isLoading = scheduleLoading === `${doctor.id}-${dayIndex}`;
                        return (
                          <button key={dayIndex} onClick={() => toggleDaySchedule(doctor.id, dayIndex, existing)}
                            disabled={!!scheduleLoading}
                            className={`py-2.5 rounded-xl text-xs font-bold text-center transition-all border ${isActive ? "bg-blue-600 text-white border-blue-600 shadow-sm" : "bg-white text-muted-foreground border-border hover:border-blue-300 hover:text-blue-600"} ${isLoading ? "opacity-50 cursor-not-allowed" : ""}`}>
                            {isLoading ? "…" : day}
                          </button>
                        );
                      })}
                    </div>

                    {doctorSchedules.filter((s) => s.is_active).length > 0 ? (
                      <div className="space-y-2">
                        <p className="text-xs text-muted-foreground font-medium">Adjust time &amp; capacity per day:</p>
                        {doctorSchedules.filter((s) => s.is_active).sort((a, b) => a.day_of_week - b.day_of_week).map((sched) => (
                          <div key={sched.id} className="flex items-center gap-2 bg-white rounded-xl border border-border px-3 py-2">
                            <span className="text-xs font-bold text-blue-700 w-7 flex-shrink-0">{DAYS[sched.day_of_week]}</span>
                            <input type="time" defaultValue={sched.start_time.slice(0, 5)}
                              onBlur={(e) => updateScheduleField(sched.id, "start_time", e.target.value)}
                              className="h-8 px-2 rounded-lg border border-input text-xs focus:outline-none focus:ring-1 focus:ring-primary/30" />
                            <span className="text-xs text-muted-foreground">–</span>
                            <input type="time" defaultValue={sched.end_time.slice(0, 5)}
                              onBlur={(e) => updateScheduleField(sched.id, "end_time", e.target.value)}
                              className="h-8 px-2 rounded-lg border border-input text-xs focus:outline-none focus:ring-1 focus:ring-primary/30" />
                            <span className="text-xs text-muted-foreground ml-auto">Max</span>
                            <input type="number" defaultValue={sched.max_appointments} min="1" max="500"
                              onBlur={(e) => updateScheduleField(sched.id, "max_appointments", e.target.value)}
                              className="h-8 w-14 px-2 rounded-lg border border-input text-xs text-center focus:outline-none focus:ring-1 focus:ring-primary/30" />
                            <button onClick={() => toggleDaySchedule(doctor.id, sched.day_of_week, sched)}
                              title="Disable this day" className="text-muted-foreground hover:text-red-500 transition-colors ml-1">
                              <XCircle className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground text-center py-2">No days selected — click the days above to set this doctor&apos;s regular schedule</p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
