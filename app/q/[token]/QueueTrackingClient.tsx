"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Activity, Clock, Users, CheckCircle2, Wifi, WifiOff,
  ArrowRight, Phone, Stethoscope, AlertCircle, RefreshCw, Home
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { maskName, formatTime } from "@/lib/utils";
import type { Appointment, Doctor, Pharmacy, Session } from "@/lib/types";
import Link from "next/link";

interface QueueItem {
  id: string;
  serial_number: number;
  status: string;
  patient_name: string;
  created_at: string;
}

interface Props {
  initialAppointment: Appointment;
  pharmacy: Pharmacy;
  doctor: Doctor;
  session: Session;
  initialQueueList: QueueItem[];
}

type TrackingStatus = "waiting" | "called" | "in-progress" | "completed" | "skipped" | "no-show" | "cancelled";

const STATUS_CONFIG: Record<TrackingStatus, { label: string; color: string; bg: string; icon: React.ReactNode; message: string }> = {
  waiting: {
    label: "Waiting",
    color: "text-blue-700",
    bg: "bg-blue-50 border-blue-200",
    icon: <Clock className="w-6 h-6 text-blue-600" />,
    message: "Please wait in the waiting area. We'll call your number soon.",
  },
  called: {
    label: "You're Called!",
    color: "text-amber-700",
    bg: "bg-amber-50 border-amber-300",
    icon: <Activity className="w-6 h-6 text-amber-600" />,
    message: "🔔 Your number has been called! Please proceed to the consultation room.",
  },
  "in-progress": {
    label: "In Consultation",
    color: "text-teal-700",
    bg: "bg-teal-50 border-teal-200",
    icon: <Stethoscope className="w-6 h-6 text-teal-600" />,
    message: "You are currently being seen by the doctor.",
  },
  completed: {
    label: "Completed",
    color: "text-green-700",
    bg: "bg-green-50 border-green-200",
    icon: <CheckCircle2 className="w-6 h-6 text-green-600" />,
    message: "Your consultation is complete. Thank you for visiting!",
  },
  skipped: {
    label: "Skipped",
    color: "text-orange-700",
    bg: "bg-orange-50 border-orange-200",
    icon: <AlertCircle className="w-6 h-6 text-orange-600" />,
    message: "You were marked as skipped. Please speak to the staff.",
  },
  "no-show": {
    label: "No Show",
    color: "text-red-700",
    bg: "bg-red-50 border-red-200",
    icon: <AlertCircle className="w-6 h-6 text-red-600" />,
    message: "You were marked as no-show. Please contact the pharmacy.",
  },
  cancelled: {
    label: "Cancelled",
    color: "text-muted-foreground",
    bg: "bg-muted border-border",
    icon: <AlertCircle className="w-6 h-6 text-muted-foreground" />,
    message: "This booking has been cancelled.",
  },
};

export default function QueueTrackingClient({
  initialAppointment,
  pharmacy,
  doctor,
  session,
  initialQueueList,
}: Props) {
  const [appointment, setAppointment] = useState<Appointment>(initialAppointment);
  const [queueList, setQueueList] = useState<QueueItem[]>(initialQueueList);
  const [connected, setConnected] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(new Date());

  const updateListFromDB = useCallback(async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from("appointments")
      .select("id, serial_number, status, patient_name, created_at")
      .eq("session_id", session.id)
      .neq("status", "cancelled")
      .order("serial_number", { ascending: true });
    if (data) setQueueList(data);
    setLastUpdated(new Date());
  }, [session.id]);

  useEffect(() => {
    const supabase = createClient();

    const channel = supabase
      .channel(`queue-tracking-${session.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "appointments", filter: `session_id=eq.${session.id}` },
        async (payload) => {
          // Update own appointment status
          if (payload.new && (payload.new as Appointment).id === appointment.id) {
            setAppointment((prev) => ({ ...prev, ...(payload.new as Appointment) }));
          }
          // Refresh queue
          await updateListFromDB();
        }
      )
      .subscribe((status) => {
        setConnected(status === "SUBSCRIBED");
      });

    return () => { supabase.removeChannel(channel); };
  }, [session.id, appointment.id, updateListFromDB]);

  const myStatus = appointment.status as TrackingStatus;
  const statusCfg = STATUS_CONFIG[myStatus] || STATUS_CONFIG.waiting;

  // Queue position calculation
  const activeQueue = queueList.filter((a) => ["waiting", "called"].includes(a.status));
  const myIndex = activeQueue.findIndex((a) => a.id === appointment.id);
  const position = myIndex >= 0 ? myIndex : -1;
  const peopleAhead = Math.max(0, myIndex);
  const currentPatient = queueList.find((a) => a.status === "in-progress" || a.status === "called");
  const avgMin = doctor.avg_consultation_duration || 10;
  const estimatedWait = peopleAhead * avgMin;

  const isDone = ["completed", "cancelled", "no-show"].includes(myStatus);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/30">
      {/* Top bar */}
      <div className="bg-gradient-to-r from-blue-600 to-teal-600 px-4 py-4">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-white" />
            <span className="font-bold text-white text-sm">{pharmacy.name}</span>
          </div>
          <div className="flex items-center gap-1.5">
            {connected ? (
              <><Wifi className="w-3.5 h-3.5 text-green-300" /><span className="text-xs text-green-200 font-medium">Live</span></>
            ) : (
              <><WifiOff className="w-3.5 h-3.5 text-red-300" /><span className="text-xs text-red-200 font-medium">Offline</span></>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-md mx-auto px-4 py-6 space-y-4">
        {/* My token + serial */}
        <div className="bg-white rounded-3xl border border-border shadow-xl overflow-hidden">
          <div className={`px-6 py-5 border-b ${statusCfg.bg} border-0`}>
            <div className="flex items-center gap-3 mb-2">
              {statusCfg.icon}
              <div>
                <p className={`font-bold text-lg ${statusCfg.color}`}>{statusCfg.label}</p>
                <p className={`text-sm ${statusCfg.color} opacity-80`}>{statusCfg.message}</p>
              </div>
            </div>
          </div>

          <div className="p-6">
            <div className="flex items-center justify-between mb-5">
              <div className="text-center">
                <p className="text-xs text-muted-foreground font-semibold mb-1">Your Number</p>
                <p className="text-5xl font-black text-blue-700 animate-serial-glow">
                  #{appointment.serial_number.toString().padStart(2, "0")}
                </p>
              </div>
              <div className="text-center">
                <p className="text-xs text-muted-foreground font-semibold mb-1">Token</p>
                <p className="text-2xl font-black font-mono text-foreground">{appointment.token}</p>
              </div>
            </div>

            {/* Position info */}
            {!isDone && myStatus !== "in-progress" && myStatus !== "called" && (
              <div className="grid grid-cols-3 gap-3 mb-4">
                <div className="bg-blue-50 rounded-xl p-3 text-center">
                  <p className="text-2xl font-black text-blue-700">{peopleAhead}</p>
                  <p className="text-xs text-blue-600 font-medium">Ahead</p>
                </div>
                <div className="bg-amber-50 rounded-xl p-3 text-center">
                  <p className="text-2xl font-black text-amber-700">~{estimatedWait}</p>
                  <p className="text-xs text-amber-600 font-medium">Min wait</p>
                </div>
                <div className="bg-teal-50 rounded-xl p-3 text-center">
                  <p className="text-2xl font-black text-teal-700">
                    #{position >= 0 ? position + 1 : "-"}
                  </p>
                  <p className="text-xs text-teal-600 font-medium">In line</p>
                </div>
              </div>
            )}

            {myStatus === "called" && (
              <div className="bg-amber-400/10 border border-amber-300 rounded-2xl p-4 text-center animate-pulse mb-4">
                <p className="text-lg font-black text-amber-700">🔔 Your turn — Please come in!</p>
              </div>
            )}
            {myStatus === "in-progress" && (
              <div className="bg-teal-50 border border-teal-300 rounded-2xl p-4 text-center mb-4">
                <p className="text-lg font-black text-teal-700">👨‍⚕️ You are being seen now</p>
              </div>
            )}
            {myStatus === "completed" && (
              <div className="bg-green-50 border border-green-300 rounded-2xl p-4 text-center mb-4">
                <p className="text-lg font-black text-green-700">✅ Thank you for visiting!</p>
              </div>
            )}

            {/* Doctor + session info */}
            <div className="space-y-2">
              <div className="flex items-center gap-3 p-3 bg-muted rounded-xl">
                <Stethoscope className="w-4 h-4 text-blue-600 flex-shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">Doctor</p>
                  <p className="text-sm font-semibold text-foreground">Dr. {doctor.name}{doctor.specialty ? ` · ${doctor.specialty}` : ""}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-muted rounded-xl">
                <Clock className="w-4 h-4 text-teal-600 flex-shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">Session Time</p>
                  <p className="text-sm font-semibold text-foreground">
                    {formatTime(session.start_time)} – {formatTime(session.end_time)}
                  </p>
                </div>
              </div>
              {pharmacy.phone && (
                <div className="flex items-center gap-3 p-3 bg-muted rounded-xl">
                  <Phone className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-muted-foreground">Contact</p>
                    <a href={`tel:${pharmacy.phone}`} className="text-sm font-semibold text-primary underline">
                      {pharmacy.phone}
                    </a>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Live queue list */}
        {!isDone && (
          <div className="bg-white rounded-3xl border border-border shadow-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-border flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                <p className="font-bold text-sm text-foreground">Live Queue</p>
              </div>
              <div className="flex items-center gap-2">
                <p className="text-xs text-muted-foreground">
                  Updated {lastUpdated.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </p>
                <button
                  onClick={updateListFromDB}
                  className="p-1.5 rounded-lg hover:bg-muted transition-colors"
                  title="Refresh"
                >
                  <RefreshCw className="w-3.5 h-3.5 text-muted-foreground" />
                </button>
              </div>
            </div>

            <div className="divide-y divide-border">
              {queueList.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-8">Queue is empty</p>
              )}
              {queueList.slice(0, 15).map((item) => {
                const isMe = item.id === appointment.id;
                const statusColors: Record<string, string> = {
                  waiting: "text-blue-600 bg-blue-50",
                  called: "text-amber-600 bg-amber-50",
                  "in-progress": "text-teal-600 bg-teal-50",
                  completed: "text-green-600 bg-green-50",
                  skipped: "text-orange-500 bg-orange-50",
                  "no-show": "text-red-500 bg-red-50",
                };
                return (
                  <div
                    key={item.id}
                    className={`flex items-center gap-4 px-5 py-3.5 transition-colors ${
                      isMe
                        ? "bg-blue-50 border-l-4 border-l-blue-500"
                        : item.status === "in-progress" || item.status === "called"
                        ? "bg-amber-50/50"
                        : ""
                    }`}
                  >
                    <div className="w-8 h-8 flex-shrink-0 flex items-center justify-center">
                      <span className="text-base font-black text-foreground">
                        #{item.serial_number.toString().padStart(2, "0")}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {isMe ? `${maskName(item.patient_name)} (You)` : maskName(item.patient_name)}
                      </p>
                    </div>
                    <span
                      className={`text-xs font-semibold px-2 py-0.5 rounded-full capitalize flex-shrink-0 ${
                        statusColors[item.status] || "text-muted-foreground bg-muted"
                      }`}
                    >
                      {item.status === "in-progress" ? "In Room" : item.status}
                    </span>
                  </div>
                );
              })}
              {queueList.length > 15 && (
                <p className="text-xs text-center text-muted-foreground py-3">
                  +{queueList.length - 15} more in queue
                </p>
              )}
            </div>
          </div>
        )}

        {/* Footer links */}
        <div className="flex gap-3">
          <Link
            href={`/book/${pharmacy.slug}`}
            className="flex-1 flex items-center justify-center gap-1.5 bg-white border border-border rounded-xl py-3 text-sm font-semibold text-foreground hover:bg-muted transition-colors"
          >
            <ArrowRight className="w-4 h-4" />
            Book Another Slot
          </Link>
          <Link
            href="/"
            className="flex items-center justify-center gap-1.5 bg-white border border-border rounded-xl px-4 py-3 text-sm font-semibold text-foreground hover:bg-muted transition-colors"
          >
            <Home className="w-4 h-4" />
          </Link>
        </div>

        <p className="text-center text-xs text-muted-foreground pb-4">
          Powered by{" "}
          <Link href="/" className="font-semibold text-primary hover:underline">ClinicQ</Link>
        </p>
      </div>
    </div>
  );
}
