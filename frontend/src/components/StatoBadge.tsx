type Stato = 'BOZZA' | 'INCOMPLETO' | 'COMPLETO'

const config: Record<Stato, { label: string; className: string }> = {
  BOZZA:      { label: 'Bozza',      className: 'bg-slate-100 text-slate-600' },
  INCOMPLETO: { label: 'Incompleto', className: 'bg-amber-100 text-amber-700' },
  COMPLETO:   { label: 'Completo',   className: 'bg-emerald-100 text-emerald-700' },
}

export default function StatoBadge({ stato }: { stato: Stato }) {
  const { label, className } = config[stato] ?? config.BOZZA
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${className}`}>
      {label}
    </span>
  )
}
