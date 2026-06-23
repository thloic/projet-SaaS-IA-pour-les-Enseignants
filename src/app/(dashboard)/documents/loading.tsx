export default function DocumentsLoading() {
  return (
    <div className="max-w-2xl mx-auto space-y-8 animate-pulse">
      <div className="flex items-center gap-3">
        <div className="h-11 w-11 rounded-2xl bg-muted/40" />
        <div className="space-y-2">
          <div className="h-5 w-40 rounded-lg bg-muted/40" />
          <div className="h-3 w-56 rounded-lg bg-muted/30" />
        </div>
      </div>
      <div className="h-72 rounded-2xl bg-muted/20 border border-border" />
      <div className="space-y-3">
        <div className="h-20 rounded-2xl bg-muted/20 border border-border" />
        <div className="h-20 rounded-2xl bg-muted/20 border border-border" />
      </div>
    </div>
  )
}
