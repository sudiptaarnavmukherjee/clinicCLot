"use client";

import { useMemo } from "react";
import { format, parseISO, subDays } from "date-fns";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend
} from "recharts";
import { TrendingUp, Users, CheckCircle2, XCircle, Clock } from "lucide-react";

interface Props {
  appointments: {
    status: string;
    created_at: string;
    booked_at: string;
    completed_at: string | null;
    started_at: string | null;
  }[];
  monthTotal: number;
  monthCompleted: number;
}

const STATUS_COLORS = {
  completed: "#059669",
  waiting: "#2563eb",
  skipped: "#9ca3af",
  "no-show": "#f97316",
  cancelled: "#dc2626",
};

export default function AnalyticsClient({ appointments, monthTotal, monthCompleted }: Props) {
  // Build last 7 days chart data
  const dailyData = useMemo(() => {
    const days = Array.from({ length: 7 }, (_, i) => {
      const date = subDays(new Date(), 6 - i);
      const dateStr = format(date, "yyyy-MM-dd");
      const dayAppts = appointments.filter(
        (a) => a.created_at.startsWith(dateStr)
      );
      return {
        day: format(date, "EEE"),
        date: dateStr,
        total: dayAppts.length,
        completed: dayAppts.filter((a) => a.status === "completed").length,
        skipped: dayAppts.filter((a) => a.status === "skipped").length,
        noshow: dayAppts.filter((a) => a.status === "no-show").length,
      };
    });
    return days;
  }, [appointments]);

  // Status breakdown for pie
  const statusBreakdown = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const apt of appointments) {
      counts[apt.status] = (counts[apt.status] || 0) + 1;
    }
    return Object.entries(counts).map(([status, count]) => ({
      name: status.charAt(0).toUpperCase() + status.slice(1),
      value: count,
      color: STATUS_COLORS[status as keyof typeof STATUS_COLORS] || "#94a3b8",
    }));
  }, [appointments]);

  // Avg consultation duration
  const avgDuration = useMemo(() => {
    const completed = appointments.filter((a) => a.completed_at && a.started_at);
    if (completed.length === 0) return 0;
    const totalMs = completed.reduce((sum, a) => {
      return sum + (new Date(a.completed_at!).getTime() - new Date(a.started_at!).getTime());
    }, 0);
    return Math.round(totalMs / completed.length / 60000);
  }, [appointments]);

  const weekTotal = appointments.length;
  const weekCompleted = appointments.filter((a) => a.status === "completed").length;
  const weekCompletionRate = weekTotal > 0 ? Math.round((weekCompleted / weekTotal) * 100) : 0;
  const monthCompletionRate = monthTotal > 0 ? Math.round((monthCompleted / monthTotal) * 100) : 0;

  const SUMMARY_CARDS = [
    { label: "This Month Total", value: monthTotal, icon: Users, color: "text-blue-600", bg: "bg-blue-50" },
    { label: "Month Completed", value: monthCompleted, icon: CheckCircle2, color: "text-green-600", bg: "bg-green-50" },
    { label: "Month Rate", value: `${monthCompletionRate}%`, icon: TrendingUp, color: "text-purple-600", bg: "bg-purple-50" },
    { label: "Avg Consult Time", value: avgDuration > 0 ? `${avgDuration}m` : "N/A", icon: Clock, color: "text-amber-600", bg: "bg-amber-50" },
  ];

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {SUMMARY_CARDS.map((card) => (
          <div key={card.label} className="bg-white rounded-2xl border border-border p-5">
            <div className={`w-11 h-11 ${card.bg} rounded-xl flex items-center justify-center mb-3`}>
              <card.icon className={`w-5 h-5 ${card.color}`} />
            </div>
            <p className="text-3xl font-bold text-foreground">{card.value}</p>
            <p className="text-xs text-muted-foreground mt-1">{card.label}</p>
          </div>
        ))}
      </div>

      {/* 7-day bar chart */}
      <div className="bg-white rounded-2xl border border-border p-5">
        <h2 className="font-bold text-foreground mb-1">Last 7 Days</h2>
        <p className="text-xs text-muted-foreground mb-5">{weekTotal} total · {weekCompletionRate}% completion rate</p>
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={dailyData} barCategoryGap="30%">
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis dataKey="day" tick={{ fontSize: 12, fill: "#64748b" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 12, fill: "#64748b" }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip
                contentStyle={{ borderRadius: "12px", border: "1px solid #e2e8f0", fontSize: "12px" }}
                cursor={{ fill: "#f8fafc" }}
              />
              <Bar dataKey="completed" name="Completed" fill="#059669" radius={[4, 4, 0, 0]} />
              <Bar dataKey="skipped" name="Skipped" fill="#9ca3af" radius={[4, 4, 0, 0]} />
              <Bar dataKey="noshow" name="No-show" fill="#f97316" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="flex gap-4 mt-3 justify-center">
          {[
            { color: "#059669", label: "Completed" },
            { color: "#9ca3af", label: "Skipped" },
            { color: "#f97316", label: "No-show" },
          ].map((l) => (
            <div key={l.label} className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-sm" style={{ background: l.color }} />
              <span className="text-xs text-muted-foreground">{l.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Status pie + insights */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl border border-border p-5">
          <h2 className="font-bold text-foreground mb-5">Status Breakdown (7 days)</h2>
          {statusBreakdown.length > 0 ? (
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusBreakdown}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={85}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {statusBreakdown.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: "12px", border: "1px solid #e2e8f0", fontSize: "12px" }} />
                  <Legend
                    iconType="circle"
                    iconSize={8}
                    wrapperStyle={{ fontSize: "12px" }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">
              No data for this period
            </div>
          )}
        </div>

        <div className="bg-white rounded-2xl border border-border p-5">
          <h2 className="font-bold text-foreground mb-5">Quick Insights</h2>
          <div className="space-y-4">
            {[
              {
                label: "Completion Rate",
                value: `${weekCompletionRate}%`,
                desc: "of patients seen this week",
                color: weekCompletionRate >= 80 ? "text-green-600" : weekCompletionRate >= 60 ? "text-amber-600" : "text-red-600",
                bg: weekCompletionRate >= 80 ? "bg-green-50" : weekCompletionRate >= 60 ? "bg-amber-50" : "bg-red-50",
                icon: CheckCircle2,
              },
              {
                label: "Avg Patients / Day",
                value: weekTotal > 0 ? Math.round(weekTotal / 7) : 0,
                desc: "over last 7 days",
                color: "text-blue-600",
                bg: "bg-blue-50",
                icon: Users,
              },
              {
                label: "No-show Rate",
                value: appointments.length > 0
                  ? `${Math.round((appointments.filter((a) => a.status === "no-show").length / appointments.length) * 100)}%`
                  : "0%",
                desc: "this week",
                color: "text-orange-600",
                bg: "bg-orange-50",
                icon: XCircle,
              },
            ].map((insight) => (
              <div key={insight.label} className={`flex items-center gap-4 p-3.5 rounded-xl ${insight.bg}`}>
                <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm">
                  <insight.icon className={`w-5 h-5 ${insight.color}`} />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground">{insight.label}</p>
                  <p className="text-xs text-muted-foreground">{insight.desc}</p>
                </div>
                <p className={`text-xl font-bold ${insight.color}`}>{insight.value}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
