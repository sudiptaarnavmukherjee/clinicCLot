"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  PlayCircle, PauseCircle, StopCircle, ChevronRight,
  Check, SkipForward, UserX, Plus, Clock, Users,
  CheckCircle2, AlertCircle, Phone, Calendar, Wifi, WifiOff
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
  getStatusColor, getStatusLabel, formatTime, calculateQueueStats,
  formatWaitTime, calculateEstimatedWait
} from "@/lib/utils";
import { toast } from "sonner";
import type { Appointment, Session, Pharmacy } from "@/lib/types";
import AddPatientModal from "@/components/queue/AddPatientModal";

interface Doctor {
  id: string;
  name: string;
  specialty: string | null;
  avg_consultation_duration: number;
}

type SessionWithDoctor = Session & { doctors: Doctor | null };

interface Props {
  pharmacy: Pharmacy;
  sessions: SessionWithDoctor[];
  initialAppointments: Appointment[];
  initialSessionId: string | null;
}

export default function QueueClient({
  pharmacy,
  sessions,
  initialAppointments,
  initialSessionId,
}: Props) {
  const router = useRouter();
  const [selectedSessionId, setSelectedSessionId] = useState(initialSessionId);
  const [appointments, setAppointments] = useState<Appointment[]>(initialAppointments);
  const [sessionStatus, setSessionStatus] = useState<string>(
    sessions.find((s) => s.id === initialSessionId)?.status || "scheduled"
  );
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(true);
  const [showAddPatient, setShowAddPatient] = useState(false);

  // Keep a ref to latest appointments for use inside stable callbacks
  const appointmentsRef = useRef(appointments);
  useEffect(() => { appointmentsRef.current = appointments; }, [appointments]);

  const supabase = createClient();
  const selectedSession = sessions.find((s) => s.id === selectedSessionId) as SessionWithDoctor | undefined;

  // Real-time subscription
  useEffect(() => {
    if (!selectedSessionId) return;

    const channel = supabase
      .channel(`queue-${selectedSessionId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "appointments",
          filter: `session_id=eq.${selectedSessionId}`,
        },
        (payload) => {
          setIsConnected(true);
          if (payload.eventType === "INSERT") {
            setAppointments((prev) => {
              const exists = prev.find((a) => a.id === (payload.new as Appointment).id);
              if (exists) return prev;
              const newApt = payload.new as Appointment;
              return [...prev, newApt].sort((a, b) => a.serial_number - b.serial_number);
            });
            toast.info(`New patient: ${(payload.new as Appointment).patient_name} (#${(payload.new as Appointment).serial_number})`);
          } else if (payload.eventType === "UPDATE") {
            setAppointments((prev) =>
              prev.map((a) =>
                a.id === (payload.new as Appointment).id ? (payload.new as Appointment) : a
              )
            );
          } else if (payload.eventType === "DELETE") {
            setAppointments((prev) => prev.filter((a) => a.id !== (payload.old as Appointment).id));
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "sessions",
          filter: `id=eq.${selectedSessionId}`,
        },
        (payload) => {
          const newStatus = (payload.new as Session).status;
          setSessionStatus(newStatus);
        }
      )
      .subscribe((status) => {
        setIsConnected(status === "SUBSCRIBED");
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedSessionId]);

  // Switch session
  function switchSession(sessionId: string) {
    setSelectedSessionId(sessionId);
    const session = sessions.find((s) => s.id === sessionId);
    setSessionStatus(session?.status || "scheduled");
    router.push(`/queue?session=${sessionId}`);

    // Load appointments for new session
    supabase
      .from("appointments")
      .select("*")
      .eq("session_id", sessionId)
      .neq("status", "cancelled")
      .order("serial_number")
      .then(({ data }) => setAppointments(data || []));
  }

  // Update appointment status — optimistic update, revert on error
  const updateAppointmentStatus = useCallback(
    async (appointmentId: string, newStatus: string) => {
      const now = new Date().toISOString();
      const updateData: Record<string, unknown> = { status: newStatus };
      if (newStatus === "called") updateData.called_at = now;
      if (newStatus === "in-progress") updateData.started_at = now;
      if (newStatus === "completed" || newStatus === "skipped" || newStatus === "no-show") {
        updateData.completed_at = now;
      }

      // Snapshot for rollback
      const previous = appointmentsRef.current.find((a) => a.id === appointmentId);

      // Optimistic: update local state immediately
      setAppointments((prev) =>
        prev.map((a) =>
          a.id === appointmentId ? { ...a, ...updateData } as Appointment : a
        )
      );

      setActionLoading(appointmentId + newStatus);
      try {
        const { error } = await supabase
          .from("appointments")
          .update(updateData)
          .eq("id", appointmentId);

        if (error) {
          toast.error("Failed to update — please try again");
          // Revert optimistic update
          if (previous) {
            setAppointments((prev) =>
              prev.map((a) => (a.id === appointmentId ? previous : a))
            );
          }
        }
      } finally {
        setActionLoading(null);
      }
    },
    [supabase]
  );

  // Call next patient
  async function callNextPatient() {
    const nextWaiting = appointments
      .filter((a) => a.status === "waiting")
      .sort((a, b) => a.serial_number - b.serial_number)[0];

    if (!nextWaiting) {
      toast.info("No more waiting patients");
      return;
    }

    // Mark any in-progress as completed
    const inProgress = appointments.find((a) => a.status === "in-progress" || a.status === "called");
    if (inProgress) {
      await updateAppointmentStatus(inProgress.id, "completed");
    }

    await updateAppointmentStatus(nextWaiting.id, "called");
    toast.success(`Called: ${nextWaiting.patient_name} (#${nextWaiting.serial_number})`);
  }

  // Toggle session status — optimistic
  async function toggleSessionStatus(newStatus: string) {
    if (!selectedSessionId) return;
    const previous = sessionStatus;
    setSessionStatus(newStatus); // optimistic
    setActionLoading("session-" + newStatus);
    try {
      const { error } = await supabase
        .from("sessions")
        .update({ status: newStatus })
        .eq("id", selectedSessionId);

      if (error) {
        toast.error("Failed to update session");
        setSessionStatus(previous); // revert
      } else {
        const labels: Record<string, string> = {
          active: "Session is now live!",
          paused: "Session paused",
          completed: "Session completed",
        };
        toast.success(labels[newStatus] || "Session updated");
      }
    } finally {
      setActionLoading(null);
    }
  }

  const stats = calculateQueueStats(appointments);
  const currentPatient = appointments.find(
    (a) => a.status === "in-progress" || a.status === "called"
  );
  const waitingPatients = appointments
    .filter((a) => a.status === "waiting")
    .sort((a, b) => a.serial_number - b.serial_number);
  const donePatients = appointments.filter((a) =>
    ["completed", "skipped", "no-show"].includes(a.status)
  );
  const avgDuration = selectedSession?.doctors?.avg_consultation_duration || 10;
  const completionPct = stats.total > 0 ? Math.round(((stats.completed + stats.skipped) / stats.total) * 100) : 0;

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-5">
      {/* Session selector */}
      {sessions.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {sessions.map((session) => (
            <button
              key={session.id}
              onClick={() => switchSession(session.id)}
              className={`flex-shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-semibold transition-all ${
                selectedSessionId === session.id
                  ? "bg-gradient-to-r from-blue-600 to-teal-600 text-white border-transparent shadow-sm"
                  : "bg-white border-border text-muted-foreground hover:border-blue-300"
              }`}
            >
              <span>Dr. {session.doctors?.name}</span>
              {session.status === "active" && (
                <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              )}
            </button>
          ))}
        </div>
      )}

      {!selectedSession ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Calendar className="w-16 h-16 text-muted-foreground/30 mb-4" />
          <h2 className="text-xl font-bold text-foreground mb-2">No session selected</h2>
          <p className="text-muted-foreground mb-6">Create a session to start managing the queue</p>
          <a
            href="/sessions?new=1"
            className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-600 to-teal-600 text-white font-semibold px-6 py-3 rounded-xl hover:shadow-lg transition-all"
          >
            <Plus className="w-4 h-4" />
            Create Session
          </a>
        </div>
      ) : (
        <>
          {/* Session header */}
          <div className="bg-white rounded-2xl border border-border overflow-hidden">
            <div className={`h-1.5 w-full ${sessionStatus === "active" ? "bg-gradient-to-r from-green-400 to-emerald-500" : sessionStatus === "paused" ? "bg-gradient-to-r from-amber-400 to-amber-500" : "bg-gradient-to-r from-gray-300 to-gray-400"}`} />
            <div className="p-5">
              <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-1">
                    <h2 className="font-bold text-lg text-foreground">
                      Dr. {selectedSession.doctors?.name}
                    </h2>
                    <div className="flex items-center gap-1.5">
                      {isConnected ? (
                        <Wifi className="w-3.5 h-3.5 text-green-500" />
                      ) : (
                        <WifiOff className="w-3.5 h-3.5 text-red-500" />
                      )}
                      <span className={`text-xs font-semibold ${isConnected ? "text-green-600" : "text-red-600"}`}>
                        {isConnected ? "Live" : "Reconnecting..."}
                      </span>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {selectedSession.doctors?.specialty} ·{" "}
                    {formatTime(selectedSession.start_time)} – {formatTime(selectedSession.end_time)} ·{" "}
                    Max {selectedSession.max_appointments} patients
                  </p>
                </div>

                {/* Session controls */}
                <div className="flex gap-2 flex-wrap">
                  {sessionStatus === "scheduled" && (
                    <button
                      onClick={() => toggleSessionStatus("active")}
                      disabled={!!actionLoading}
                      className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl text-sm font-semibold hover:shadow-md transition-all disabled:opacity-60"
                    >
                      <PlayCircle className="w-4 h-4" />
                      Start Session
                    </button>
                  )}
                  {sessionStatus === "active" && (
                    <>
                      <button
                        onClick={() => toggleSessionStatus("paused")}
                        disabled={!!actionLoading}
                        className="flex items-center gap-2 px-4 py-2.5 bg-amber-500 text-white rounded-xl text-sm font-semibold hover:bg-amber-600 transition-all disabled:opacity-60"
                      >
                        <PauseCircle className="w-4 h-4" />
                        Pause
                      </button>
                      <button
                        onClick={() => toggleSessionStatus("completed")}
                        disabled={!!actionLoading}
                        className="flex items-center gap-2 px-4 py-2.5 bg-gray-600 text-white rounded-xl text-sm font-semibold hover:bg-gray-700 transition-all disabled:opacity-60"
                      >
                        <StopCircle className="w-4 h-4" />
                        End Session
                      </button>
                    </>
                  )}
                  {sessionStatus === "paused" && (
                    <button
                      onClick={() => toggleSessionStatus("active")}
                      disabled={!!actionLoading}
                      className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl text-sm font-semibold hover:shadow-md transition-all disabled:opacity-60"
                    >
                      <PlayCircle className="w-4 h-4" />
                      Resume
                    </button>
                  )}
                  <button
                    onClick={() => setShowAddPatient(true)}
                    className="flex items-center gap-2 px-4 py-2.5 bg-blue-50 border border-blue-200 text-blue-700 rounded-xl text-sm font-semibold hover:bg-blue-100 transition-all"
                  >
                    <Plus className="w-4 h-4" />
                    Add Patient
                  </button>
                </div>
              </div>

              {/* Progress bar */}
              <div className="mt-4">
                <div className="flex justify-between text-xs text-muted-foreground mb-1.5">
                  <span>{stats.completed + stats.skipped} of {stats.total} completed</span>
                  <span>{completionPct}%</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-blue-500 to-teal-500 rounded-full transition-all duration-500"
                    style={{ width: `${completionPct}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-4 gap-3">
            {[
              { label: "Total", value: stats.total, Icon: Users, color: "text-foreground", bg: "bg-white" },
              { label: "Waiting", value: stats.waiting, Icon: Clock, color: "text-blue-600", bg: "bg-blue-50" },
              { label: "Completed", value: stats.completed, Icon: CheckCircle2, color: "text-green-600", bg: "bg-green-50" },
              { label: "Skipped", value: stats.skipped + stats.no_show, Icon: AlertCircle, color: "text-gray-500", bg: "bg-gray-50" },
            ].map((s) => (
              <div key={s.label} className={`${s.bg} rounded-xl border border-border p-3 text-center`}>
                <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
            {/* Current patient + Call next */}
            <div className="lg:col-span-2 space-y-4">
              {/* Current patient */}
              <div className={`bg-white rounded-2xl border-2 p-5 ${currentPatient ? "border-purple-300 animate-pulse-ring" : "border-border"}`}>
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">Currently Seeing</p>
                {currentPatient ? (
                  <>
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center text-white font-black text-xl shadow-lg shadow-purple-500/30">
                        #{currentPatient.serial_number.toString().padStart(2, "0")}
                      </div>
                      <div>
                        <p className="font-bold text-foreground text-lg">{currentPatient.patient_name}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          {currentPatient.patient_phone && (
                            <span className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Phone className="w-3 h-3" />
                              {currentPatient.patient_phone}
                            </span>
                          )}
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${getStatusColor(currentPatient.status)}`}>
                            {getStatusLabel(currentPatient.status)}
                          </span>
                        </div>
                      </div>
                    </div>
                    {currentPatient.reason && (
                      <p className="text-xs text-muted-foreground bg-muted rounded-lg px-3 py-2 mb-4">
                        📋 {currentPatient.reason}
                      </p>
                    )}
                    <div className="flex gap-2">
                      <button
                        onClick={() => updateAppointmentStatus(currentPatient.id, "completed")}
                        disabled={!!actionLoading}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-green-500 text-white rounded-xl text-sm font-bold hover:bg-green-600 transition-all disabled:opacity-60 active:scale-95"
                      >
                        <Check className="w-4 h-4" />
                        Done
                      </button>
                      <button
                        onClick={() => updateAppointmentStatus(currentPatient.id, "no-show")}
                        disabled={!!actionLoading}
                        className="flex items-center justify-center gap-1.5 px-3 py-2.5 bg-orange-100 text-orange-700 border border-orange-200 rounded-xl text-sm font-semibold hover:bg-orange-200 transition-all disabled:opacity-60"
                      >
                        <UserX className="w-4 h-4" />
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="text-center py-4">
                    <div className="w-12 h-12 bg-muted rounded-2xl flex items-center justify-center mx-auto mb-3">
                      <Users className="w-6 h-6 text-muted-foreground/50" />
                    </div>
                    <p className="text-sm text-muted-foreground font-medium">No patient in progress</p>
                    <p className="text-xs text-muted-foreground/60 mt-1">Call the next patient</p>
                  </div>
                )}
              </div>

              {/* Call next button */}
              <button
                onClick={callNextPatient}
                disabled={waitingPatients.length === 0 || sessionStatus !== "active"}
                className="w-full flex items-center justify-center gap-3 py-5 bg-gradient-to-r from-blue-600 to-teal-600 text-white rounded-2xl font-bold text-lg shadow-xl shadow-blue-500/25 hover:shadow-2xl hover:shadow-blue-500/30 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]"
              >
                <ChevronRight className="w-6 h-6" />
                Call Next Patient
                {waitingPatients.length > 0 && (
                  <span className="bg-white/20 px-2.5 py-0.5 rounded-full text-sm">
                    {waitingPatients.length} waiting
                  </span>
                )}
              </button>

              {/* Next up preview */}
              {waitingPatients.slice(0, 3).map((apt, i) => (
                <div key={apt.id} className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${i === 0 ? "border-blue-200 bg-blue-50" : "border-border bg-white"}`}>
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold ${i === 0 ? "bg-blue-600 text-white" : "bg-muted text-muted-foreground"}`}>
                    #{apt.serial_number.toString().padStart(2, "0")}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">{apt.patient_name}</p>
                    <p className="text-xs text-muted-foreground">{i === 0 ? "Next up" : `~${(i + 1) * avgDuration} min wait`}</p>
                  </div>
                  {apt.is_priority && (
                    <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-semibold">Priority</span>
                  )}
                </div>
              ))}
            </div>

            {/* Full queue list */}
            <div className="lg:col-span-3 bg-white rounded-2xl border border-border overflow-hidden">
              <div className="p-4 border-b border-border flex items-center justify-between">
                <h3 className="font-bold text-foreground">Full Queue</h3>
                <span className="text-xs text-muted-foreground">{stats.waiting} waiting</span>
              </div>

              <div className="overflow-y-auto max-h-[600px]">
                {appointments.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <Users className="w-12 h-12 text-muted-foreground/20 mb-3" />
                    <p className="text-sm font-medium text-muted-foreground">No patients yet</p>
                    <p className="text-xs text-muted-foreground/60 mt-1">Patients will appear here when they book</p>
                  </div>
                ) : (
                  <div className="divide-y divide-border">
                    {appointments
                      .sort((a, b) => a.serial_number - b.serial_number)
                      .map((apt) => {
                        const isDone = ["completed", "skipped", "no-show"].includes(apt.status);
                        const isActive = apt.status === "in-progress" || apt.status === "called";
                        const positionInWaiting = waitingPatients.findIndex((w) => w.id === apt.id);
                        const estWait = positionInWaiting >= 0 ? calculateEstimatedWait(positionInWaiting, avgDuration) : 0;

                        return (
                          <div
                            key={apt.id}
                            className={`flex items-center gap-3 px-4 py-3.5 transition-all ${
                              isActive ? "bg-purple-50" : isDone ? "bg-gray-50 opacity-70" : "hover:bg-muted/50"
                            }`}
                          >
                            {/* Serial number */}
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold flex-shrink-0 ${
                              isActive ? "bg-purple-600 text-white shadow-lg shadow-purple-500/30" :
                              isDone ? "bg-muted text-muted-foreground" :
                              "bg-blue-50 text-blue-700"
                            }`}>
                              {isDone && apt.status === "completed" ? <Check className="w-4 h-4 text-green-500" /> :
                               isDone ? <SkipForward className="w-4 h-4 text-gray-400" /> :
                               `#${apt.serial_number.toString().padStart(2, "0")}`}
                            </div>

                            {/* Patient info */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <p className={`text-sm font-semibold truncate ${isDone ? "text-muted-foreground line-through" : "text-foreground"}`}>
                                  {apt.patient_name}
                                </p>
                                {apt.is_priority && <span className="text-[10px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full font-bold">PRIORITY</span>}
                              </div>
                              <div className="flex items-center gap-2 mt-0.5">
                                {apt.patient_phone && (
                                  <span className="text-xs text-muted-foreground">{apt.patient_phone}</span>
                                )}
                                {apt.reason && (
                                  <span className="text-xs text-muted-foreground truncate max-w-[120px]">· {apt.reason}</span>
                                )}
                              </div>
                            </div>

                            {/* Status & actions */}
                            <div className="flex items-center gap-2 flex-shrink-0">
                              {!isDone && !isActive && positionInWaiting >= 0 && (
                                <span className="text-xs text-muted-foreground hidden sm:block">
                                  {formatWaitTime(estWait)}
                                </span>
                              )}
                              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${getStatusColor(apt.status)}`}>
                                {getStatusLabel(apt.status)}
                              </span>
                              {/* Quick actions */}
                              {!isDone && (
                                <div className="flex gap-1">
                                  {!isActive && (
                                    <button
                                      onClick={() => updateAppointmentStatus(apt.id, "called")}
                                      disabled={!!actionLoading}
                                      title="Call patient"
                                      className="w-7 h-7 rounded-lg bg-green-50 border border-green-200 text-green-700 hover:bg-green-100 flex items-center justify-center transition-colors disabled:opacity-50"
                                    >
                                      <ChevronRight className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                  {isActive && (
                                    <button
                                      onClick={() => updateAppointmentStatus(apt.id, "completed")}
                                      disabled={!!actionLoading}
                                      title="Mark done"
                                      className="w-7 h-7 rounded-lg bg-green-50 border border-green-200 text-green-700 hover:bg-green-100 flex items-center justify-center transition-colors disabled:opacity-50"
                                    >
                                      <Check className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                  <button
                                    onClick={() => updateAppointmentStatus(apt.id, "skipped")}
                                    disabled={!!actionLoading}
                                    title="Skip"
                                    className="w-7 h-7 rounded-lg bg-orange-50 border border-orange-200 text-orange-600 hover:bg-orange-100 flex items-center justify-center transition-colors disabled:opacity-50"
                                  >
                                    <SkipForward className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}

      {/* Add Patient Modal */}
      {showAddPatient && selectedSessionId && (
        <AddPatientModal
          sessionId={selectedSessionId}
          pharmacyId={pharmacy.id}
          doctorId={selectedSession?.doctor_id || ""}
          currentCount={appointments.filter((a) => a.status !== "cancelled").length}
          onClose={() => setShowAddPatient(false)}
          onAdded={(apt) => {
            setAppointments((prev) => {
              if (prev.find((a) => a.id === apt.id)) return prev;
              return [...prev, apt].sort((a, b) => a.serial_number - b.serial_number);
            });
          }}
        />
      )}
    </div>
  );
}
