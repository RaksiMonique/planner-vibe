export default function Loading() {
  return (
    <div className="flex flex-col gap-4" aria-busy="true" aria-live="polite">
      <div className="bg-muted/60 h-8 w-56 animate-pulse rounded-md" />
      <div className="bg-muted/40 h-4 w-80 max-w-full animate-pulse rounded" />
      <div className="grid gap-4 lg:grid-cols-3">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="bg-card h-40 animate-pulse rounded-xl border" />
        ))}
      </div>
      <span className="sr-only">Loading</span>
    </div>
  );
}
