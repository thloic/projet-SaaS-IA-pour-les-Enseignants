interface GenerationCounterProps {
  used: number
  limit: number
  label?: string
  className?: string
}

function progressColor(used: number, limit: number) {
  if (used >= limit) return 'bg-red-500'
  if (used >= limit - 1) return 'bg-amber-400'
  return 'bg-emerald-400'
}

export default function GenerationCounter({
  used,
  limit,
  label = 'générations',
  className = '',
}: GenerationCounterProps) {
  const safeLimit = Math.max(limit, 1)
  const safeUsed = Math.max(0, Math.min(used, safeLimit))
  const progress = Math.round((safeUsed / safeLimit) * 100)

  return (
    <div className={`space-y-2 ${className}`}>
      <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
        <span>{safeUsed}/{safeLimit} {label}</span>
        <span>{progress}%</span>
      </div>
      <div className="h-1.5 rounded-full bg-muted">
        <div
          className={`h-1.5 rounded-full transition-all ${progressColor(safeUsed, safeLimit)}`}
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  )
}
