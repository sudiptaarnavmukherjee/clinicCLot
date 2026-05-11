export default function BookingLoading() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-teal-50 flex items-start justify-center p-4 pt-8 animate-pulse">
      <div className="w-full max-w-md space-y-4">
        {/* Pharmacy header */}
        <div className="text-center mb-6">
          <div className="w-14 h-14 bg-muted rounded-2xl mx-auto mb-3" />
          <div className="h-5 w-36 bg-muted rounded mx-auto mb-1" />
          <div className="h-3 w-24 bg-muted rounded mx-auto" />
        </div>

        {/* Card */}
        <div className="bg-white rounded-3xl border border-border shadow-xl p-6 space-y-4">
          <div className="h-5 w-40 bg-muted rounded" />
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-20 bg-muted rounded-2xl" />
          ))}
        </div>
      </div>
    </div>
  );
}
