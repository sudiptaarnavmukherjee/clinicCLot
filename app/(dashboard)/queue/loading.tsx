export default function QueueLoading() {
  return (
    <div className="flex h-screen bg-background overflow-hidden animate-pulse">
      {/* Desktop sidebar placeholder */}
      <div className="hidden md:flex w-64 bg-white border-r border-border flex-shrink-0" />

      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="h-16 bg-white border-b border-border px-6 flex items-center gap-4">
          <div className="h-5 w-28 bg-muted rounded" />
          <div className="ml-auto h-5 w-20 bg-muted rounded" />
        </div>

        <div className="flex-1 flex overflow-hidden">
          {/* Session selector panel */}
          <div className="w-72 border-r border-border bg-white p-4 space-y-3 hidden lg:block">
            <div className="h-4 w-20 bg-muted rounded mb-4" />
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-20 bg-muted rounded-2xl" />
            ))}
          </div>

          {/* Queue list */}
          <div className="flex-1 p-4 space-y-3 overflow-y-auto">
            <div className="grid grid-cols-3 gap-3 mb-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-20 bg-muted rounded-2xl" />
              ))}
            </div>
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center gap-4 p-4 bg-white rounded-2xl border border-border">
                <div className="w-10 h-10 bg-muted rounded-xl" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-32 bg-muted rounded" />
                  <div className="h-3 w-20 bg-muted rounded" />
                </div>
                <div className="h-8 w-24 bg-muted rounded-xl" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
