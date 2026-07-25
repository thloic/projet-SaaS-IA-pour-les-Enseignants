export default function DashboardLoading() {
  return (
    <div className="mx-auto max-w-7xl animate-pulse space-y-6">
      <div className="flex justify-between gap-4">
        <div className="h-16 w-72 rounded-lg bg-muted/40" />
        <div className="hidden h-10 w-80 rounded-lg bg-muted/40 sm:block" />
      </div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        {Array.from({ length: 5 }).map((_, index) => (
          <div key={index} className="h-28 rounded-lg bg-muted/40" />
        ))}
      </div>
      <div className="grid gap-5 xl:grid-cols-[1.45fr_0.55fr]">
        <div className="h-80 rounded-lg bg-muted/40" />
        <div className="h-80 rounded-lg bg-muted/40" />
      </div>
      <div className="h-80 rounded-lg bg-muted/40" />
    </div>
  )
}
