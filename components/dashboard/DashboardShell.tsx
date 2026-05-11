"use client";

import { useState } from "react";
import Sidebar, { MobileSidebarToggle } from "@/components/dashboard/Sidebar";
import { Bell } from "lucide-react";

interface DashboardShellProps {
  children: React.ReactNode;
  pharmacyName: string;
  pageTitle: string;
  pageDescription?: string;
  actions?: React.ReactNode;
}

export default function DashboardShell({
  children,
  pharmacyName,
  pageTitle,
  pageDescription,
  actions,
}: DashboardShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Desktop Sidebar */}
      <div className="hidden md:flex md:flex-shrink-0">
        <Sidebar pharmacyName={pharmacyName} />
      </div>

      {/* Mobile Sidebar overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setSidebarOpen(false)}
          />
          <div className="absolute left-0 top-0 h-full w-72 shadow-2xl">
            <Sidebar
              pharmacyName={pharmacyName}
              onClose={() => setSidebarOpen(false)}
              mobile
            />
          </div>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <header className="bg-white border-b border-border px-4 sm:px-6 py-4 flex items-center gap-4">
          <div className="md:hidden">
            <MobileSidebarToggle onOpen={() => setSidebarOpen(true)} />
          </div>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-foreground leading-none">{pageTitle}</h1>
            {pageDescription && (
              <p className="text-sm text-muted-foreground mt-0.5">{pageDescription}</p>
            )}
          </div>
          <div className="flex items-center gap-3">
            {actions}
            <button className="relative p-2 rounded-xl hover:bg-muted transition-colors">
              <Bell className="w-5 h-5 text-muted-foreground" />
            </button>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
