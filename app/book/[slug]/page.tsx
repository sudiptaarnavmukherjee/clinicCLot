import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import BookingClient from "./BookingClient";
import type { Metadata } from "next";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const supabase = await createClient();
  const { data: pharmacy } = await supabase
    .from("pharmacies")
    .select("name, description")
    .eq("slug", slug)
    .single();

  return {
    title: pharmacy ? `Book with ${pharmacy.name}` : "Book Appointment",
    description: pharmacy?.description || `Book your appointment online at ${pharmacy?.name}`,
  };
}

export default async function BookingPage({ params }: Props) {
  const { slug } = await params;
  const supabase = await createClient();

  // Handle demo page
  if (slug === "demo") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-teal-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center">
          <div className="bg-white rounded-3xl border border-border shadow-xl p-8">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-teal-600 rounded-2xl flex items-center justify-center mx-auto mb-5 shadow-lg">
              <svg className="w-8 h-8 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-foreground mb-2">Demo Page</h1>
            <p className="text-muted-foreground text-sm mb-6">
              This is where patients see the booking page for your pharmacy.
              Register your clinic to get your own booking link.
            </p>
            <a
              href="/register"
              className="block w-full py-3 bg-gradient-to-r from-blue-600 to-teal-600 text-white font-semibold rounded-xl text-sm hover:shadow-lg transition-all"
            >
              Register Your Pharmacy →
            </a>
          </div>
        </div>
      </div>
    );
  }

  // Fetch pharmacy
  const { data: pharmacy } = await supabase
    .from("pharmacies")
    .select("*")
    .eq("slug", slug)
    .eq("is_active", true)
    .single();

  if (!pharmacy) notFound();

  // Fetch active doctors
  const { data: doctors } = await supabase
    .from("doctors")
    .select("*")
    .eq("pharmacy_id", pharmacy.id)
    .eq("is_active", true)
    .order("sort_order");

  // Use a ±1-day UTC window so sessions created in any timezone are found
  const now = new Date();
  const toDate = (d: Date) => d.toISOString().split("T")[0];
  const yesterday = new Date(now); yesterday.setUTCDate(now.getUTCDate() - 1);
  const tomorrow  = new Date(now); tomorrow.setUTCDate(now.getUTCDate() + 1);
  const { data: sessions } = await supabase
    .from("sessions")
    .select("*, appointments(status, serial_number)")
    .eq("pharmacy_id", pharmacy.id)
    .gte("date", toDate(yesterday))
    .lte("date", toDate(tomorrow))
    .in("status", ["active", "scheduled", "paused"])
    .order("date")
    .order("start_time");

  return (
    <BookingClient
      pharmacy={pharmacy}
      doctors={doctors || []}
      sessions={sessions || []}
    />
  );
}
