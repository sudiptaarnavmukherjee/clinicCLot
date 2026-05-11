export default function QueueTrackingLoading() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-teal-50 flex items-start justify-center p-4 pt-8 animate-pulse">
      <div className="w-full max-w-md space-y-4">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="w-14 h-14 bg-muted rounded-2xl mx-auto mb-3" />
          <div className="h-5 w-36 bg-muted rounded mx-auto" />
        </div>

        {/* Status card */}
        <div className="bg-white rounded-3xl border border-border shadow-xl overflow-hidden">
          <div className="h-40 bg-muted" />
          <div className="p-6 space-y-4">
            <div className="h-20 bg-muted rounded-2xl" />
            <div className="grid grid-cols-2 gap-3">
              <div className="h-16 bg-muted rounded-2xl" />
              <div className="h-16 bg-muted rounded-2xl" />
            </div>
          </div>
        </div>

        {/* Queue list preview */}
        <div className="bg-white rounded-3xl border border-border shadow-xl p-5 space-y-3">
          <div className="h-4 w-28 bg-muted rounded" />
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-12 bg-muted rounded-xl" />
          ))}
        </div>
      </div>
    </div>
  );
}
