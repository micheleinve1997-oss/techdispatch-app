import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { CalendarDays, ChevronLeft, ChevronRight, ShieldAlert } from 'lucide-react'
import { pianificatoreApi } from '../api/pianificatore'

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

export default function Pianificatore() {
  const [start, setStart] = useState(isoMonday())
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['pianificatore', start],
    queryFn: () => pianificatoreApi.overview(start),
  })

  const rows = data?.rows ?? []
  const days = data?.days ?? []
  const indisponibili = useMemo(() => rows.reduce((sum, r) => sum + r.days.filter(d => !d.disponibile).length, 0), [rows])

  return (
    <div className="h-full overflow-auto bg-white">
      <div className="border-b border-slate-200 px-8 py-5 flex items-center justify-between gap-6">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Pianificatore</h1>
          <p className="text-sm text-slate-500 mt-1">Generato da tecnici, ferie/non disponibilità e vincoli attivi.</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setStart(addDays(start, -7))} className="p-2 border border-slate-200 rounded-lg hover:bg-slate-50"><ChevronLeft size={17} /></button>
          <div className="flex items-center gap-2 border border-slate-200 rounded-lg px-3 py-2 text-sm font-medium"><CalendarDays size={16} />Settimana {start}</div>
          <button onClick={() => setStart(addDays(start, 7))} className="p-2 border border-slate-200 rounded-lg hover:bg-slate-50"><ChevronRight size={17} /></button>
          <button onClick={() => refetch()} className="ml-2 px-3 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium">Aggiorna</button>
        </div>
      </div>

      <div className="px-8 py-4 grid grid-cols-3 gap-4 border-b border-slate-100">
        <div className="rounded-lg border border-slate-200 px-4 py-3"><p className="text-xs text-slate-500 uppercase font-semibold">Tecnici</p><p className="text-2xl font-semibold">{rows.length}</p></div>
        <div className="rounded-lg border border-slate-200 px-4 py-3"><p className="text-xs text-slate-500 uppercase font-semibold">Vincoli attivi</p><p className="text-2xl font-semibold">{data?.vincoli_totali ?? 0}</p></div>
        <div className="rounded-lg border border-slate-200 px-4 py-3"><p className="text-xs text-slate-500 uppercase font-semibold">Giorni bloccati</p><p className="text-2xl font-semibold">{indisponibili}</p></div>
      </div>

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
                {rows.map(row => (
                  <tr key={row.tecnico.id}>
                    <td className="px-4 py-4 align-top bg-white">
                      <p className="font-semibold text-slate-900">{row.tecnico.nome} {row.tecnico.cognome}</p>
                      <p className="text-xs text-slate-400 mt-1">{row.tecnico.codice_tecnico} · CAP {row.tecnico.cap_partenza || '-'}</p>
                      <p className="text-xs text-slate-500 mt-2">Zona: {row.tecnico.zona_preferita || '-'}</p>
                      {row.vincoli_attivi > 0 && <p className="text-xs text-amber-700 mt-2 flex items-center gap-1"><ShieldAlert size={13} /> {row.vincoli_attivi} vincoli</p>}
                    </td>
                    {row.days.map(cell => (
                      <td key={cell.date} className="px-3 py-3 align-top bg-white">
                        <div className={`min-h-28 rounded-lg border px-3 py-3 ${cell.disponibile ? 'border-slate-200 bg-slate-50/50' : 'border-red-200 bg-red-50'}`}>
                          {cell.disponibile ? <><p className="text-xs font-semibold text-slate-500 uppercase">Disponibile</p><p className="text-sm text-slate-900 mt-1">{cell.ore_disponibili}h libere</p><p className="text-xs text-slate-400 mt-2">Ticket pianificati: 0</p></> : <><p className="text-xs font-semibold text-red-700 uppercase">Non disponibile</p>{cell.indisponibilita.map((i, idx) => <p key={idx} className="text-sm text-red-700 mt-1">{i.tipo} {i.note ? `- ${i.note}` : ''}</p>)}</>}
                        </div>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
