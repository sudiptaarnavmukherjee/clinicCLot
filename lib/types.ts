export type AppointmentStatus =
  | "waiting"
  | "called"
  | "in-progress"
  | "completed"
  | "skipped"
  | "cancelled"
  | "no-show";

export type SessionStatus =
  | "scheduled"
  | "active"
  | "paused"
  | "completed"
  | "cancelled";

export type SubscriptionPlan = "free" | "pro" | "enterprise";

export interface Pharmacy {
  id: string;
  user_id: string;
  name: string;
  slug: string;
  address: string | null;
  phone: string | null;
  email: string | null;
  logo_url: string | null;
  cover_image_url: string | null;
  description: string | null;
  settings: PharmacySettings;
  subscription_plan: SubscriptionPlan;
  is_active: boolean;
  timezone: string;
  created_at: string;
  updated_at: string;
}

export interface PharmacySettings {
  allow_walkins: boolean;
  max_daily_appointments: number;
  notify_sms: boolean;
  notify_whatsapp: boolean;
  avg_consultation_minutes: number;
  booking_lead_hours: number;
  auto_complete_session: boolean;
  show_queue_to_public: boolean;
  custom_message: string;
  accent_color: string;
}

export interface Doctor {
  id: string;
  pharmacy_id: string;
  name: string;
  slug: string;
  specialty: string | null;
  qualification: string | null;
  photo_url: string | null;
  consultation_fee: number;
  avg_consultation_duration: number;
  bio: string | null;
  phone: string | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface Session {
  id: string;
  doctor_id: string;
  pharmacy_id: string;
  date: string;
  start_time: string;
  end_time: string;
  max_appointments: number;
  status: SessionStatus;
  booking_open: boolean;
  notes: string | null;
  recurring_session_id: string | null;
  created_at: string;
  updated_at: string;
  doctor?: Doctor;
  appointments?: Appointment[];
  _count?: {
    waiting: number;
    completed: number;
    total: number;
  };
}

export interface RecurringSession {
  id: string;
  pharmacy_id: string;
  doctor_id: string;
  day_of_week: number; // 0=Sun, 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat
  start_time: string;
  end_time: string;
  max_appointments: number;
  is_active: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface Appointment {
  id: string;
  session_id: string;
  doctor_id: string;
  pharmacy_id: string;
  patient_name: string;
  patient_phone: string | null;
  patient_age: number | null;
  patient_gender: string | null;
  reason: string | null;
  serial_number: number;
  token: string;
  status: AppointmentStatus;
  booked_at: string;
  called_at: string | null;
  started_at: string | null;
  completed_at: string | null;
  notes: string | null;
  is_priority: boolean;
  created_at: string;
  updated_at: string;
  session?: Session;
  doctor?: Doctor;
}

export interface QueueStats {
  total: number;
  waiting: number;
  called: number;
  in_progress: number;
  completed: number;
  skipped: number;
  no_show: number;
  cancelled: number;
}

export interface DashboardStats {
  today_total: number;
  today_completed: number;
  today_waiting: number;
  today_skipped: number;
  avg_wait_minutes: number;
  total_this_month: number;
  active_sessions: number;
}

export interface BookingFormData {
  patient_name: string;
  patient_phone?: string;
  patient_age?: number;
  patient_gender?: string;
  reason?: string;
}

export interface CreateDoctorData {
  name: string;
  specialty?: string;
  qualification?: string;
  consultation_fee?: number;
  avg_consultation_duration?: number;
  bio?: string;
  phone?: string;
}

export interface CreateSessionData {
  doctor_id: string;
  date: string;
  start_time: string;
  end_time: string;
  max_appointments?: number;
  notes?: string;
}

export interface PatientQueueView {
  appointment: Appointment;
  position: number;
  patients_before: number;
  estimated_wait_minutes: number;
  is_current: boolean;
  session: Session;
  pharmacy: Pharmacy;
  doctor: Doctor;
}

export interface DoctorSchedule {
  id: string;
  doctor_id: string;
  pharmacy_id: string;
  day_of_week: number; // 0=Sun, 1=Mon, ... 6=Sat
  start_time: string;
  end_time: string;
  max_appointments: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}
