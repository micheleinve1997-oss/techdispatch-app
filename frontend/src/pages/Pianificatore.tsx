import { useMemo, useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { AlertTriangle, CalendarDays, ChevronLeft, ChevronRight, Sparkles, ShieldAlert } from 'lucide-react'
import { pianificatoreApi, type PropostaIntervento } from '../api/pianificatore'

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

const priorityClass: Record<string, string> = {
  URGENTE: 'bg-red-50 text-red-700 border-red-200',
  ALTA: 'bg-amber-50 text-amber-700 border-amber-200',
  MEDIA: 'bg-blue-50 text-blue-700 border-blue-200',
  BASSA: 'bg-slate-50 text-slate-600 border-slate-200',
}

function InterventionCard({ item }: { item: PropostaIntervento }) {
  return (
    <div className={`rounded-lg border px-3 py-2 ${priorityClass[item.priorita ?? 'MEDIA'] ?? priorityClass.MEDIA}`}>
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-semibold truncate">{item.titolo}</p>
        <span className="text-[10px] font-mono shrink-0">tot {item.tempo_totale ?? item.durata_stimata}h</span>
      </div>
      <p className="text-[11px] mt-1 opacity-80 truncate">{item.cliente_nome || 'Cliente non indicato'}</p>
      <p className="text-[11px] mt-1 opacity-70">Zona {item.zona}</p>
      <p className="text-[11px] mt-1 opacity-70">Lavoro {item.durata_stimata}h · Viaggio {item.viaggio_stimato ?? 0}h</p>
    </div>
  )
}

export default function Pianificatore() {
  const [start, setStart] = useState(isoMonday())
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['pianificatore', start],
    queryFn: () => pianificatoreApi.overview(start),
  })

  const propostaMutation = useMutation({ mutationFn: () => pianificatoreApi.genera(start) })
  const proposta = propostaMutation.data
  const rows = proposta?.rows ?? data?.rows ?? []
  const days = proposta?.days ?? data?.days ?? []
  const isProposal = Boolean(proposta)
  const indisponibili = useMemo(() => (data?.rows ?? []).reduce((sum, r) => sum + r.days.filter(d => !d.disponibile).length, 0), [data])

  return (
    <div className="h-full overflow-auto bg-white">
      <div className="border-b border-slate-200 px-8 py-5 flex items-center justify-between gap-6">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Pianificatore</h1>
          <p className="text-sm text-slate-500 mt-1">Generato da tecnici, ferie/non disponibilità, vincoli e interventi da pianificare.</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => { setStart(addDays(start, -7)); propostaMutation.reset() }} className="p-2 border border-slate-200 rounded-lg hover:bg-slate-50"><ChevronLeft size={17} /></button>
          <div className="flex items-center gap-2 border border-slate-200 rounded-lg px-3 py-2 text-sm font-medium"><CalendarDays size={16} />Settimana {start}</div>
          <button onClick={() => { setStart(addDays(start, 7)); propostaMutation.reset() }} className="p-2 border border-slate-200 rounded-lg hover:bg-slate-50"><ChevronRight size={17} /></button>
          <button onClick={() => { propostaMutation.reset(); refetch() }} className="ml-2 px-3 py-2 rounded-lg border border-slate-200 text-slate-700 text-sm font-medium hover:bg-slate-50">Aggiorna</button>
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
        <div className="rounded-lg border border-slate-200 px-4 py-3"><p className="text-xs text-slate-500 uppercase font-semibold">Viaggio</p><p className="text-2xl font-semibold">{proposta?.totali.viaggio_stimato_totale ?? '-'}h</p></div>
      </div>

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
                    {row.days.map((cell: any) => (
                      <td key={cell.date} className="px-3 py-3 align-top bg-white">
                        <div className={`min-h-36 rounded-lg border px-3 py-3 ${isProposal ? 'border-blue-100 bg-blue-50/20' : cell.disponibile ? 'border-slate-200 bg-slate-50/50' : 'border-red-200 bg-red-50'}`}>
                          {isProposal ? (
                            <>
                              <div className="flex items-start justify-between gap-2 mb-2"><p className="text-xs font-semibold text-slate-500 uppercase">{cell.zona_dominante || 'Senza zona'}</p><div className="text-right"><p className="text-xs text-slate-500">{cell.ore_residue}h libere</p><p className="text-[11px] text-slate-400">viaggio {cell.viaggio_totale ?? 0}h</p></div></div>
                              <div className="space-y-2">{cell.interventi.length ? cell.interventi.map((i: PropostaIntervento) => <InterventionCard key={i.id} item={i} />) : <p className="text-xs text-slate-400">Nessun intervento proposto</p>}</div>
                            </>
                          ) : cell.disponibile ? <><p className="text-xs font-semibold text-slate-500 uppercase">Disponibile</p><p className="text-sm text-slate-900 mt-1">{cell.ore_disponibili}h libere</p><p className="text-xs text-slate-400 mt-2">Premi “Genera proposta”</p></> : <><p className="text-xs font-semibold text-red-700 uppercase">Non disponibile</p>{cell.indisponibilita.map((i: any, idx: number) => <p key={idx} className="text-sm text-red-700 mt-1">{i.tipo} {i.note ? `- ${i.note}` : ''}</p>)}</>}
                        </div>
                      </td>
                    ))}
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


