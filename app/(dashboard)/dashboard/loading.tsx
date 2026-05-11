export default function DashboardLoading() {
  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto animate-pulse">
      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-white rounded-2xl border border-border p-5">
            <div className="w-11 h-11 bg-muted rounded-xl mb-4" />
            <div className="h-8 w-16 bg-muted rounded-lg mb-2" />
            <div className="h-3 w-24 bg-muted rounded" />
          </div>
        ))}
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-24 bg-muted rounded-2xl" />
        ))}
      </div>

      {/* Sessions list */}
      <div className="bg-white rounded-2xl border border-border p-6 space-y-4">
        <div className="h-5 w-32 bg-muted rounded" />
        {[...Array(3)].map((_, i) => (
          <div key={i} className="flex items-center gap-4 p-4 bg-muted rounded-xl">
            <div className="w-10 h-10 bg-muted-foreground/10 rounded-xl" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-40 bg-muted-foreground/10 rounded" />
              <div className="h-3 w-24 bg-muted-foreground/10 rounded" />
            </div>
            <div className="h-6 w-16 bg-muted-foreground/10 rounded-full" />
          </div>
        ))}
      </div>
    </div>
  );
}
