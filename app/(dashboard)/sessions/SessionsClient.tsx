"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { format, parseISO } from "date-fns";
import {
  Plus, CalendarDays, Clock, Users, PlayCircle, ArrowRight,
  MoreVertical, Trash2, PauseCircle, CheckCircle
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { formatTime, getSessionStatusColor } from "@/lib/utils";
import { toast } from "sonner";
import type { Doctor, Pharmacy, Session } from "@/lib/types";

type SessionWithDoctor = Session & {
  doctors: { id: string; name: string; specialty: string | null } | null;
  appointments: { status: string }[];
};

interface Props {
  pharmacy: Pharmacy;
  doctors: Doctor[];
  initialSessions: SessionWithDoctor[];
}

export default function SessionsClient({ pharmacy, doctors, initialSessions }: Props) {
  const router = useRouter();
  const [sessions, setSessions] = useState(initialSessions);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [today] = useState(new Date().toISOString().split("T")[0]);
  const [form, setForm] = useState({
    doctor_id: doctors[0]?.id || "",
    date: today,
    start_time: "09:00",
    end_time: "13:00",
    max_appointments: "30",
    notes: "",
  });

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!form.doctor_id || !form.date || !form.start_time || !form.end_time) {
      toast.error("Please fill all required fields");
      return;
    }
    setLoading(true);
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("sessions")
        .insert({
          doctor_id: form.doctor_id,
          pharmacy_id: pharmacy.id,
          date: form.date,
          start_time: form.start_time + ":00",
          end_time: form.end_time + ":00",
          max_appointments: parseInt(form.max_appointments) || 30,
          notes: form.notes || null,
          status: "scheduled",
        })
        .select(`*, doctors(id, name, specialty)`)
        .single();

      if (error) { toast.error(error.message); return; }
      setSessions((prev) => [{ ...data, appointments: [] }, ...prev]);
      toast.success("Session created!");
      setShowForm(false);
    } finally {
      setLoading(false);
    }
  }

  async function updateSessionStatus(sessionId: string, status: string) {
    const supabase = createClient();
    const { error } = await supabase.from("sessions").update({ status }).eq("id", sessionId);
    if (error) { toast.error(error.message); return; }
    setSessions((prev) => prev.map((s) => (s.id === sessionId ? { ...s, status: status as Session["status"] } : s)));
    toast.success("Session updated");
    if (status === "active") router.push(`/queue?session=${sessionId}`);
  }

  async function deleteSession(sessionId: string) {
    if (!confirm("Delete this session? All appointments in this session will also be deleted.")) return;
    const supabase = createClient();
    const { error } = await supabase.from("sessions").delete().eq("id", sessionId);
    if (error) { toast.error(error.message); return; }
    setSessions((prev) => prev.filter((s) => s.id !== sessionId));
    toast.success("Session deleted");
  }

  const todaySessions = sessions.filter((s) => s.date === today);
  const pastSessions = sessions.filter((s) => s.date !== today);

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
        <div className={`h-1 w-full ${
          session.status === "active" ? "bg-gradient-to-r from-green-400 to-emerald-500" :
          session.status === "paused" ? "bg-gradient-to-r from-amber-400 to-amber-500" :
          session.status === "completed" ? "bg-gradient-to-r from-gray-300 to-gray-400" :
          "bg-gradient-to-r from-blue-400 to-blue-500"
        }`} />
        <div className="p-5">
          <div className="flex items-start justify-between gap-3 mb-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <p className="font-bold text-foreground">Dr. {session.doctors?.name || "Unknown"}</p>
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full capitalize ${statusColor}`}>
                  {session.status}
                  {session.status === "active" && (
                    <span className="ml-1 inline-block w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                  )}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                {session.doctors?.specialty} · {format(parseISO(session.date), "dd MMM yyyy")}
              </p>
              <p className="text-xs text-muted-foreground">
                <Clock className="w-3 h-3 inline mr-1" />
                {formatTime(session.start_time)} – {formatTime(session.end_time)} · Max {session.max_appointments}
              </p>
            </div>
          </div>

          {/* Stats */}
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

          {/* Progress */}
          {stats.total > 0 && (
            <div className="mb-4">
              <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-green-400 to-emerald-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
              </div>
              <p className="text-xs text-muted-foreground mt-1">{pct}% completed</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2">
            {session.status === "scheduled" && session.date === today && (
              <button
                onClick={() => updateSessionStatus(session.id, "active")}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-green-500 text-white rounded-xl text-xs font-bold hover:bg-green-600 transition-all"
              >
                <PlayCircle className="w-3.5 h-3.5" />
                Start Now
              </button>
            )}
            {session.status === "active" && (
              <>
                <button
                  onClick={() => router.push(`/queue?session=${session.id}`)}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-gradient-to-r from-blue-600 to-teal-600 text-white rounded-xl text-xs font-bold hover:shadow-md transition-all"
                >
                  <ArrowRight className="w-3.5 h-3.5" />
                  Open Queue
                </button>
                <button
                  onClick={() => updateSessionStatus(session.id, "paused")}
                  className="flex items-center justify-center px-3 py-2 bg-amber-100 text-amber-700 border border-amber-200 rounded-xl text-xs font-semibold hover:bg-amber-200 transition-all"
                >
                  <PauseCircle className="w-3.5 h-3.5" />
                </button>
              </>
            )}
            {session.status === "paused" && (
              <button
                onClick={() => updateSessionStatus(session.id, "active")}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-green-500 text-white rounded-xl text-xs font-bold hover:bg-green-600 transition-all"
              >
                <PlayCircle className="w-3.5 h-3.5" />
                Resume
              </button>
            )}
            {(session.status === "scheduled" || session.status === "paused") && (
              <button
                onClick={() => updateSessionStatus(session.id, "completed")}
                className="flex items-center justify-center px-3 py-2 bg-muted rounded-xl text-xs font-semibold text-muted-foreground hover:bg-gray-200 transition-all"
              >
                <CheckCircle className="w-3.5 h-3.5" />
              </button>
            )}
            {session.status !== "active" && (
              <button
                onClick={() => deleteSession(session.id)}
                className="flex items-center justify-center p-2 border border-border rounded-xl text-muted-foreground hover:text-red-600 hover:border-red-200 hover:bg-red-50 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto space-y-8">
      {/* Create button */}
      <div className="flex justify-end">
        <button
          onClick={() => setShowForm(true)}
          disabled={doctors.length === 0}
          className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-teal-600 text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Plus className="w-4 h-4" />
          New Session
        </button>
      </div>

      {doctors.length === 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 text-center">
          <p className="text-amber-800 font-semibold text-sm">No doctors added yet</p>
          <p className="text-amber-700 text-xs mt-1">Add at least one doctor before creating sessions</p>
        </div>
      )}

      {/* Create form modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowForm(false)} />
          <div className="relative bg-white rounded-3xl border border-border shadow-2xl w-full max-w-md">
            <div className="bg-gradient-to-r from-blue-600 to-teal-600 px-6 py-5 rounded-t-3xl">
              <h2 className="font-bold text-lg text-white">Create Session</h2>
              <p className="text-sm text-blue-100 mt-0.5">Schedule a doctor&apos;s availability window</p>
            </div>
            <form onSubmit={handleCreate} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Doctor *</label>
                <select
                  value={form.doctor_id}
                  onChange={(e) => setForm((p) => ({ ...p, doctor_id: e.target.value }))}
                  required
                  className="w-full h-11 px-4 rounded-xl border border-input text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all bg-white"
                >
                  {doctors.map((d) => (
                    <option key={d.id} value={d.id}>Dr. {d.name} {d.specialty ? `— ${d.specialty}` : ""}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Date *</label>
                <input
                  type="date"
                  value={form.date}
                  onChange={(e) => setForm((p) => ({ ...p, date: e.target.value }))}
                  min={today}
                  required
                  className="w-full h-11 px-4 rounded-xl border border-input text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">Start Time *</label>
                  <input
                    type="time"
                    value={form.start_time}
                    onChange={(e) => setForm((p) => ({ ...p, start_time: e.target.value }))}
                    required
                    className="w-full h-11 px-4 rounded-xl border border-input text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">End Time *</label>
                  <input
                    type="time"
                    value={form.end_time}
                    onChange={(e) => setForm((p) => ({ ...p, end_time: e.target.value }))}
                    required
                    className="w-full h-11 px-4 rounded-xl border border-input text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Max Patients</label>
                <input
                  type="number"
                  value={form.max_appointments}
                  onChange={(e) => setForm((p) => ({ ...p, max_appointments: e.target.value }))}
                  min="1"
                  max="200"
                  className="w-full h-11 px-4 rounded-xl border border-input text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Notes (optional)</label>
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
                  placeholder="Special instructions..."
                  rows={2}
                  className="w-full px-4 py-3 rounded-xl border border-input text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all resize-none"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowForm(false)} className="flex-1 h-11 border-2 border-border rounded-xl text-sm font-semibold hover:bg-muted transition-all">
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
                  ) : "Create Session"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Today's sessions */}
      {todaySessions.length > 0 && (
        <div>
          <h2 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            Today&apos;s Sessions
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {todaySessions.map((s) => <SessionCard key={s.id} session={s} />)}
          </div>
        </div>
      )}

      {/* Past / upcoming sessions */}
      {pastSessions.length > 0 && (
        <div>
          <h2 className="text-lg font-bold text-foreground mb-4">Recent Sessions</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {pastSessions.map((s) => <SessionCard key={s.id} session={s} />)}
          </div>
        </div>
      )}

      {sessions.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-20 h-20 bg-blue-50 rounded-3xl flex items-center justify-center mb-5">
            <CalendarDays className="w-10 h-10 text-blue-300" />
          </div>
          <h2 className="text-xl font-bold text-foreground mb-2">No sessions yet</h2>
          <p className="text-muted-foreground mb-6">Create your first session to start accepting patient bookings</p>
          <button
            onClick={() => setShowForm(true)}
            disabled={doctors.length === 0}
            className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-teal-600 text-white px-6 py-3 rounded-xl font-semibold hover:shadow-lg transition-all disabled:opacity-50"
          >
            <Plus className="w-4 h-4" />
            Create First Session
          </button>
        </div>
      )}
    </div>
  );
}
