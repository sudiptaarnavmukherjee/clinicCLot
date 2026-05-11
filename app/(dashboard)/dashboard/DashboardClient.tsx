"use client";

import Link from "next/link";
import { format } from "date-fns";
import {
  Users, CheckCircle2, Clock, Activity, TrendingUp,
  Plus, ArrowRight, Calendar, QrCode, Share2, Copy
} from "lucide-react";
import { toast } from "sonner";
import { getBookingUrl } from "@/lib/utils";
import type { Pharmacy, Session } from "@/lib/types";

interface Props {
  pharmacy: Pharmacy;
  sessions: (Session & { doctors: { name: string; specialty: string | null } | null })[];
  stats: {
    today_total: number;
    today_completed: number;
    today_waiting: number;
    today_skipped: number;
    active_sessions: number;
    total_this_month: number;
  };
}

export default function DashboardClient({ pharmacy, sessions, stats }: Props) {
  const bookingUrl = getBookingUrl(pharmacy.slug);

  function copyBookingLink() {
    navigator.clipboard.writeText(bookingUrl);
    toast.success("Booking link copied!", { description: "Share this link with your patients." });
  }

  const completionRate = stats.today_total > 0
    ? Math.round((stats.today_completed / stats.today_total) * 100)
    : 0;

  const STAT_CARDS = [
    {
      label: "Today's Patients",
      value: stats.today_total,
      icon: Users,
      color: "from-blue-500 to-blue-600",
      bg: "bg-blue-50",
      textColor: "text-blue-700",
      change: `+${stats.today_total} today`,
    },
    {
      label: "Completed",
      value: stats.today_completed,
      icon: CheckCircle2,
      color: "from-emerald-500 to-emerald-600",
      bg: "bg-emerald-50",
      textColor: "text-emerald-700",
      change: `${completionRate}% rate`,
    },
    {
      label: "Queue Now",
      value: stats.today_waiting,
      icon: Clock,
      color: "from-amber-500 to-amber-600",
      bg: "bg-amber-50",
      textColor: "text-amber-700",
      change: stats.active_sessions > 0 ? "Session active" : "No active session",
    },
    {
      label: "This Month",
      value: stats.total_this_month,
      icon: TrendingUp,
      color: "from-purple-500 to-purple-600",
      bg: "bg-purple-50",
      textColor: "text-purple-700",
      change: `${format(new Date(), "MMMM")}`,
    },
  ];

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {STAT_CARDS.map((card) => (
          <div key={card.label} className="bg-white rounded-2xl border border-border p-5 hover:shadow-md transition-all duration-200">
            <div className="flex items-start justify-between mb-4">
              <div className={`w-11 h-11 ${card.bg} rounded-xl flex items-center justify-center`}>
                <card.icon className={`w-5 h-5 ${card.textColor}`} />
              </div>
              {card.label === "Queue Now" && stats.active_sessions > 0 && (
                <span className="flex items-center gap-1 text-[10px] font-bold text-green-700 bg-green-100 px-2 py-0.5 rounded-full">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                  LIVE
                </span>
              )}
            </div>
            <p className="text-3xl font-bold text-foreground">{card.value}</p>
            <p className="text-xs text-muted-foreground mt-1 font-medium">{card.label}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{card.change}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Today's sessions */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-border">
          <div className="flex items-center justify-between p-5 border-b border-border">
            <div>
              <h2 className="font-bold text-foreground">Today&apos;s Sessions</h2>
              <p className="text-xs text-muted-foreground mt-0.5">{format(new Date(), "EEEE, dd MMMM yyyy")}</p>
            </div>
            <Link
              href="/sessions/new"
              className="flex items-center gap-1.5 text-sm font-semibold text-white bg-gradient-to-r from-blue-600 to-teal-600 px-4 py-2 rounded-xl hover:shadow-md transition-all"
            >
              <Plus className="w-4 h-4" />
              New Session
            </Link>
          </div>

          <div className="p-5">
            {sessions.length === 0 ? (
              <div className="text-center py-12">
                <Calendar className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-sm font-medium text-muted-foreground">No sessions today</p>
                <p className="text-xs text-muted-foreground/70 mt-1">Create a session to start accepting patients</p>
                <Link
                  href="/sessions/new"
                  className="inline-flex items-center gap-2 mt-4 text-sm font-semibold text-primary hover:underline"
                >
                  <Plus className="w-4 h-4" />
                  Create First Session
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {sessions.map((session) => {
                  const statusColors = {
                    scheduled: "bg-blue-100 text-blue-700",
                    active: "bg-green-100 text-green-700",
                    paused: "bg-amber-100 text-amber-700",
                    completed: "bg-gray-100 text-gray-600",
                    cancelled: "bg-red-100 text-red-600",
                  };
                  const statusColor = statusColors[session.status] || "bg-gray-100 text-gray-600";

                  return (
                    <Link
                      key={session.id}
                      href={`/queue?session=${session.id}`}
                      className="flex items-center gap-4 p-4 rounded-xl border border-border hover:border-blue-200 hover:bg-blue-50/30 transition-all group"
                    >
                      <div className={`w-3 h-12 rounded-full flex-shrink-0 ${session.status === "active" ? "bg-gradient-to-b from-green-400 to-emerald-500" : session.status === "scheduled" ? "bg-gradient-to-b from-blue-400 to-blue-500" : "bg-gradient-to-b from-gray-300 to-gray-400"}`} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-sm text-foreground truncate">
                            Dr. {session.doctors?.name || "Unknown"}
                          </p>
                          {session.status === "active" && (
                            <span className="flex items-center gap-1 text-[10px] font-bold text-green-700 bg-green-100 px-1.5 py-0.5 rounded-full">
                              <span className="w-1 h-1 rounded-full bg-green-500 animate-pulse" />
                              LIVE
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {session.doctors?.specialty} · {session.start_time?.slice(0, 5)} - {session.end_time?.slice(0, 5)}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full capitalize ${statusColor}`}>
                          {session.status}
                        </span>
                        <ArrowRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right panel */}
        <div className="space-y-4">
          {/* Booking link card */}
          <div className="bg-gradient-to-br from-blue-600 to-teal-600 rounded-2xl p-5 text-white">
            <div className="flex items-center gap-2 mb-3">
              <QrCode className="w-5 h-5 text-blue-200" />
              <p className="font-bold text-sm">Your Booking Link</p>
            </div>
            <p className="text-xs text-blue-100 mb-4 font-mono break-all bg-white/10 rounded-lg px-3 py-2">
              {bookingUrl.replace("http://", "").replace("https://", "")}
            </p>
            <div className="flex gap-2">
              <button
                onClick={copyBookingLink}
                className="flex-1 flex items-center justify-center gap-1.5 bg-white/20 hover:bg-white/30 rounded-xl py-2 text-xs font-semibold transition-colors"
              >
                <Copy className="w-3.5 h-3.5" />
                Copy
              </button>
              <Link
                href={bookingUrl}
                target="_blank"
                className="flex-1 flex items-center justify-center gap-1.5 bg-white text-blue-700 rounded-xl py-2 text-xs font-semibold hover:bg-blue-50 transition-colors"
              >
                <Share2 className="w-3.5 h-3.5" />
                Preview
              </Link>
            </div>
          </div>

          {/* Quick actions */}
          <div className="bg-white rounded-2xl border border-border p-5">
            <h3 className="font-bold text-sm text-foreground mb-4">Quick Actions</h3>
            <div className="space-y-2">
              {[
                { href: "/queue", label: "Open Live Queue", icon: Activity, color: "text-green-600 bg-green-50" },
                { href: "/sessions/new", label: "New Session", icon: Plus, color: "text-blue-600 bg-blue-50" },
                { href: "/doctors/new", label: "Add Doctor", icon: Users, color: "text-purple-600 bg-purple-50" },
                { href: "/analytics", label: "View Analytics", icon: TrendingUp, color: "text-amber-600 bg-amber-50" },
              ].map((action) => (
                <Link
                  key={action.href}
                  href={action.href}
                  className="flex items-center gap-3 p-3 rounded-xl hover:bg-muted transition-colors group"
                >
                  <div className={`w-8 h-8 ${action.color} rounded-lg flex items-center justify-center`}>
                    <action.icon className="w-4 h-4" />
                  </div>
                  <span className="text-sm font-medium text-foreground">{action.label}</span>
                  <ArrowRight className="w-3.5 h-3.5 text-muted-foreground ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
