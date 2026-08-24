export default function SearchLoading() {
  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10 w-full animate-pulse">
      <div className="h-8 w-64 rounded-lg bg-card-bg mb-2" />
      <div className="h-4 w-80 rounded-lg bg-card-bg mb-8" />

      <div className="flex flex-col lg:flex-row gap-8">
        <aside className="w-full lg:w-64 shrink-0">
          <div className="flex flex-col gap-6 p-6 rounded-2xl glass-panel">
            <div className="h-4 w-20 rounded bg-card-bg" />
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex flex-col gap-2">
                <div className="h-3 w-24 rounded bg-card-bg" />
                <div className="h-9 w-full rounded-xl bg-card-bg" />
              </div>
            ))}
          </div>
        </aside>

        <section className="flex-1">
          <div className="h-4 w-40 rounded bg-card-bg border-b border-card-border pb-4 mb-6" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex flex-col rounded-2xl glass-card overflow-hidden">
                <div className="h-44 w-full bg-card-bg" />
                <div className="p-5 flex flex-col gap-3">
                  <div className="h-3 w-16 rounded bg-card-bg" />
                  <div className="h-4 w-3/4 rounded bg-card-bg" />
                  <div className="h-3 w-full rounded bg-card-bg" />
                  <div className="h-5 w-20 rounded bg-card-bg mt-2" />
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
