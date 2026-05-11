export default function AnalyticsLoading() {
  return (
    <div className="p-4 md:p-6 space-y-6 animate-pulse">
      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-white rounded-2xl border border-border p-5">
            <div className="w-10 h-10 bg-muted rounded-xl mb-3" />
            <div className="h-7 w-16 bg-muted rounded mb-2" />
            <div className="h-3 w-20 bg-muted rounded" />
          </div>
        ))}
      </div>

      {/* Bar chart */}
      <div className="bg-white rounded-2xl border border-border p-6">
        <div className="h-4 w-32 bg-muted rounded mb-2" />
        <div className="h-3 w-48 bg-muted rounded mb-6" />
        <div className="h-56 bg-muted rounded-xl" />
      </div>

      {/* Pie chart + completion */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl border border-border p-6">
          <div className="h-4 w-28 bg-muted rounded mb-4" />
          <div className="h-48 bg-muted rounded-xl" />
        </div>
        <div className="bg-white rounded-2xl border border-border p-6">
          <div className="h-4 w-28 bg-muted rounded mb-4" />
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-10 bg-muted rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
