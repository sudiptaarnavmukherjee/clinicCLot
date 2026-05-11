export default function DoctorsLoading() {
  return (
    <div className="p-4 md:p-6 space-y-6 animate-pulse">
      {/* Header + add button */}
      <div className="flex items-center justify-between">
        <div className="h-5 w-32 bg-muted rounded" />
        <div className="h-10 w-32 bg-muted rounded-xl" />
      </div>

      {/* Doctor cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="bg-white rounded-2xl border border-border p-5 space-y-4">
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 bg-muted rounded-2xl flex-shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-28 bg-muted rounded" />
                <div className="h-3 w-20 bg-muted rounded" />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {[...Array(3)].map((_, j) => (
                <div key={j} className="h-14 bg-muted rounded-xl" />
              ))}
            </div>
            <div className="flex gap-2">
              <div className="h-8 flex-1 bg-muted rounded-xl" />
              <div className="h-8 flex-1 bg-muted rounded-xl" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
