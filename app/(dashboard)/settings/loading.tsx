export default function SettingsLoading() {
  return (
    <div className="max-w-2xl mx-auto p-4 md:p-6 space-y-6 animate-pulse">
      {/* Booking link card */}
      <div className="h-40 bg-muted rounded-3xl" />

      {/* Form card */}
      <div className="bg-white rounded-2xl border border-border p-6 space-y-5">
        <div className="h-5 w-28 bg-muted rounded" />
        {[...Array(5)].map((_, i) => (
          <div key={i} className="space-y-2">
            <div className="h-3 w-20 bg-muted rounded" />
            <div className="h-10 bg-muted rounded-xl" />
          </div>
        ))}
        <div className="h-10 w-28 bg-muted rounded-xl" />
      </div>
    </div>
  );
}
