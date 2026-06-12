import { useMemo, useState, type DragEvent, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { AlertTriangle, CalendarDays, ChevronLeft, ChevronRight, ExternalLink, GripVertical, Map, Plus, Sparkles, ShieldAlert, X } from 'lucide-react'
import { clientiApi, type Cliente } from '../api/clienti'
import { interventiApi, type Intervento, type PrioritaIntervento } from '../api/interventi'
import { pianificatoreApi, type PlannerProposta, type PropostaCell, type PropostaIntervento, type PropostaRow } from '../api/pianificatore'

const PLANNER_STORAGE_PREFIX = 'techdispatch:pianificatore:'

function storageKey(start: string) {
  return PLANNER_STORAGE_PREFIX + start
}

function readStoredPlan(start: string): PlannerProposta | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(storageKey(start))
    return raw ? JSON.parse(raw) as PlannerProposta : null
  } catch {
    return null
  }
}

function writeStoredPlan(plan: PlannerProposta) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(storageKey(plan.start), JSON.stringify(plan))
}

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

function minutesFromTime(time: string) {
  const [h, m] = time.split(':').map(Number)
  return h * 60 + m
}

function normalizzaCap(value?: string) {
  return String(value || '').replace(/\D/g, '').slice(0, 5)
}

function normalizzaZona(value?: string) {
  return String(value || '').trim().toUpperCase()
}

function zonaFrom(cap?: string, citta?: string) {
  if (citta) return normalizzaZona(citta)
  const normalized = normalizzaCap(cap)
  return normalized ? normalized.slice(0, 2) : 'SENZA_ZONA'
}

function stimaViaggioOre(origine: { cap?: string; zona?: string }, destinazione: { cap?: string; zona?: string }) {
  const fromCap = normalizzaCap(origine.cap)
  const toCap = normalizzaCap(destinazione.cap)
  const fromZona = normalizzaZona(origine.zona)
  const toZona = normalizzaZona(destinazione.zona)
  if (!fromCap && !toCap && !fromZona && !toZona) return 0.25
  if (fromCap && toCap && fromCap === toCap) return 0.15
  if (fromZona && toZona && fromZona === toZona) return 0.33
  if (fromCap && toCap && fromCap.slice(0, 2) === toCap.slice(0, 2)) return 0.5
  if (fromZona && toZona && fromZona !== toZona) return 0.75
  return 0.5
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

function lastLocation(row: PropostaRow, cell: PropostaCell) {
  const last = cell.interventi[cell.interventi.length - 1]
  if (last) return { cap: last.cap, zona: last.zona }
  return { cap: row.tecnico.cap_partenza, zona: row.tecnico.zona_preferita }
}

function buildEmptyProposal(start: string, days: string[], overviewRows: any[]): PlannerProposta {
  return {
    start,
    days,
    rows: overviewRows.map(row => ({
      tecnico: row.tecnico,
      days: row.days.map((cell: any) => ({
        date: cell.date,
        zona_dominante: null,
        ore_residue: cell.disponibile ? Number(cell.ore_disponibili ?? 8) : 0,
        viaggio_totale: 0,
        interventi: [],
      })),
    })),
    non_pianificati: [],
    warnings: [],
    totali: { interventi_pool: 0, pianificati: 0, non_pianificati: 0, warnings: 0, viaggio_stimato_totale: 0 },
  }
}

function chooseBestPlacement(rows: PropostaRow[], destinazione: { cap?: string; zona?: string }, durata: number) {
  const candidates: Array<{ row: PropostaRow; cell: PropostaCell; viaggio: number; score: number }> = []
  rows.forEach((row, rowIndex) => {
    row.days.forEach((cell, dayIndex) => {
      const viaggio = stimaViaggioOre(lastLocation(row, cell), destinazione)
      const totale = durata + viaggio
      if (cell.ore_residue < totale) return
      const times = planTimes(cell.interventi)
      const finish = times.length ? minutesFromTime(times[times.length - 1].workEnd) : 480
      const score = viaggio * 20 + Math.max(0, finish - 480) / 60 + dayIndex * 3 - cell.ore_residue / 20 + rowIndex / 100
      candidates.push({ row, cell, viaggio, score })
    })
  })
  candidates.sort((a, b) => a.score - b.score)
  return candidates[0] ?? null
}

function insertIntervento(rows: PropostaRow[], tecnicoId: string, date: string, item: PropostaIntervento) {
  return rows.map(row => ({
    ...row,
    days: row.days.map(cell => {
      if (row.tecnico.id !== tecnicoId || cell.date !== date) return cell
      const nextCell = { ...cell, interventi: [...cell.interventi, item] }
      return recalcCell(nextCell, item.tempo_totale ?? item.durata_stimata, 'add')
    }),
  }))
}

function propostaFromIntervento(intervento: Intervento, durata: number, viaggio: number): PropostaIntervento {
  const zona = zonaFrom(intervento.cap, intervento.citta)
  return {
    id: intervento.id,
    codice_intervento: intervento.codice_intervento,
    titolo: intervento.titolo,
    cliente_nome: intervento.cliente_nome,
    cliente_id: intervento.cliente_id,
    priorita: intervento.priorita,
    origine: intervento.origine,
    zona,
    cap: intervento.cap,
    durata_stimata: durata,
    viaggio_stimato: Number(viaggio.toFixed(2)),
    tempo_totale: Number((durata + viaggio).toFixed(2)),
    motivazione: 'Creato dal pianificatore',
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
type NewInterventoForm = { titolo: string; descrizione: string; cliente_id: string; priorita: PrioritaIntervento; durata_stimata: number }
type NewInterventoModal = { form: NewInterventoForm; errore?: string } | null

function InterventionCodeLink({ item }: { item: PropostaIntervento }) {
  return (
    <Link
      to={`/interventi/${item.id}`}
      onClick={event => event.stopPropagation()}
      className="inline-flex items-center gap-1 text-[11px] font-mono font-semibold text-blue-700 hover:text-blue-900 underline decoration-blue-200 underline-offset-2"
    >
      {item.codice_intervento || item.id}
      <ExternalLink size={10} />
    </Link>
  )
}

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
      <div className="mt-1"><InterventionCodeLink item={item} /></div>
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
                    <div className="flex items-center gap-2"><p className="font-semibold text-slate-900 truncate">{step.item.cliente_nome || step.item.titolo}</p><InterventionCodeLink item={step.item} /></div>
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

function NewInterventoPanel({ modal, clienti, loading, onClose, onChange, onSubmit }: { modal: NewInterventoModal; clienti: Cliente[]; loading: boolean; onClose: () => void; onChange: (form: NewInterventoForm) => void; onSubmit: (event: FormEvent) => void }) {
  if (!modal) return null
  return (
    <div className="fixed inset-0 z-50 bg-slate-900/30 flex justify-end">
      <aside className="h-full w-full max-w-lg bg-white shadow-2xl border-l border-slate-200 overflow-auto">
        <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase font-semibold text-slate-500">Pianificatore</p>
            <h2 className="text-lg font-semibold text-slate-900">Nuovo intervento</h2>
            <p className="text-sm text-slate-500">Assegnazione automatica al tecnico piu adatto della settimana.</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-slate-100"><X size={18} /></button>
        </div>
        <form onSubmit={onSubmit} className="px-6 py-5 space-y-4">
          {modal.errore && <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{modal.errore}</div>}
          <label className="block"><span className="text-xs uppercase font-semibold text-slate-500">Titolo</span><input value={modal.form.titolo} onChange={e => onChange({ ...modal.form, titolo: e.target.value })} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20" required /></label>
          <label className="block"><span className="text-xs uppercase font-semibold text-slate-500">Cliente</span><select value={modal.form.cliente_id} onChange={e => onChange({ ...modal.form, cliente_id: e.target.value })} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"><option value="">Cliente non indicato</option>{clienti.map(c => <option key={c.id} value={c.id}>{c.ragione_sociale}</option>)}</select></label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block"><span className="text-xs uppercase font-semibold text-slate-500">Priorita</span><select value={modal.form.priorita} onChange={e => onChange({ ...modal.form, priorita: e.target.value as PrioritaIntervento })} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm bg-white"><option value="BASSA">Bassa</option><option value="MEDIA">Media</option><option value="ALTA">Alta</option><option value="URGENTE">Urgente</option></select></label>
            <label className="block"><span className="text-xs uppercase font-semibold text-slate-500">Durata ore</span><input type="number" min="0.25" step="0.25" value={modal.form.durata_stimata} onChange={e => onChange({ ...modal.form, durata_stimata: Number(e.target.value) })} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" /></label>
          </div>
          <label className="block"><span className="text-xs uppercase font-semibold text-slate-500">Descrizione</span><textarea value={modal.form.descrizione} onChange={e => onChange({ ...modal.form, descrizione: e.target.value })} rows={5} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm resize-none" /></label>
          <button disabled={loading} className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 text-white px-4 py-2.5 text-sm font-semibold hover:bg-blue-700 disabled:opacity-50"><Plus size={16} />{loading ? 'Creo e assegno...' : 'Crea e assegna automaticamente'}</button>
        </form>
      </aside>
    </div>
  )
}

export default function Pianificatore() {
  const [start, setStart] = useState(isoMonday())
  const [savedProposal, setSavedProposal] = useState<PlannerProposta | null>(() => readStoredPlan(isoMonday()))
  const [manualRows, setManualRows] = useState<PropostaRow[] | null>(null)
  const [routeModal, setRouteModal] = useState<RouteModal>(null)
  const [newModal, setNewModal] = useState<NewInterventoModal>(null)
  const qc = useQueryClient()
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['pianificatore', start],
    queryFn: () => pianificatoreApi.overview(start),
  })
  const { data: clienti = [] } = useQuery({ queryKey: ['clienti'], queryFn: () => clientiApi.list() })

  const propostaMutation = useMutation({
    mutationFn: () => pianificatoreApi.genera(start),
    onSuccess: proposta => {
      setSavedProposal(proposta)
      setManualRows(proposta.rows)
      writeStoredPlan(proposta)
    },
  })
  const createInterventoMutation = useMutation({ mutationFn: interventiApi.create })
  const proposta = propostaMutation.data
  const activeProposal = proposta ?? savedProposal
  const baseRows = activeProposal?.rows ?? (data ? buildEmptyProposal(start, data.days, data.rows).rows : [])
  const rows = manualRows ?? activeProposal?.rows ?? data?.rows ?? []
  const days = activeProposal?.days ?? data?.days ?? []
  const isProposal = Boolean(activeProposal) || Boolean(manualRows)
  const indisponibili = useMemo(() => (data?.rows ?? []).reduce((sum, r) => sum + r.days.filter(d => !d.disponibile).length, 0), [data])
  const manualTravelTotal = useMemo(() => manualRows?.reduce((sum, row) => sum + row.days.reduce((daySum, cell) => daySum + (cell.viaggio_totale ?? 0), 0), 0), [manualRows])

  function resetWeek(nextStart: string) {
    setStart(nextStart)
    setSavedProposal(readStoredPlan(nextStart))
    setManualRows(null)
    setRouteModal(null)
    propostaMutation.reset()
  }

  function persistRows(nextRows: PropostaRow[]) {
    const baseProposal = activeProposal ?? buildEmptyProposal(start, days, data?.rows ?? [])
    const viaggioStimatoTotale = Number(nextRows.reduce((sum, row) => sum + row.days.reduce((daySum, cell) => daySum + (cell.viaggio_totale ?? 0), 0), 0).toFixed(2))
    const pianificati = nextRows.reduce((sum, row) => sum + row.days.reduce((daySum, cell) => daySum + cell.interventi.length, 0), 0)
    const nextProposal = { ...baseProposal, rows: nextRows, totali: { ...baseProposal.totali, pianificati, interventi_pool: Math.max(baseProposal.totali.interventi_pool, pianificati), viaggio_stimato_totale: viaggioStimatoTotale } }
    setSavedProposal(nextProposal)
    writeStoredPlan(nextProposal)
  }

  function handleDrop(event: DragEvent<HTMLElement>, target: { tecnicoId: string; date: string; insertIndex?: number }) {
    event.preventDefault()
    if (!isProposal) return
    try {
      const drag = JSON.parse(event.dataTransfer.getData('application/json')) as DragPayload
      if (drag.tecnicoId === target.tecnicoId && drag.date === target.date && drag.index === target.insertIndex) return
      setManualRows(current => {
        const nextRows = moveItem(current ?? activeProposal?.rows ?? [], drag, target)
        persistRows(nextRows)
        return nextRows
      })
    } catch {
      // drag esterno non valido
    }
  }

  async function handleCreateIntervento(event: FormEvent) {
    event.preventDefault()
    if (!newModal) return
    const form = newModal.form
    const cliente = clienti.find(c => c.id === form.cliente_id)
    const sede = cliente?.sede_legale
    const destinazione = { cap: sede?.cap, zona: zonaFrom(sede?.cap, sede?.citta) }
    const proposalRows = rows.length ? rows as PropostaRow[] : baseRows
    const placement = chooseBestPlacement(proposalRows, destinazione, form.durata_stimata)
    if (!placement) {
      setNewModal({ ...newModal, errore: 'Nessun tecnico ha abbastanza spazio nella settimana selezionata.' })
      return
    }
    const tecnicoNome = ((placement.row.tecnico.nome || '') + ' ' + (placement.row.tecnico.cognome || '')).trim()
    const created = await createInterventoMutation.mutateAsync({
      titolo: form.titolo,
      descrizione: form.descrizione || undefined,
      origine: 'MANUALE',
      stato: 'PIANIFICATO',
      priorita: form.priorita,
      durata_stimata: form.durata_stimata,
      cliente_id: cliente?.id,
      cliente_codice: cliente?.codice_cliente,
      cliente_nome: cliente?.ragione_sociale,
      tecnico_id: placement.row.tecnico.id,
      tecnico_nome: tecnicoNome,
      indirizzo: sede?.indirizzo,
      cap: sede?.cap,
      citta: sede?.citta,
      provincia: sede?.provincia,
      data_pianificata: placement.cell.date + 'T08:00:00.000Z',
    })
    const item = propostaFromIntervento(created, form.durata_stimata, placement.viaggio)
    const nextRows = insertIntervento(proposalRows, placement.row.tecnico.id, placement.cell.date, item)
    setManualRows(nextRows)
    persistRows(nextRows)
    setNewModal(null)
    qc.invalidateQueries({ queryKey: ['interventi'] })
  }

  return (
    <div className="h-full overflow-auto bg-white">
      <RouteViewer route={routeModal} onClose={() => setRouteModal(null)} />
      <NewInterventoPanel modal={newModal} clienti={clienti} loading={createInterventoMutation.isPending} onClose={() => setNewModal(null)} onChange={form => setNewModal(current => current ? { ...current, form, errore: undefined } : null)} onSubmit={handleCreateIntervento} />
      <div className="border-b border-slate-200 px-8 py-5 flex items-center justify-between gap-6">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Pianificatore</h1>
          <p className="text-sm text-slate-500 mt-1">Generato da tecnici, ferie/non disponibilità, vincoli e interventi da pianificare.</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => resetWeek(addDays(start, -7))} className="p-2 border border-slate-200 rounded-lg hover:bg-slate-50"><ChevronLeft size={17} /></button>
          <div className="flex items-center gap-2 border border-slate-200 rounded-lg px-3 py-2 text-sm font-medium"><CalendarDays size={16} />Settimana {start}</div>
          <button onClick={() => resetWeek(addDays(start, 7))} className="p-2 border border-slate-200 rounded-lg hover:bg-slate-50"><ChevronRight size={17} /></button>
          <button onClick={() => { setManualRows(null); setRouteModal(null); setSavedProposal(readStoredPlan(start)); propostaMutation.reset(); refetch() }} className="ml-2 px-3 py-2 rounded-lg border border-slate-200 text-slate-700 text-sm font-medium hover:bg-slate-50">Aggiorna</button>
          <button onClick={() => setNewModal({ form: { titolo: '', descrizione: '', cliente_id: '', priorita: 'MEDIA', durata_stimata: 1.5 } })} className="px-3 py-2 rounded-lg border border-blue-200 text-blue-700 text-sm font-medium hover:bg-blue-50 flex items-center gap-2"><Plus size={15} /> Nuovo intervento</button>
          <button onClick={() => propostaMutation.mutate()} disabled={propostaMutation.isPending} className="px-3 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2">
            <Sparkles size={15} /> {propostaMutation.isPending ? 'Genero...' : 'Genera proposta'}
          </button>
        </div>
      </div>

      <div className="px-8 py-4 grid grid-cols-3 lg:grid-cols-6 gap-4 border-b border-slate-100">
        <div className="rounded-lg border border-slate-200 px-4 py-3"><p className="text-xs text-slate-500 uppercase font-semibold">Tecnici</p><p className="text-2xl font-semibold">{data?.rows.length ?? 0}</p></div>
        <div className="rounded-lg border border-slate-200 px-4 py-3"><p className="text-xs text-slate-500 uppercase font-semibold">Vincoli</p><p className="text-2xl font-semibold">{data?.vincoli_totali ?? 0}</p></div>
        <div className="rounded-lg border border-slate-200 px-4 py-3"><p className="text-xs text-slate-500 uppercase font-semibold">Blocchi</p><p className="text-2xl font-semibold">{indisponibili}</p></div>
        <div className="rounded-lg border border-slate-200 px-4 py-3"><p className="text-xs text-slate-500 uppercase font-semibold">Pianificati</p><p className="text-2xl font-semibold">{activeProposal?.totali.pianificati ?? '-'}</p></div>
        <div className="rounded-lg border border-slate-200 px-4 py-3"><p className="text-xs text-slate-500 uppercase font-semibold">Fuori</p><p className="text-2xl font-semibold">{activeProposal?.totali.non_pianificati ?? '-'}</p></div>
        <div className="rounded-lg border border-slate-200 px-4 py-3"><p className="text-xs text-slate-500 uppercase font-semibold">Viaggio</p><p className="text-2xl font-semibold">{formatHours(manualTravelTotal ?? activeProposal?.totali.viaggio_stimato_totale)}h</p></div>
      </div>

      {activeProposal ? <div className="mx-8 mt-5 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">Modifica manuale attiva: puoi trascinare gli interventi tra tecnici/giorni e riordinare le tappe della giornata.</div> : null}

      {activeProposal?.warnings.length ? (
        <div className="mx-8 mt-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 flex items-start gap-2">
          <AlertTriangle size={17} className="mt-0.5" />
          <div><p className="font-semibold">Warning algoritmo</p>{activeProposal.warnings.slice(0, 3).map((w, i) => <p key={i}>{w.messaggio}</p>)}</div>
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
                                      onDropBefore={event => setManualRows(current => {
                                        const nextRows = moveItem(current ?? activeProposal?.rows ?? [], JSON.parse(event.dataTransfer.getData('application/json') || '{}'), { tecnicoId: row.tecnico.id, date: cell.date, insertIndex: index })
                                        persistRows(nextRows)
                                        return nextRows
                                      })}
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

        {activeProposal?.non_pianificati.length ? (
          <section className="mt-8 border border-red-200 rounded-xl overflow-hidden">
            <div className="bg-red-50 px-4 py-3 border-b border-red-100"><h2 className="font-semibold text-red-800">Interventi non pianificabili</h2></div>
            <div className="divide-y divide-red-100">
              {activeProposal.non_pianificati.map(i => <div key={i.id} className="px-4 py-3"><p className="font-medium text-slate-900">{i.codice_intervento} · {i.titolo}</p><p className="text-sm text-red-700 mt-1">{i.motivo}</p></div>)}
            </div>
          </section>
        ) : null}
      </div>
    </div>
  )
}


