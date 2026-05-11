"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { Activity, Copy, ExternalLink, QrCode, Save } from "lucide-react";
import { getBookingUrl, copyToClipboard } from "@/lib/utils";
import type { Pharmacy } from "@/lib/types";

interface Props { pharmacy: Pharmacy; }

export default function SettingsClient({ pharmacy }: Props) {
  const [form, setForm] = useState({
    name: pharmacy.name,
    phone: pharmacy.phone || "",
    address: pharmacy.address || "",
    custom_message: pharmacy.settings?.custom_message || "",
    avg_consultation_duration: pharmacy.settings?.avg_consultation_minutes || 10,
    max_appointments_per_session: pharmacy.settings?.max_daily_appointments || 30,
  });
  const [saving, setSaving] = useState(false);
  const bookingUrl = getBookingUrl(pharmacy.slug);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from("pharmacies")
        .update({
          name: form.name,
          phone: form.phone || null,
          address: form.address || null,
          settings: {
            ...(pharmacy.settings || {}),
            custom_message: form.custom_message || null,
            avg_consultation_minutes: Number(form.avg_consultation_duration),
            max_daily_appointments: Number(form.max_appointments_per_session),
          },
        })
        .eq("id", pharmacy.id);
      if (error) throw error;
      toast.success("Settings saved successfully!");
    } catch {
      toast.error("Failed to save settings.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 p-4 md:p-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">Manage your clinic profile and preferences</p>
      </div>

      {/* Booking Link */}
      <div className="bg-gradient-to-r from-blue-600 to-teal-600 rounded-3xl p-6 text-white">
        <div className="flex items-center gap-2 mb-3">
          <QrCode className="w-5 h-5" />
          <h2 className="font-bold">Your Patient Booking Link</h2>
        </div>
        <p className="text-blue-100 text-xs mb-4">Share this link with patients to let them book a slot without signing in.</p>
        <div className="bg-white/10 rounded-xl px-4 py-3 text-sm font-mono break-all mb-4">
          {bookingUrl}
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => { copyToClipboard(bookingUrl); toast.success("Booking link copied!"); }}
            className="flex items-center gap-1.5 bg-white/20 hover:bg-white/30 rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors"
          >
            <Copy className="w-4 h-4" /> Copy Link
          </button>
          <a
            href={bookingUrl}
            target="_blank"
            className="flex items-center gap-1.5 bg-white text-blue-700 rounded-xl px-4 py-2.5 text-sm font-semibold hover:bg-blue-50 transition-colors"
          >
            <ExternalLink className="w-4 h-4" /> Open Page
          </a>
        </div>
      </div>

      {/* Profile form */}
      <form onSubmit={handleSave} className="bg-white rounded-3xl border border-border shadow-xl overflow-hidden">
        <div className="px-6 py-5 border-b border-border flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
            <Activity className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h2 className="font-bold text-foreground">Clinic Profile</h2>
            <p className="text-xs text-muted-foreground">Basic information about your clinic</p>
          </div>
        </div>
        <div className="p-6 space-y-5">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">Clinic / Pharmacy Name *</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              required
              className="w-full h-11 px-4 rounded-xl border border-input text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Slug (URL ID)</label>
              <input
                type="text"
                value={pharmacy.slug}
                readOnly
                className="w-full h-11 px-4 rounded-xl border border-input text-sm bg-muted text-muted-foreground cursor-not-allowed"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">Address</label>
            <input
              type="text"
              value={form.address}
              onChange={(e) => setForm((p) => ({ ...p, address: e.target.value }))}
              placeholder="Your clinic address"
              className="w-full h-11 px-4 rounded-xl border border-input text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">
              Custom Message on Booking Page <span className="text-muted-foreground font-normal">(optional)</span>
            </label>
            <textarea
              value={form.custom_message}
              onChange={(e) => setForm((p) => ({ ...p, custom_message: e.target.value }))}
              placeholder="e.g. Walk-ins welcome during session hours. Call us for emergencies."
              rows={3}
              className="w-full px-4 py-3 rounded-xl border border-input text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all resize-none"
            />
          </div>

          {/* Defaults */}
          <div className="border-t border-border pt-5">
            <h3 className="text-sm font-bold text-foreground mb-4">Session Defaults</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Avg Consultation Time (min)</label>
                <input
                  type="number"
                  value={form.avg_consultation_duration}
                  onChange={(e) => setForm((p) => ({ ...p, avg_consultation_duration: Number(e.target.value) }))}
                  min={1}
                  max={60}
                  className="w-full h-11 px-4 rounded-xl border border-input text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                />
                <p className="text-xs text-muted-foreground mt-1">Used to estimate wait time for patients</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Max Appointments per Session</label>
                <input
                  type="number"
                  value={form.max_appointments_per_session}
                  onChange={(e) => setForm((p) => ({ ...p, max_appointments_per_session: Number(e.target.value) }))}
                  min={1}
                  max={200}
                  className="w-full h-11 px-4 rounded-xl border border-input text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                />
                <p className="text-xs text-muted-foreground mt-1">Default can be overridden per session</p>
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="w-full h-12 bg-gradient-to-r from-blue-600 to-teal-600 text-white font-bold rounded-2xl flex items-center justify-center gap-2 shadow-lg hover:shadow-xl transition-all disabled:opacity-50"
          >
            {saving ? (
              <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            ) : <Save className="w-4 h-4" />}
            {saving ? "Saving..." : "Save Settings"}
          </button>
        </div>
      </form>

      {/* Danger zone */}
      <div className="bg-white rounded-3xl border border-red-200 shadow-xl overflow-hidden">
        <div className="px-6 py-5 border-b border-red-200">
          <h2 className="font-bold text-red-700">Account Info</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Your account identifier</p>
        </div>
        <div className="p-6">
          <div className="flex items-center gap-3 p-3 bg-muted rounded-xl">
            <div>
              <p className="text-xs text-muted-foreground">Pharmacy ID</p>
              <p className="text-sm font-mono text-foreground">{pharmacy.id}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
