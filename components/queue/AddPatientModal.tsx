"use client";

import { useState } from "react";
import { X, UserPlus, AlertCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { generateToken } from "@/lib/utils";
import { toast } from "sonner";

interface Props {
  sessionId: string;
  pharmacyId: string;
  doctorId: string;
  currentCount: number;
  onClose: () => void;
}

export default function AddPatientModal({ sessionId, pharmacyId, doctorId, currentCount, onClose }: Props) {
  const [form, setForm] = useState({
    patient_name: "",
    patient_phone: "",
    patient_age: "",
    patient_gender: "",
    reason: "",
    is_priority: false,
  });
  const [loading, setLoading] = useState(false);

  function update(key: string, value: string | boolean) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.patient_name.trim()) {
      toast.error("Patient name is required");
      return;
    }
    setLoading(true);
    try {
      const supabase = createClient();
      const serialNumber = currentCount + 1;
      const token = generateToken(8);

      const { error } = await supabase.from("appointments").insert({
        session_id: sessionId,
        doctor_id: doctorId,
        pharmacy_id: pharmacyId,
        patient_name: form.patient_name.trim(),
        patient_phone: form.patient_phone.trim() || null,
        patient_age: form.patient_age ? parseInt(form.patient_age) : null,
        patient_gender: form.patient_gender || null,
        reason: form.reason.trim() || null,
        serial_number: serialNumber,
        token,
        status: "waiting",
        is_priority: form.is_priority,
      });

      if (error) {
        toast.error("Failed to add patient: " + error.message);
        return;
      }

      toast.success(`Added: ${form.patient_name} as #${serialNumber}`);
      onClose();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-3xl border border-border shadow-2xl w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-teal-600 px-6 py-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-white">
              <UserPlus className="w-5 h-5" />
              <h2 className="font-bold text-lg">Add Walk-in Patient</h2>
            </div>
            <button onClick={onClose} className="p-1.5 rounded-lg bg-white/20 hover:bg-white/30 text-white transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="flex items-center gap-1.5 mt-2 bg-white/10 rounded-lg px-3 py-2">
            <AlertCircle className="w-3.5 h-3.5 text-blue-200" />
            <p className="text-xs text-blue-100">
              Walk-in will be assigned serial #{currentCount + 1}
            </p>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">Patient Name *</label>
            <input
              type="text"
              value={form.patient_name}
              onChange={(e) => update("patient_name", e.target.value)}
              placeholder="Full name"
              required
              autoFocus
              className="w-full h-11 px-4 rounded-xl border border-input text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Phone</label>
              <input
                type="tel"
                value={form.patient_phone}
                onChange={(e) => update("patient_phone", e.target.value)}
                placeholder="01XXXXXXXXX"
                className="w-full h-11 px-4 rounded-xl border border-input text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Age</label>
              <input
                type="number"
                value={form.patient_age}
                onChange={(e) => update("patient_age", e.target.value)}
                placeholder="25"
                min="1"
                max="120"
                className="w-full h-11 px-4 rounded-xl border border-input text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">Gender</label>
            <div className="flex gap-2">
              {["male", "female", "other"].map((g) => (
                <button
                  key={g}
                  type="button"
                  onClick={() => update("patient_gender", g)}
                  className={`flex-1 py-2 rounded-xl text-sm font-medium capitalize border transition-all ${
                    form.patient_gender === g
                      ? "bg-primary text-white border-primary"
                      : "border-border text-muted-foreground hover:border-primary/30"
                  }`}
                >
                  {g}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">Reason for Visit</label>
            <textarea
              value={form.reason}
              onChange={(e) => update("reason", e.target.value)}
              placeholder="Symptoms or reason..."
              rows={2}
              className="w-full px-4 py-3 rounded-xl border border-input text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all resize-none"
            />
          </div>

          <label className="flex items-center gap-3 p-3 rounded-xl border border-border hover:bg-muted/50 cursor-pointer transition-colors">
            <input
              type="checkbox"
              checked={form.is_priority}
              onChange={(e) => update("is_priority", e.target.checked)}
              className="w-4 h-4 rounded accent-red-600"
            />
            <div>
              <p className="text-sm font-semibold text-foreground">Priority Patient</p>
              <p className="text-xs text-muted-foreground">Mark as urgent case</p>
            </div>
          </label>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 h-11 border-2 border-border rounded-xl text-sm font-semibold text-foreground hover:border-primary/30 hover:bg-blue-50/50 transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 h-11 bg-gradient-to-r from-blue-600 to-teal-600 text-white font-semibold rounded-xl flex items-center justify-center gap-2 hover:shadow-lg transition-all disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Adding...
                </>
              ) : (
                <>
                  <UserPlus className="w-4 h-4" />
                  Add Patient
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
