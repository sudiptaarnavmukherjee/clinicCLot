import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { format, formatDistanceToNow, parseISO } from "date-fns";
import type { AppointmentStatus, SessionStatus, QueueStats } from "./types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function generateToken(length = 8): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 50);
}

export function formatTime(timeStr: string): string {
  const [hours, minutes] = timeStr.split(":").map(Number);
  const date = new Date();
  date.setHours(hours, minutes);
  return format(date, "h:mm a");
}

export function formatDate(dateStr: string): string {
  return format(parseISO(dateStr), "dd MMM yyyy");
}

export function formatDateTime(dateStr: string): string {
  return format(parseISO(dateStr), "dd MMM yyyy, h:mm a");
}

export function timeAgo(dateStr: string): string {
  return formatDistanceToNow(parseISO(dateStr), { addSuffix: true });
}

export function getStatusColor(status: AppointmentStatus): string {
  const colors: Record<AppointmentStatus, string> = {
    waiting: "bg-blue-100 text-blue-700 border-blue-200",
    called: "bg-amber-100 text-amber-700 border-amber-200",
    "in-progress": "bg-purple-100 text-purple-700 border-purple-200",
    completed: "bg-green-100 text-green-700 border-green-200",
    skipped: "bg-gray-100 text-gray-600 border-gray-200",
    cancelled: "bg-red-100 text-red-600 border-red-200",
    "no-show": "bg-orange-100 text-orange-600 border-orange-200",
  };
  return colors[status] || "bg-gray-100 text-gray-600";
}

export function getStatusLabel(status: AppointmentStatus): string {
  const labels: Record<AppointmentStatus, string> = {
    waiting: "Waiting",
    called: "Called",
    "in-progress": "In Progress",
    completed: "Completed",
    skipped: "Skipped",
    cancelled: "Cancelled",
    "no-show": "No Show",
  };
  return labels[status] || status;
}

export function getSessionStatusColor(status: SessionStatus): string {
  const colors: Record<SessionStatus, string> = {
    scheduled: "bg-blue-100 text-blue-700",
    active: "bg-green-100 text-green-700",
    paused: "bg-amber-100 text-amber-700",
    completed: "bg-gray-100 text-gray-600",
    cancelled: "bg-red-100 text-red-600",
  };
  return colors[status] || "bg-gray-100 text-gray-600";
}

export function calculateEstimatedWait(
  patientsAhead: number,
  avgMinutes: number
): number {
  return Math.max(0, patientsAhead * avgMinutes);
}

export function formatWaitTime(minutes: number): string {
  if (minutes === 0) return "Your turn next!";
  if (minutes < 60) return `~${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `~${hours}h ${mins}m` : `~${hours}h`;
}

export function calculateQueueStats(appointments: { status: string }[]): QueueStats {
  const stats: QueueStats = {
    total: appointments.length,
    waiting: 0,
    called: 0,
    in_progress: 0,
    completed: 0,
    skipped: 0,
    no_show: 0,
    cancelled: 0,
  };
  for (const apt of appointments) {
    if (apt.status === "waiting") stats.waiting++;
    else if (apt.status === "called") stats.called++;
    else if (apt.status === "in-progress") stats.in_progress++;
    else if (apt.status === "completed") stats.completed++;
    else if (apt.status === "skipped") stats.skipped++;
    else if (apt.status === "no-show") stats.no_show++;
    else if (apt.status === "cancelled") stats.cancelled++;
  }
  return stats;
}

export function getQueuePosition(
  appointments: { id: string; status: string; serial_number: number }[],
  appointmentId: string
): number {
  const waiting = appointments
    .filter((a) => a.status === "waiting" || a.status === "called")
    .sort((a, b) => a.serial_number - b.serial_number);
  const idx = waiting.findIndex((a) => a.id === appointmentId);
  return idx === -1 ? -1 : idx;
}

export function copyToClipboard(text: string): Promise<void> {
  return navigator.clipboard.writeText(text);
}

export function getBookingUrl(pharmacySlug: string): string {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  return `${appUrl}/book/${pharmacySlug}`;
}

export function getTrackingUrl(token: string): string {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  return `${appUrl}/q/${token}`;
}

export function maskPhone(phone: string): string {
  if (!phone || phone.length < 6) return phone;
  return phone.slice(0, 3) + "****" + phone.slice(-3);
}

export function maskName(name: string): string {
  const parts = name.trim().split(" ");
  return parts[0] + (parts.length > 1 ? " " + parts[1][0] + "." : "");
}
