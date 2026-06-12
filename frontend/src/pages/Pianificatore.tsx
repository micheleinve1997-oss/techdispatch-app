import { useMemo, useState, type DragEvent } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { AlertTriangle, CalendarDays, ChevronLeft, ChevronRight, GripVertical, Map, Sparkles, ShieldAlert, X } from 'lucide-react'
import { pianificatoreApi, type PropostaCell, type PropostaIntervento, type PropostaRow } from '../api/pianificatore'

function isoMonday(date = new Date()) {
  const d = new Date(date)
  const day = d.getDay() || 7
  d.setDate(d.getDate() - day + 1)
  return d.toISOString().slice(0, 10)
}

function addDays(iso: string, days: number) {
  const d = new Date(iso)
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

function formatDay(iso: string) {
  return new Intl.DateTimeFormat('it-IT', { weekday: 'short', day: '2-digit', month: '2-digit' }).format(new Date(iso))
}

function formatHours(value?: number) {
  return Number(value ?? 0).toFixed(2).replace('.00', '')
}

function addHours(time: string, hours: number) {
  const [h, m] = time.split(':').map(Number)
  const total = h * 60 + m + Math.round(hours * 60)
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`
}

function planTimes(items: PropostaIntervento[]) {
  let cursor = '08:00'
  return items.map(item => {
    const travelStart = cursor
    const travelEnd = addHours(travelStart, item.viaggio_stimato ?? 0)
    const workStart = travelEnd
    const workEnd = addHours(workStart, item.durata_stimata ?? 0)
    cursor = workEnd
    return { item, travelStart, travelEnd, workStart, workEnd }
  })
}

function moveItem(rows: PropostaRow[], drag: DragPayload, target: { tecnicoId: string; date: string; insertIndex?: number }) {
  let moved: PropostaIntervento | null = null
  const without = rows.map(row => ({
    ...row,
    days: row.days.map(cell => {
      if (row.tecnico.id !== drag.tecnicoId || cell.date !== drag.date) return cell
      const nextInterventi = [...cell.interventi]
      moved = nextInterventi.splice(drag.index, 1)[0] ?? null
      return recalcCell({ ...cell, interventi: nextInterventi }, moved ? moved.tempo_totale ?? moved.durata_stimata : 0, 'remove')
    }),
  }))

  if (!moved) return rows

  return without.map(row => ({
    ...row,
    days: row.days.map(cell => {
      if (row.tecnico.id !== target.tecnicoId || cell.date !== target.date) return cell
      const nextInterventi = [...cell.interventi]
      const sameCell = drag.tecnicoId === target.tecnicoId && drag.date === target.date
      const requestedIndex = target.insertIndex ?? nextInterventi.length
      const insertIndex = sameCell && requestedIndex > drag.index ? requestedIndex - 1 : requestedIndex
      nextInterventi.splice(insertIndex, 0, moved as PropostaIntervento)
      return recalcCell({ ...cell, interventi: nextInterventi }, (moved as PropostaIntervento).tempo_totale ?? (moved as PropostaIntervento).durata_stimata, 'add')
    }),
  }))
}

function recalcCell(cell: PropostaCell, deltaHours: number, mode: 'add' | 'remove'): PropostaCell {
  const sign = mode === 'add' ? -1 : 1
  const viaggioTotale = cell.interventi.reduce((sum, item) => sum + (item.viaggio_stimato ?? 0), 0)
  return {
    ...cell,
    ore_residue: Number((cell.ore_residue + sign * deltaHours).toFixed(2)),
    viaggio_totale: Number(viaggioTotale.toFixed(2)),
    zona_dominante: cell.interventi[0]?.zona ?? null,
  }
}

const priorityClass: Record<string, string> = {
  URGENTE: 'bg-red-50 text-red-700 border-red-200',
  ALTA: 'bg-amber-50 text-amber-700 border-amber-200',
  MEDIA: 'bg-blue-50 text-blue-700 border-blue-200',
  BASSA: 'bg-slate-50 text-slate-600 border-slate-200',
}

type DragPayload = { tecnicoId: string; date: string; index: number }
type RouteModal = { row: PropostaRow; cell: PropostaCell } | null

function InterventionCard({ item, time, dragPayload, onDropBefore }: { item: PropostaIntervento; time?: ReturnType<typeof planTimes>[number]; dragPayload: DragPayload; onDropBefore: (event: DragEvent<HTMLDivElement>) => void }) {
  return (
    <div
      draggable
      onDragStart={event => event.dataTransfer.setData('application/json', JSON.stringify(dragPayload))}
      onDragOver={event => event.preventDefault()}
      onDrop={event => { event.preventDefault(); event.stopPropagation(); onDropBefore(event) }}
      className={`rounded-lg border px-3 py-2 cursor-grab active:cursor-grabbing ${priorityClass[item.priorita ?? 'MEDIA'] ?? priorityClass.MEDIA}`}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0 flex items-center gap-1.5">
          <GripVertical size={13} className="shrink-0 opacity-50" />
          <p className="text-xs font-semibold truncate">{item.titolo}</p>
        </div>
        <span className="text-[10px] font-mono shrink-0">tot {formatHours(item.tempo_totale ?? item.durata_stimata)}h</span>
      </div>
      <p className="text-[11px] mt-1 opacity-80 truncate">{item.cliente_nome || 'Cliente non indicato'}</p>
      <p className="text-[11px] mt-1 opacity-70">{time ? `${time.workStart}-${time.workEnd}` : 'Orario da sequenza'} · Zona {item.zona}</p>
      <p className="text-[11px] mt-1 opacity-70">Lavoro {formatHours(item.durata_stimata)}h · Viaggio {formatHours(item.viaggio_stimato)}h</p>
    </div>
  )
}

function RouteViewer({ route, onClose }: { route: RouteModal; onClose: () => void }) {
  if (!route) return null
  const steps = planTimes(route.cell.interventi)
  const lavoro = route.cell.interventi.reduce((sum, item) => sum + (item.durata_stimata ?? 0), 0)
  const viaggio = route.cell.interventi.reduce((sum, item) => sum + (item.viaggio_stimato ?? 0), 0)

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/30 flex justify-end">
      <aside className="h-full w-full max-w-xl bg-white shadow-2xl border-l border-slate-200 overflow-auto">
        <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase font-semibold text-slate-500">Tragitto giornata</p>
            <h2 className="text-lg font-semibold text-slate-900">{route.row.tecnico.nome} {route.row.tecnico.cognome}</h2>
            <p className="text-sm text-slate-500">{formatDay(route.cell.date)} · partenza CAP {route.row.tecnico.cap_partenza || '-'}</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-slate-100"><X size={18} /></button>
        </div>

        <div className="px-6 py-5 grid grid-cols-3 gap-3">
          <div className="rounded-lg border border-slate-200 p-3"><p className="text-xs text-slate-500 uppercase font-semibold">Tappe</p><p className="text-2xl font-semibold">{steps.length}</p></div>
          <div className="rounded-lg border border-slate-200 p-3"><p className="text-xs text-slate-500 uppercase font-semibold">Lavoro</p><p className="text-2xl font-semibold">{formatHours(lavoro)}h</p></div>
          <div className="rounded-lg border border-slate-200 p-3"><p className="text-xs text-slate-500 uppercase font-semibold">Viaggio</p><p className="text-2xl font-semibold">{formatHours(viaggio)}h</p></div>
        </div>

        <div className="px-6 pb-6">
          <div className="rounded-xl border border-slate-200 overflow-hidden">
            <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 text-sm font-semibold text-slate-700">Sequenza programmata</div>
            <div className="divide-y divide-slate-100">
              {steps.length ? steps.map((step, index) => (
                <div key={`${step.item.id}-${index}`} className="px-4 py-4 flex gap-4">
                  <div className="flex flex-col items-center">
                    <div className="h-7 w-7 rounded-full bg-blue-600 text-white text-xs font-semibold flex items-center justify-center">{index + 1}</div>
                    {index < steps.length - 1 && <div className="w-px flex-1 bg-blue-100 mt-2" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-slate-900 truncate">{step.item.cliente_nome || step.item.titolo}</p>
                    <p className="text-sm text-slate-500 mt-1">Viaggio {step.travelStart}-{step.travelEnd} · lavoro {step.workStart}-{step.workEnd}</p>
                    <p className="text-xs text-slate-400 mt-1">Zona {step.item.zona} · {formatHours(step.item.viaggio_stimato)}h viaggio · {formatHours(step.item.durata_stimata)}h intervento</p>
                  </div>
                </div>
              )) : <p className="px-4 py-6 text-sm text-slate-400">Nessun intervento in questa giornata.</p>}
            </div>
          </div>
        </div>
      </aside>
    </div>
  )
}

export default function Pianificatore() {
  const [start, setStart] = useState(isoMonday())
  const [manualRows, setManualRows] = useState<PropostaRow[] | null>(null)
  const [routeModal, setRouteModal] = useState<RouteModal>(null)
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['pianificatore', start],
    queryFn: () => pianificatoreApi.overview(start),
  })

  const propostaMutation = useMutation({
    mutationFn: () => pianificatoreApi.genera(start),
    onSuccess: proposta => setManualRows(proposta.rows),
  })
  const proposta = propostaMutation.data
  const rows = manualRows ?? proposta?.rows ?? data?.rows ?? []
  const days = proposta?.days ?? data?.days ?? []
  const isProposal = Boolean(proposta)
  const indisponibili = useMemo(() => (data?.rows ?? []).reduce((sum, r) => sum + r.days.filter(d => !d.disponibile).length, 0), [data])
  const manualTravelTotal = useMemo(() => manualRows?.reduce((sum, row) => sum + row.days.reduce((daySum, cell) => daySum + (cell.viaggio_totale ?? 0), 0), 0), [manualRows])

  function resetWeek(nextStart: string) {
    setStart(nextStart)
    setManualRows(null)
    setRouteModal(null)
    propostaMutation.reset()
  }

  function handleDrop(event: DragEvent<HTMLElement>, target: { tecnicoId: string; date: string; insertIndex?: number }) {
    event.preventDefault()
    if (!isProposal) return
    try {
      const drag = JSON.parse(event.dataTransfer.getData('application/json')) as DragPayload
      if (drag.tecnicoId === target.tecnicoId && drag.date === target.date && drag.index === target.insertIndex) return
      setManualRows(current => moveItem(current ?? proposta?.rows ?? [], drag, target))
    } catch {
      // drag esterno non valido
    }
  }

  return (
    <div className="h-full overflow-auto bg-white">
      <RouteViewer route={routeModal} onClose={() => setRouteModal(null)} />
      <div className="border-b border-slate-200 px-8 py-5 flex items-center justify-between gap-6">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Pianificatore</h1>
          <p className="text-sm text-slate-500 mt-1">Generato da tecnici, ferie/non disponibilità, vincoli e interventi da pianificare.</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => resetWeek(addDays(start, -7))} className="p-2 border border-slate-200 rounded-lg hover:bg-slate-50"><ChevronLeft size={17} /></button>
          <div className="flex items-center gap-2 border border-slate-200 rounded-lg px-3 py-2 text-sm font-medium"><CalendarDays size={16} />Settimana {start}</div>
          <button onClick={() => resetWeek(addDays(start, 7))} className="p-2 border border-slate-200 rounded-lg hover:bg-slate-50"><ChevronRight size={17} /></button>
          <button onClick={() => { setManualRows(null); setRouteModal(null); propostaMutation.reset(); refetch() }} className="ml-2 px-3 py-2 rounded-lg border border-slate-200 text-slate-700 text-sm font-medium hover:bg-slate-50">Aggiorna</button>
          <button onClick={() => propostaMutation.mutate()} disabled={propostaMutation.isPending} className="px-3 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2">
            <Sparkles size={15} /> {propostaMutation.isPending ? 'Genero...' : 'Genera proposta'}
          </button>
        </div>
      </div>

      <div className="px-8 py-4 grid grid-cols-3 lg:grid-cols-6 gap-4 border-b border-slate-100">
        <div className="rounded-lg border border-slate-200 px-4 py-3"><p className="text-xs text-slate-500 uppercase font-semibold">Tecnici</p><p className="text-2xl font-semibold">{data?.rows.length ?? 0}</p></div>
        <div className="rounded-lg border border-slate-200 px-4 py-3"><p className="text-xs text-slate-500 uppercase font-semibold">Vincoli</p><p className="text-2xl font-semibold">{data?.vincoli_totali ?? 0}</p></div>
        <div className="rounded-lg border border-slate-200 px-4 py-3"><p className="text-xs text-slate-500 uppercase font-semibold">Blocchi</p><p className="text-2xl font-semibold">{indisponibili}</p></div>
        <div className="rounded-lg border border-slate-200 px-4 py-3"><p className="text-xs text-slate-500 uppercase font-semibold">Pianificati</p><p className="text-2xl font-semibold">{proposta?.totali.pianificati ?? '-'}</p></div>
        <div className="rounded-lg border border-slate-200 px-4 py-3"><p className="text-xs text-slate-500 uppercase font-semibold">Fuori</p><p className="text-2xl font-semibold">{proposta?.totali.non_pianificati ?? '-'}</p></div>
        <div className="rounded-lg border border-slate-200 px-4 py-3"><p className="text-xs text-slate-500 uppercase font-semibold">Viaggio</p><p className="text-2xl font-semibold">{formatHours(manualTravelTotal ?? proposta?.totali.viaggio_stimato_totale)}h</p></div>
      </div>

      {manualRows && proposta ? <div className="mx-8 mt-5 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">Modifica manuale attiva: puoi trascinare gli interventi tra tecnici/giorni e riordinare le tappe della giornata.</div> : null}

      {proposta?.warnings.length ? (
        <div className="mx-8 mt-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 flex items-start gap-2">
          <AlertTriangle size={17} className="mt-0.5" />
          <div><p className="font-semibold">Warning algoritmo</p>{proposta.warnings.slice(0, 3).map((w, i) => <p key={i}>{w.messaggio}</p>)}</div>
        </div>
      ) : null}

      <div className="p-8">
        {isLoading ? <p className="text-slate-400">Caricamento pianificatore...</p> : rows.length === 0 ? (
          <div className="border border-dashed border-slate-300 rounded-xl p-10 text-center">
            <p className="font-medium text-slate-700">Nessun tecnico configurato</p>
            <p className="text-sm text-slate-400 mt-1">Crea un tecnico nella sezione Tecnici: comparirà automaticamente qui.</p>
          </div>
        ) : (
          <div className="overflow-hidden border border-slate-200 rounded-xl">
            <table className="w-full table-fixed">
              <thead className="bg-slate-50 border-b border-slate-200"><tr><th className="text-left px-4 py-3 text-xs uppercase text-slate-500 font-semibold w-[18%]">Tecnico</th>{days.map(day => <th key={day} className="text-left px-4 py-3 text-xs uppercase text-slate-500 font-semibold">{formatDay(day)}</th>)}</tr></thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((row: any) => (
                  <tr key={row.tecnico.id}>
                    <td className="px-4 py-4 align-top bg-white">
                      <p className="font-semibold text-slate-900">{row.tecnico.nome} {row.tecnico.cognome}</p>
                      <p className="text-xs text-slate-400 mt-1">{row.tecnico.codice_tecnico} · CAP {row.tecnico.cap_partenza || '-'}</p>
                      <p className="text-xs text-slate-500 mt-2">Zona: {row.tecnico.zona_preferita || '-'}</p>
                      {row.vincoli_attivi > 0 && <p className="text-xs text-amber-700 mt-2 flex items-center gap-1"><ShieldAlert size={13} /> {row.vincoli_attivi} vincoli</p>}
                    </td>
                    {row.days.map((cell: any) => {
                      const timedItems = planTimes(cell.interventi ?? [])
                      return (
                        <td key={cell.date} className="px-3 py-3 align-top bg-white">
                          <div
                            onDragOver={event => event.preventDefault()}
                            onDrop={event => handleDrop(event, { tecnicoId: row.tecnico.id, date: cell.date })}
                            className={`min-h-44 rounded-lg border px-3 py-3 ${isProposal ? 'border-blue-100 bg-blue-50/20' : cell.disponibile ? 'border-slate-200 bg-slate-50/50' : 'border-red-200 bg-red-50'}`}
                          >
                            {isProposal ? (
                              <>
                                <div className="flex items-start justify-between gap-2 mb-2">
                                  <div>
                                    <p className="text-xs font-semibold text-slate-500 uppercase">{cell.zona_dominante || 'Senza zona'}</p>
                                    <button onClick={() => setRouteModal({ row, cell })} className="mt-1 inline-flex items-center gap-1 text-[11px] font-medium text-blue-700 hover:text-blue-900"><Map size={12} /> Tragitto</button>
                                  </div>
                                  <div className="text-right"><p className="text-xs text-slate-500">{cell.ore_residue}h libere</p><p className="text-[11px] text-slate-400">viaggio {formatHours(cell.viaggio_totale)}h</p></div>
                                </div>
                                <div className="space-y-2">
                                  {timedItems.length ? timedItems.map((entry, index) => (
                                    <InterventionCard
                                      key={entry.item.id}
                                      item={entry.item}
                                      time={entry}
                                      dragPayload={{ tecnicoId: row.tecnico.id, date: cell.date, index }}
                                      onDropBefore={event => setManualRows(current => moveItem(current ?? proposta?.rows ?? [], JSON.parse(event.dataTransfer.getData('application/json') || '{}'), { tecnicoId: row.tecnico.id, date: cell.date, insertIndex: index }))}
                                    />
                                  )) : <p className="text-xs text-slate-400">Trascina qui un intervento</p>}
                                </div>
                              </>
                            ) : cell.disponibile ? <><p className="text-xs font-semibold text-slate-500 uppercase">Disponibile</p><p className="text-sm text-slate-900 mt-1">{cell.ore_disponibili}h libere</p><p className="text-xs text-slate-400 mt-2">Premi “Genera proposta”</p></> : <><p className="text-xs font-semibold text-red-700 uppercase">Non disponibile</p>{cell.indisponibilita.map((i: any, idx: number) => <p key={idx} className="text-sm text-red-700 mt-1">{i.tipo} {i.note ? `- ${i.note}` : ''}</p>)}</>}
                          </div>
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {proposta?.non_pianificati.length ? (
          <section className="mt-8 border border-red-200 rounded-xl overflow-hidden">
            <div className="bg-red-50 px-4 py-3 border-b border-red-100"><h2 className="font-semibold text-red-800">Interventi non pianificabili</h2></div>
            <div className="divide-y divide-red-100">
              {proposta.non_pianificati.map(i => <div key={i.id} className="px-4 py-3"><p className="font-medium text-slate-900">{i.codice_intervento} · {i.titolo}</p><p className="text-sm text-red-700 mt-1">{i.motivo}</p></div>)}
            </div>
          </section>
        ) : null}
      </div>
    </div>
  )
}


