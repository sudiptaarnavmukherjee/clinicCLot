export default function SessionsLoading() {
  return (
    <div className="p-4 md:p-6 space-y-6 animate-pulse">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="h-5 w-36 bg-muted rounded" />
        <div className="h-10 w-36 bg-muted rounded-xl" />
      </div>

      {/* Today's sessions */}
      <div className="space-y-3">
        <div className="h-4 w-28 bg-muted rounded" />
        {[...Array(2)].map((_, i) => (
          <div key={i} className="bg-white rounded-2xl border border-border p-5">
            <div className="flex items-start justify-between mb-4">
              <div className="space-y-2">
                <div className="h-4 w-36 bg-muted rounded" />
                <div className="h-3 w-24 bg-muted rounded" />
              </div>
              <div className="h-6 w-20 bg-muted rounded-full" />
            </div>
            <div className="grid grid-cols-3 gap-3 mb-4">
              {[...Array(3)].map((_, j) => (
                <div key={j} className="h-14 bg-muted rounded-xl" />
              ))}
            </div>
            <div className="flex gap-2">
              <div className="h-9 w-32 bg-muted rounded-xl" />
              <div className="h-9 w-20 bg-muted rounded-xl" />
            </div>
          </div>
        ))}
      </div>

      {/* Past sessions */}
      <div className="space-y-3">
        <div className="h-4 w-28 bg-muted rounded" />
        {[...Array(3)].map((_, i) => (
          <div key={i} className="bg-white rounded-2xl border border-border p-4">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-muted rounded-xl" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-32 bg-muted rounded" />
                <div className="h-3 w-20 bg-muted rounded" />
              </div>
              <div className="h-6 w-16 bg-muted rounded-full" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
