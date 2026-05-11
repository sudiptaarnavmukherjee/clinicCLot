"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { format, parseISO } from "date-fns";
import {
  Plus, CalendarDays, Clock, Users, PlayCircle, ArrowRight,
  Trash2, PauseCircle, CheckCircle, Repeat, Edit2, XCircle,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { formatTime, getSessionStatusColor } from "@/lib/utils";
import { toast } from "sonner";
import type { Doctor, Pharmacy, Session, RecurringSession } from "@/lib/types";

type SessionWithDoctor = Session & {
  doctors: { id: string; name: string; specialty: string | null } | null;
  appointments: { status: string }[];
};

type RecurringSessionWithDoctor = RecurringSession & {
  doctors: { id: string; name: string; specialty: string | null } | null;
};

interface Props {
  pharmacy: Pharmacy;
  doctors: Doctor[];
  initialSessions: SessionWithDoctor[];
  initialRecurringSessions: RecurringSessionWithDoctor[];
  openNew?: boolean;
}

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const DAY_FULL = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const defaultRecurringForm = {
  doctor_id: "",
  days_of_week: [] as number[],
  start_time: "09:00",
  end_time: "13:00",
  max_appointments: "30",
  notes: "",
};

export default function SessionsClient({
  pharmacy,
  doctors,
  initialSessions,
  initialRecurringSessions,
  openNew = false,
}: Props) {
  const router = useRouter();
  const [sessions, setSessions] = useState(initialSessions);
  const [recurringSessions, setRecurringSessions] = useState(initialRecurringSessions);
  const [showForm, setShowForm] = useState(openNew);
  const [editingRecurring, setEditingRecurring] = useState<RecurringSessionWithDoctor | null>(null);
  const [loading, setLoading] = useState(false);

  const [today] = useState(() => {
    const d = new Date();
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().split("T")[0];
  });

  const [form, setForm] = useState({
    ...defaultRecurringForm,
    doctor_id: doctors[0]?.id || "",
  });

  function openCreate() {
    setEditingRecurring(null);
    setForm({ ...defaultRecurringForm, doctor_id: doctors[0]?.id || "" });
    setShowForm(true);
  }

  function openEdit(rs: RecurringSessionWithDoctor) {
    setEditingRecurring(rs);
    setForm({
      doctor_id: rs.doctor_id,
      days_of_week: [...rs.days_of_week],
      start_time: rs.start_time.slice(0, 5),
      end_time: rs.end_time.slice(0, 5),
      max_appointments: String(rs.max_appointments),
      notes: rs.notes || "",
    });
    setShowForm(true);
  }

  function toggleDay(day: number) {
    setForm((prev) => ({
      ...prev,
      days_of_week: prev.days_of_week.includes(day)
        ? prev.days_of_week.filter((d) => d !== day)
        : [...prev.days_of_week, day].sort((a, b) => a - b),
    }));
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!form.doctor_id) { toast.error("Select a doctor"); return; }
    if (form.days_of_week.length === 0) { toast.error("Select at least one day"); return; }
    if (form.end_time <= form.start_time) { toast.error("End time must be after start time"); return; }
    const maxApt = parseInt(form.max_appointments);
    if (isNaN(maxApt) || maxApt < 1 || maxApt > 500) { toast.error("Max appointments must be 1 to 500"); return; }

    setLoading(true);
    try {
      const supabase = createClient();
      const payload = {
        doctor_id: form.doctor_id,
        pharmacy_id: pharmacy.id,
        days_of_week: form.days_of_week,
        start_time: form.start_time + ":00",
        end_time: form.end_time + ":00",
        max_appointments: maxApt,
        notes: form.notes.trim() || null,
        is_active: true,
      };

      if (editingRecurring) {
        const { data, error } = await supabase
          .from("recurring_sessions")
          .update(payload)
          .eq("id", editingRecurring.id)
          .select("*, doctors(id, name, specialty)")
          .single();
        if (error) { toast.error(error.message); return; }
        setRecurringSessions((prev) => prev.map((r) => (r.id === editingRecurring.id ? data : r)));
        toast.success("Schedule updated!");
      } else {
        const { data, error } = await supabase
          .from("recurring_sessions")
          .insert(payload)
          .select("*, doctors(id, name, specialty)")
          .single();
        if (error) { toast.error(error.message); return; }
        setRecurringSessions((prev) => [data, ...prev]);
        toast.success("Recurring schedule created! Today session will appear automatically if today is included.");
      }

      setShowForm(false);
    } finally {
      setLoading(false);
    }
  }

  async function toggleRecurringActive(rs: RecurringSessionWithDoctor) {
    const supabase = createClient();
    const { error } = await supabase
      .from("recurring_sessions")
      .update({ is_active: !rs.is_active })
      .eq("id", rs.id);
    if (error) { toast.error(error.message); return; }
    setRecurringSessions((prev) =>
      prev.map((r) => (r.id === rs.id ? { ...r, is_active: !r.is_active } : r))
    );
    toast.success(rs.is_active ? "Schedule paused" : "Schedule activated");
  }

  async function deleteRecurring(rs: RecurringSessionWithDoctor) {
    if (!confirm("Delete recurring schedule for Dr. " + rs.doctors?.name + "? Future auto-generated sessions will no longer be created.")) return;
    const supabase = createClient();
    const { error } = await supabase.from("recurring_sessions").delete().eq("id", rs.id);
    if (error) { toast.error(error.message); return; }
    setRecurringSessions((prev) => prev.filter((r) => r.id !== rs.id));
    toast.success("Recurring schedule deleted");
  }

  async function updateSessionStatus(sessionId: string, status: string) {
    const supabase = createClient();
    const { error } = await supabase.from("sessions").update({ status }).eq("id", sessionId);
    if (error) { toast.error(error.message); return; }
    setSessions((prev) => prev.map((s) => (s.id === sessionId ? { ...s, status: status as Session["status"] } : s)));
    toast.success("Session updated");
    if (status === "active") router.push("/queue?session=" + sessionId);
  }

  async function deleteSession(sessionId: string) {
    if (!confirm("Delete this session? All appointments will also be deleted.")) return;
    const supabase = createClient();
    const { error } = await supabase.from("sessions").delete().eq("id", sessionId);
    if (error) { toast.error(error.message); return; }
    setSessions((prev) => prev.filter((s) => s.id !== sessionId));
    toast.success("Session deleted");
  }

  async function toggleBookingOpen(sessionId: string, open: boolean) {
    const supabase = createClient();
    const { error } = await supabase.from("sessions").update({ booking_open: open }).eq("id", sessionId);
    if (error) { toast.error(error.message); return; }
    setSessions((prev) => prev.map((s) => (s.id === sessionId ? { ...s, booking_open: open } : s)));
    toast.success(open ? "Booking resumed" : "Booking paused");
  }

  const todaySessions = sessions.filter((s) => s.date === today);
  const upcomingSessions = sessions.filter((s) => s.date > today);
  const pastSessions = sessions.filter((s) => s.date < today);

  function RecurringCard({ rs }: { rs: RecurringSessionWithDoctor }) {
    return (
      <div className={"bg-white rounded-2xl border overflow-hidden transition-all hover:shadow-md " + (rs.is_active ? "border-border" : "border-border opacity-60")}>
        <div className={"h-1 w-full " + (rs.is_active ? "bg-gradient-to-r from-blue-400 to-teal-500" : "bg-gray-200")} />
        <div className="p-5">
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="font-bold text-foreground text-sm">Dr. {rs.doctors?.name || "Unknown"}</p>
                <span className={"text-[10px] font-bold px-2 py-0.5 rounded-full border " + (rs.is_active ? "bg-green-50 text-green-700 border-green-200" : "bg-gray-50 text-gray-500 border-gray-200")}>
                  {rs.is_active ? "Active" : "Paused"}
                </span>
              </div>
              {rs.doctors?.specialty && <p className="text-xs text-muted-foreground mt-0.5">{rs.doctors.specialty}</p>}
            </div>
            <Repeat className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
          </div>

          <div className="flex gap-1 flex-wrap mb-3">
            {DAYS.map((day, i) => (
              <span key={i} className={"text-[11px] font-bold px-2 py-1 rounded-lg " + (rs.days_of_week.includes(i) ? "bg-blue-600 text-white" : "bg-muted text-muted-foreground/40")}>
                {day}
              </span>
            ))}
          </div>

          <div className="flex items-center gap-3 text-xs text-muted-foreground mb-4">
            <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{formatTime(rs.start_time)} to {formatTime(rs.end_time)}</span>
            <span className="flex items-center gap-1"><Users className="w-3 h-3" />Max {rs.max_appointments}</span>
          </div>

          <div className="flex gap-2 flex-wrap">
            <button onClick={() => openEdit(rs)} className="flex items-center gap-1 px-2.5 py-1.5 border border-border rounded-lg text-xs font-semibold text-foreground hover:bg-muted transition-colors">
              <Edit2 className="w-3 h-3" />Edit
            </button>
            <button onClick={() => toggleRecurringActive(rs)}
              className={"flex items-center gap-1 px-2.5 py-1.5 border rounded-lg text-xs font-semibold transition-colors " + (rs.is_active ? "border-amber-200 text-amber-700 hover:bg-amber-50" : "border-green-200 text-green-700 hover:bg-green-50")}>
              {rs.is_active ? <PauseCircle className="w-3 h-3" /> : <PlayCircle className="w-3 h-3" />}
              {rs.is_active ? "Pause" : "Activate"}
            </button>
            <button onClick={() => deleteRecurring(rs)} className="p-1.5 border border-border rounded-lg text-muted-foreground hover:text-red-600 hover:border-red-200 hover:bg-red-50 transition-colors">
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  function SessionCard({ session }: { session: SessionWithDoctor }) {
    const stats = {
      total: session.appointments?.filter((a) => a.status !== "cancelled").length || 0,
      completed: session.appointments?.filter((a) => a.status === "completed").length || 0,
      waiting: session.appointments?.filter((a) => ["waiting", "called", "in-progress"].includes(a.status)).length || 0,
    };
    const pct = stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0;
    const statusColor = getSessionStatusColor(session.status);

    return (
      <div className="bg-white rounded-2xl border border-border overflow-hidden hover:shadow-md transition-all">
        <div className={"h-1 w-full " + (
          session.status === "active" ? "bg-gradient-to-r from-green-400 to-emerald-500" :
          session.status === "paused" ? "bg-gradient-to-r from-amber-400 to-amber-500" :
          session.status === "completed" ? "bg-gradient-to-r from-gray-300 to-gray-400" :
          "bg-gradient-to-r from-blue-400 to-blue-500"
        )} />
        <div className="p-5">
          <div className="mb-4">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <p className="font-bold text-foreground">Dr. {session.doctors?.name || "Unknown"}</p>
              <span className={"text-xs font-semibold px-2 py-0.5 rounded-full capitalize " + statusColor}>
                {session.status}
                {session.status === "active" && (
                  <span className="ml-1 inline-block w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                )}
              </span>
              {!session.booking_open && (session.status === "active" || session.status === "scheduled") && (
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-orange-50 text-orange-700 border border-orange-200">
                  Booking Paused
                </span>
              )}
              {session.recurring_session_id && (
                <span title="Auto-generated from recurring schedule" className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 border border-blue-200 flex items-center gap-0.5">
                  <Repeat className="w-2.5 h-2.5" />Recurring
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              {session.doctors?.specialty} {session.doctors?.specialty ? "·" : ""} {format(parseISO(session.date), "dd MMM yyyy")}
            </p>
            <p className="text-xs text-muted-foreground">
              <Clock className="w-3 h-3 inline mr-1" />
              {formatTime(session.start_time)} to {formatTime(session.end_time)} · Max {session.max_appointments}
            </p>
          </div>

          <div className="flex gap-3 mb-4">
            <div className="flex-1 bg-muted rounded-xl p-2.5 text-center">
              <p className="text-lg font-bold text-foreground">{stats.total}</p>
              <p className="text-[10px] text-muted-foreground">Booked</p>
            </div>
            <div className="flex-1 bg-green-50 rounded-xl p-2.5 text-center">
              <p className="text-lg font-bold text-green-700">{stats.completed}</p>
              <p className="text-[10px] text-muted-foreground">Done</p>
            </div>
            <div className="flex-1 bg-blue-50 rounded-xl p-2.5 text-center">
              <p className="text-lg font-bold text-blue-700">{stats.waiting}</p>
              <p className="text-[10px] text-muted-foreground">Waiting</p>
            </div>
          </div>

          {stats.total > 0 && (
            <div className="mb-4">
              <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-green-400 to-emerald-500 rounded-full transition-all" style={{ width: pct + "%" }} />
              </div>
              <p className="text-xs text-muted-foreground mt-1">{pct}% completed</p>
            </div>
          )}

          <div className="flex gap-2 flex-wrap">
            {session.status === "scheduled" && session.date === today && (
              <button onClick={() => updateSessionStatus(session.id, "active")}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-green-500 text-white rounded-xl text-xs font-bold hover:bg-green-600 transition-all">
                <PlayCircle className="w-3.5 h-3.5" />Start Now
              </button>
            )}
            {session.status === "active" && (
              <>
                <button onClick={() => router.push("/queue?session=" + session.id)}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-gradient-to-r from-blue-600 to-teal-600 text-white rounded-xl text-xs font-bold hover:shadow-md transition-all">
                  <ArrowRight className="w-3.5 h-3.5" />Open Queue
                </button>
                <button onClick={() => updateSessionStatus(session.id, "paused")}
                  className="flex items-center justify-center px-3 py-2 bg-amber-100 text-amber-700 border border-amber-200 rounded-xl text-xs font-semibold hover:bg-amber-200 transition-all">
                  <PauseCircle className="w-3.5 h-3.5" />
                </button>
              </>
            )}
            {session.status === "paused" && (
              <button onClick={() => updateSessionStatus(session.id, "active")}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-green-500 text-white rounded-xl text-xs font-bold hover:bg-green-600 transition-all">
                <PlayCircle className="w-3.5 h-3.5" />Resume
              </button>
            )}
            {(session.status === "scheduled" || session.status === "paused") && (
              <button onClick={() => updateSessionStatus(session.id, "completed")}
                className="flex items-center justify-center px-3 py-2 bg-muted rounded-xl text-xs font-semibold text-muted-foreground hover:bg-gray-200 transition-all">
                <CheckCircle className="w-3.5 h-3.5" />
              </button>
            )}
            {session.status !== "active" && (
              <button onClick={() => deleteSession(session.id)}
                className="flex items-center justify-center p-2 border border-border rounded-xl text-muted-foreground hover:text-red-600 hover:border-red-200 hover:bg-red-50 transition-colors">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
            {(session.status === "active" || session.status === "scheduled") && (
              <button onClick={() => toggleBookingOpen(session.id, !session.booking_open)}
                title={session.booking_open ? "Pause new patient bookings" : "Resume patient bookings"}
                className={"flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition-all " + (
                  session.booking_open
                    ? "bg-orange-50 text-orange-700 border-orange-200 hover:bg-orange-100"
                    : "bg-green-50 text-green-700 border-green-200 hover:bg-green-100"
                )}>
                {session.booking_open
                  ? <><PauseCircle className="w-3.5 h-3.5" /><span>Booking</span></>
                  : <><PlayCircle className="w-3.5 h-3.5" /><span>Booking</span></>}
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto space-y-10">

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-foreground">Recurring Schedules</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Today sessions are auto-generated each day from these templates</p>
        </div>
        <button
          onClick={openCreate}
          disabled={doctors.length === 0}
          className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-teal-600 text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed">
          <Plus className="w-4 h-4" />New Schedule
        </button>
      </div>

      {doctors.length === 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 text-center">
          <p className="text-amber-800 font-semibold text-sm">No doctors added yet</p>
          <p className="text-amber-700 text-xs mt-1">Add at least one doctor before creating schedules</p>
        </div>
      )}

      {recurringSessions.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {recurringSessions.map((rs) => <RecurringCard key={rs.id} rs={rs} />)}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-12 text-center bg-blue-50/50 rounded-3xl border-2 border-dashed border-blue-200">
          <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mb-4">
            <Repeat className="w-8 h-8 text-blue-400" />
          </div>
          <h3 className="font-bold text-foreground mb-1">No recurring schedules yet</h3>
          <p className="text-sm text-muted-foreground mb-5 max-w-xs">
            Create a schedule once, pick the days of the week and time, and sessions will appear automatically every matching day.
          </p>
          <button onClick={openCreate} disabled={doctors.length === 0}
            className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-teal-600 text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:shadow-lg transition-all disabled:opacity-50">
            <Plus className="w-4 h-4" />Create First Schedule
          </button>
        </div>
      )}

      {todaySessions.length > 0 && (
        <div>
          <h2 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            Today Sessions
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {todaySessions.map((s) => <SessionCard key={s.id} session={s} />)}
          </div>
        </div>
      )}

      {todaySessions.length === 0 && recurringSessions.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 text-center">
          <p className="text-amber-800 font-semibold text-sm">No sessions for today</p>
          <p className="text-amber-700 text-xs mt-1">
            {DAY_FULL[new Date().getDay()]} is not included in any active recurring schedule.
          </p>
        </div>
      )}

      {upcomingSessions.length > 0 && (
        <div>
          <h2 className="text-lg font-bold text-foreground mb-4">Upcoming Sessions</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {upcomingSessions.map((s) => <SessionCard key={s.id} session={s} />)}
          </div>
        </div>
      )}

      {pastSessions.length > 0 && (
        <div>
          <h2 className="text-lg font-bold text-foreground mb-4">Recent Sessions</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {pastSessions.map((s) => <SessionCard key={s.id} session={s} />)}
          </div>
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowForm(false)} />
          <div className="relative bg-white rounded-3xl border border-border shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="bg-gradient-to-r from-blue-600 to-teal-600 px-6 py-5 rounded-t-3xl sticky top-0 z-10">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-bold text-lg text-white">
                    {editingRecurring ? "Edit Schedule" : "New Recurring Schedule"}
                  </h2>
                  <p className="text-sm text-blue-100 mt-0.5">Sessions auto-generate every selected day</p>
                </div>
                <button onClick={() => setShowForm(false)} className="text-white/70 hover:text-white transition-colors">
                  <XCircle className="w-5 h-5" />
                </button>
              </div>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-5">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Doctor *</label>
                <select
                  value={form.doctor_id}
                  onChange={(e) => setForm((p) => ({ ...p, doctor_id: e.target.value }))}
                  required
                  className="w-full h-11 px-4 rounded-xl border border-input text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary bg-white">
                  <option value="">Select a doctor</option>
                  {doctors.map((d) => (
                    <option key={d.id} value={d.id}>Dr. {d.name}{d.specialty ? " - " + d.specialty : ""}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Days of Week *</label>
                <div className="grid grid-cols-7 gap-1.5">
                  {DAYS.map((day, i) => (
                    <button key={i} type="button" onClick={() => toggleDay(i)}
                      className={"py-2.5 rounded-xl text-xs font-bold text-center transition-all border " + (
                        form.days_of_week.includes(i)
                          ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                          : "bg-white text-muted-foreground border-border hover:border-blue-300 hover:text-blue-600"
                      )}>
                      {day}
                    </button>
                  ))}
                </div>
                {form.days_of_week.length > 0 && (
                  <p className="text-xs text-blue-700 mt-2 font-medium">
                    Sessions every: {form.days_of_week.map((d) => DAY_FULL[d]).join(", ")}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">Start Time *</label>
                  <input type="time" value={form.start_time}
                    onChange={(e) => setForm((p) => ({ ...p, start_time: e.target.value }))}
                    required
                    className="w-full h-11 px-4 rounded-xl border border-input text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">End Time *</label>
                  <input type="time" value={form.end_time}
                    onChange={(e) => setForm((p) => ({ ...p, end_time: e.target.value }))}
                    required
                    className="w-full h-11 px-4 rounded-xl border border-input text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Max Patients per Day</label>
                <input type="number" value={form.max_appointments}
                  onChange={(e) => setForm((p) => ({ ...p, max_appointments: e.target.value }))}
                  min="1" max="500"
                  className="w-full h-11 px-4 rounded-xl border border-input text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary" />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Notes (optional)</label>
                <textarea value={form.notes}
                  onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
                  placeholder="e.g. Morning session only, no walk-ins..."
                  rows={2}
                  className="w-full px-4 py-3 rounded-xl border border-input text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary resize-none" />
              </div>

              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setShowForm(false)}
                  className="flex-1 h-11 border-2 border-border rounded-xl text-sm font-semibold hover:bg-muted transition-all">
                  Cancel
                </button>
                <button type="submit" disabled={loading}
                  className="flex-1 h-11 bg-gradient-to-r from-blue-600 to-teal-600 text-white font-semibold rounded-xl flex items-center justify-center gap-2 hover:shadow-lg transition-all disabled:opacity-60">
                  {loading ? (
                    <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                  ) : (editingRecurring ? "Save Changes" : "Create Schedule")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
