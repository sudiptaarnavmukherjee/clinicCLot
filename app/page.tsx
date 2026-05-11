import Link from "next/link";
import {
  Clock, Users, BarChart3, Smartphone, Shield, Zap,
  CheckCircle, ArrowRight, Star, Activity, Bell, QrCode
} from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-teal-50/20">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-xl border-b border-border/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-teal-600 rounded-xl flex items-center justify-center">
                <Activity className="w-4 h-4 text-white" />
              </div>
              <span className="text-xl font-bold text-foreground">ClinicQ</span>
            </div>
            <div className="hidden md:flex items-center gap-8">
              <a href="#features" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Features</a>
              <a href="#how-it-works" className="text-sm text-muted-foreground hover:text-foreground transition-colors">How it Works</a>
              <a href="#pricing" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Pricing</a>
            </div>
            <div className="flex items-center gap-3">
              <Link href="/login" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors px-4 py-2">
                Sign In
              </Link>
              <Link
                href="/register"
                className="bg-gradient-to-r from-blue-600 to-teal-600 text-white text-sm font-semibold px-5 py-2.5 rounded-xl hover:shadow-lg transition-all duration-200 hover:scale-105"
              >
                Get Started Free
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-28 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-4xl mx-auto">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-full px-4 py-1.5 mb-6">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <span className="text-sm font-medium text-blue-700">Live Queue Updates · Zero Wait Confusion</span>
            </div>

            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight text-foreground mb-6 leading-[1.1]">
              Smart Booking for{" "}
              <span className="bg-gradient-to-r from-blue-600 to-teal-600 bg-clip-text text-transparent">
                Clinics & Pharmacies
              </span>
            </h1>

            <p className="text-xl text-muted-foreground mb-10 max-w-2xl mx-auto leading-relaxed">
              Let patients book instantly via a shared link — no app download, no sign-in.
              Real-time queue tracking keeps everyone in sync while you focus on care.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/register"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-teal-600 text-white font-semibold px-8 py-4 rounded-2xl text-lg shadow-xl shadow-blue-500/25 hover:shadow-2xl hover:shadow-blue-500/30 transition-all duration-300 hover:scale-105"
              >
                Start Free — No Credit Card
                <ArrowRight className="w-5 h-5" />
              </Link>
              <Link
                href="/book/demo"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-white border-2 border-border text-foreground font-semibold px-8 py-4 rounded-2xl text-lg hover:border-blue-300 hover:bg-blue-50/50 transition-all duration-200"
              >
                Live Demo
                <Zap className="w-4 h-4 text-blue-600" />
              </Link>
            </div>

            {/* Trust stats */}
            <div className="flex flex-wrap items-center justify-center gap-8 mt-12 pt-8 border-t border-border/50">
              {[
                { label: "Clinics Onboarded", value: "500+" },
                { label: "Daily Bookings", value: "10K+" },
                { label: "Time Saved / Day", value: "3 hrs" },
                { label: "Patient Satisfaction", value: "98%" },
              ].map((stat) => (
                <div key={stat.label} className="text-center">
                  <div className="text-2xl font-bold text-foreground">{stat.value}</div>
                  <div className="text-xs text-muted-foreground">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Hero visual - Queue preview */}
          <div className="mt-16 relative mx-auto max-w-3xl">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 to-teal-600/20 rounded-3xl blur-3xl" />
            <div className="relative bg-white rounded-3xl border border-border shadow-2xl overflow-hidden">
              {/* Mock dashboard header */}
              <div className="bg-gradient-to-r from-blue-600 to-teal-600 px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-white/20 rounded-xl flex items-center justify-center">
                    <Activity className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <p className="text-white font-bold text-sm">Green Valley Pharmacy</p>
                    <p className="text-blue-100 text-xs">Dr. Rahman — Live Session</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 bg-white/20 rounded-full px-3 py-1">
                  <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                  <span className="text-white text-xs font-medium">LIVE</span>
                </div>
              </div>
              {/* Stats bar */}
              <div className="grid grid-cols-4 divide-x divide-border border-b border-border">
                {[
                  { label: "Total", value: "24", color: "text-foreground" },
                  { label: "Waiting", value: "14", color: "text-blue-600" },
                  { label: "Completed", value: "9", color: "text-green-600" },
                  { label: "Skipped", value: "1", color: "text-gray-400" },
                ].map((s) => (
                  <div key={s.label} className="p-4 text-center">
                    <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                    <p className="text-xs text-muted-foreground">{s.label}</p>
                  </div>
                ))}
              </div>
              {/* Queue items */}
              <div className="p-4 space-y-2.5">
                {[
                  { serial: "01", name: "Rahima Begum", status: "in-progress", time: "11:02 AM", tag: "In Progress", tagColor: "bg-purple-100 text-purple-700" },
                  { serial: "02", name: "Karim Ahmed", status: "waiting", time: "11:15 AM", tag: "Waiting", tagColor: "bg-blue-100 text-blue-700" },
                  { serial: "03", name: "Sadia Islam", status: "waiting", time: "11:22 AM", tag: "Waiting", tagColor: "bg-blue-100 text-blue-700" },
                  { serial: "04", name: "Mohammad Ali", status: "waiting", time: "11:31 AM", tag: "Waiting", tagColor: "bg-blue-100 text-blue-700" },
                ].map((item, i) => (
                  <div key={i} className={`flex items-center gap-4 p-3.5 rounded-xl border ${i === 0 ? "border-purple-200 bg-purple-50" : "border-border bg-white"}`}>
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm ${i === 0 ? "bg-purple-600 text-white" : "bg-blue-50 text-blue-700"}`}>
                      {item.serial}
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-sm text-foreground">{item.name}</p>
                      <p className="text-xs text-muted-foreground">Booked at {item.time}</p>
                    </div>
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${item.tagColor}`}>{item.tag}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-foreground mb-4">
              Everything a Small Clinic Needs
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Designed specifically for pharmacies and small clinics — powerful features without the complexity
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                icon: <Activity className="w-6 h-6" />,
                title: "Real-Time Queue",
                desc: "Live updates the moment a patient is called or completes their visit. Zero refresh needed.",
                color: "from-blue-500 to-blue-600",
                bg: "bg-blue-50",
              },
              {
                icon: <Smartphone className="w-6 h-6" />,
                title: "Book via Shared Link",
                desc: "Patients book through a simple link — no app, no sign-in. Just name, phone, done.",
                color: "from-teal-500 to-teal-600",
                bg: "bg-teal-50",
              },
              {
                icon: <Clock className="w-6 h-6" />,
                title: "Wait Time Estimates",
                desc: "Smart estimates based on actual consultation pace. Patients know exactly when to arrive.",
                color: "from-purple-500 to-purple-600",
                bg: "bg-purple-50",
              },
              {
                icon: <Bell className="w-6 h-6" />,
                title: "Live Position Tracking",
                desc: "Patients see their queue position update live — no more calling the pharmacy to check.",
                color: "from-amber-500 to-amber-600",
                bg: "bg-amber-50",
              },
              {
                icon: <BarChart3 className="w-6 h-6" />,
                title: "Analytics & Reports",
                desc: "Daily reports, peak hours, avg consultation time, and completion rates at a glance.",
                color: "from-emerald-500 to-emerald-600",
                bg: "bg-emerald-50",
              },
              {
                icon: <QrCode className="w-6 h-6" />,
                title: "QR Code Booking",
                desc: "Print a QR code for your counter or wall. Patients scan and book instantly.",
                color: "from-rose-500 to-rose-600",
                bg: "bg-rose-50",
              },
              {
                icon: <Users className="w-6 h-6" />,
                title: "Multi-Doctor Support",
                desc: "Manage multiple doctors with separate queues, schedules, and booking links.",
                color: "from-indigo-500 to-indigo-600",
                bg: "bg-indigo-50",
              },
              {
                icon: <Shield className="w-6 h-6" />,
                title: "Walk-in Priority",
                desc: "Insert priority patients into the queue instantly without disrupting others.",
                color: "from-cyan-500 to-cyan-600",
                bg: "bg-cyan-50",
              },
              {
                icon: <Zap className="w-6 h-6" />,
                title: "One-Tap Session Control",
                desc: "Start, pause, or end a session in one tap. Auto-close when all patients are done.",
                color: "from-orange-500 to-orange-600",
                bg: "bg-orange-50",
              },
            ].map((feature, i) => (
              <div
                key={i}
                className="p-6 rounded-2xl border border-border hover:shadow-lg transition-all duration-300 hover:-translate-y-1 bg-white group"
              >
                <div className={`w-12 h-12 rounded-2xl ${feature.bg} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-200`}>
                  <div className={`bg-gradient-to-br ${feature.color} bg-clip-text text-transparent`}>
                    {feature.icon}
                  </div>
                </div>
                <h3 className="text-lg font-bold text-foreground mb-2">{feature.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-foreground mb-4">How ClinicQ Works</h2>
            <p className="text-lg text-muted-foreground">Set up in minutes, run forever</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            <div className="space-y-8">
              <h3 className="text-2xl font-bold text-foreground">For Your Pharmacy</h3>
              {[
                { step: "1", title: "Register your pharmacy", desc: "Sign up and add your doctor details, consultation timings, and branding." },
                { step: "2", title: "Open a session", desc: "Tap 'Start Session' when the doctor arrives. Set the time window and max patients." },
                { step: "3", title: "Manage the queue", desc: "Call patients one by one. Mark as done, skip, or add walk-ins with a single tap." },
                { step: "4", title: "Review daily stats", desc: "See how many patients were seen, average wait times, and no-show rates." },
              ].map((item) => (
                <div key={item.step} className="flex gap-4">
                  <div className="w-10 h-10 min-w-10 rounded-2xl bg-gradient-to-br from-blue-600 to-teal-600 flex items-center justify-center text-white font-bold text-sm">
                    {item.step}
                  </div>
                  <div>
                    <h4 className="font-bold text-foreground">{item.title}</h4>
                    <p className="text-sm text-muted-foreground mt-1">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="space-y-8">
              <h3 className="text-2xl font-bold text-foreground">For Your Patients</h3>
              {[
                { step: "1", title: "Get the booking link", desc: "You share a link via WhatsApp, Facebook, or print a QR code at the counter." },
                { step: "2", title: "Book in 30 seconds", desc: "Patient enters their name, phone, and reason for visit. No account needed." },
                { step: "3", title: "Get a serial number", desc: "Instantly receive a token and their position in the queue." },
                { step: "4", title: "Track live", desc: "The same link shows real-time queue updates, position, and estimated wait time." },
              ].map((item) => (
                <div key={item.step} className="flex gap-4">
                  <div className="w-10 h-10 min-w-10 rounded-2xl bg-gradient-to-br from-teal-600 to-emerald-600 flex items-center justify-center text-white font-bold text-sm">
                    {item.step}
                  </div>
                  <div>
                    <h4 className="font-bold text-foreground">{item.title}</h4>
                    <p className="text-sm text-muted-foreground mt-1">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-20 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-foreground mb-4">Simple, Honest Pricing</h2>
            <p className="text-lg text-muted-foreground">No hidden fees. Cancel anytime.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {[
              {
                name: "Free",
                price: "৳0",
                period: "/month",
                desc: "Perfect to get started",
                features: ["1 Doctor", "50 bookings/day", "Real-time queue", "Shareable link", "Basic analytics"],
                cta: "Start Free",
                highlight: false,
              },
              {
                name: "Pro",
                price: "৳499",
                period: "/month",
                desc: "Best for growing clinics",
                features: ["3 Doctors", "Unlimited bookings", "QR code generation", "Advanced analytics", "Priority support", "Custom branding"],
                cta: "Start Pro",
                highlight: true,
              },
              {
                name: "Enterprise",
                price: "৳999",
                period: "/month",
                desc: "For multi-branch pharmacies",
                features: ["Unlimited doctors", "Multi-location", "SMS notifications", "Dedicated support", "Custom domain", "API access"],
                cta: "Contact Us",
                highlight: false,
              },
            ].map((plan) => (
              <div
                key={plan.name}
                className={`rounded-3xl p-8 border ${plan.highlight ? "border-blue-400 bg-gradient-to-b from-blue-600 to-teal-600 shadow-2xl shadow-blue-500/25 scale-105" : "border-border bg-white shadow-sm"}`}
              >
                <h3 className={`text-xl font-bold mb-1 ${plan.highlight ? "text-white" : "text-foreground"}`}>{plan.name}</h3>
                <p className={`text-sm mb-4 ${plan.highlight ? "text-blue-100" : "text-muted-foreground"}`}>{plan.desc}</p>
                <div className="flex items-baseline gap-1 mb-6">
                  <span className={`text-4xl font-bold ${plan.highlight ? "text-white" : "text-foreground"}`}>{plan.price}</span>
                  <span className={`text-sm ${plan.highlight ? "text-blue-100" : "text-muted-foreground"}`}>{plan.period}</span>
                </div>
                <ul className="space-y-3 mb-8">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-center gap-2.5">
                      <CheckCircle className={`w-4 h-4 flex-shrink-0 ${plan.highlight ? "text-blue-200" : "text-green-500"}`} />
                      <span className={`text-sm ${plan.highlight ? "text-blue-50" : "text-foreground"}`}>{f}</span>
                    </li>
                  ))}
                </ul>
                <Link
                  href="/register"
                  className={`block w-full text-center py-3 rounded-xl font-semibold text-sm transition-all duration-200 ${plan.highlight ? "bg-white text-blue-700 hover:bg-blue-50 shadow-lg" : "bg-gradient-to-r from-blue-600 to-teal-600 text-white hover:shadow-lg hover:shadow-blue-500/25"}`}
                >
                  {plan.cta}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <div className="bg-gradient-to-br from-blue-600 to-teal-600 rounded-3xl p-12 text-white relative overflow-hidden">
            <div className="absolute inset-0 bg-grid-white/10 [mask-image:linear-gradient(0deg,white,rgba(255,255,255,0.6))]" />
            <div className="relative">
              <div className="flex justify-center mb-4">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-5 h-5 text-yellow-400 fill-yellow-400" />
                ))}
              </div>
              <h2 className="text-4xl font-bold mb-4">Ready to end the chaos?</h2>
              <p className="text-xl text-blue-100 mb-8 max-w-xl mx-auto">
                Join 500+ clinics already using ClinicQ to run smoother, serve more patients, and grow their practice.
              </p>
              <Link
                href="/register"
                className="inline-flex items-center gap-2 bg-white text-blue-700 font-bold px-8 py-4 rounded-2xl text-lg hover:shadow-2xl transition-all duration-300 hover:scale-105"
              >
                Get Started — It&apos;s Free
                <ArrowRight className="w-5 h-5" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-4 sm:px-6 lg:px-8 border-t border-border bg-white">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-gradient-to-br from-blue-600 to-teal-600 rounded-lg flex items-center justify-center">
              <Activity className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="font-bold text-foreground">ClinicQ</span>
          </div>
          <p className="text-sm text-muted-foreground">
            © 2026 ClinicQ. Built for real clinics, real problems.
          </p>
          <div className="flex gap-6">
            <a href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Privacy</a>
            <a href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Terms</a>
            <a href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Contact</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
