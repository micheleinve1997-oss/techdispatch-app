export function SkeletonRow() {
  return (
    <div className="flex items-center gap-4 px-6 py-4 animate-pulse">
      <div className="w-8 h-8 bg-slate-200 rounded-full shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="h-3.5 bg-slate-200 rounded w-48" />
        <div className="h-3 bg-slate-100 rounded w-32" />
      </div>
      <div className="h-5 bg-slate-200 rounded-full w-20" />
    </div>
  )
}

export function SkeletonForm() {
  return (
    <div className="space-y-4 animate-pulse">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="space-y-1.5">
          <div className="h-3 bg-slate-200 rounded w-24" />
          <div className="h-10 bg-slate-100 rounded-lg" />
        </div>
      ))}
    </div>
  )
}
