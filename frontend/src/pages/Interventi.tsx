import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { CalendarClock, ClipboardList, FileCheck2, FileText, List, Map, Search, ShieldAlert, Ticket, Upload, Wrench } from 'lucide-react'
import { interventiApi, type Intervento, type OrigineIntervento, type PrioritaIntervento, type StatoIntervento } from '../api/interventi'
import { tecniciApi } from '../api/tecnici'
import MappaInterventi from '../components/MappaInterventi'

const STATO_LABEL: Record<StatoIntervento, string> = {
  APERTO: 'Aperto',
  DA_PIANIFICARE: 'Da pianificare',
  PIANIFICATO: 'Pianificato',
  IN_CORSO: 'In corso',
  COMPLETATO: 'Completato',
  ANNULLATO: 'Annullato',
}

const ORIGINE_LABEL: Record<OrigineIntervento, string> = {
  TICKET: 'Ticket',
  MANUTENZIONE: 'Manutenzione',
  PREVENTIVO_ACCETTATO: 'Preventivo accettato',
  MANUALE: 'Manuale',
}

const PRIORITA_CFG: Record<PrioritaIntervento, { label: string; cls: string }> = {
  BASSA: { label: 'Bassa', cls: 'bg-slate-100 text-slate-600' },
  MEDIA: { label: 'Media', cls: 'bg-blue-50 text-blue-700' },
  ALTA: { label: 'Alta', cls: 'bg-amber-50 text-amber-700' },
  URGENTE: { label: 'Urgente', cls: 'bg-red-50 text-red-700' },
}

const STATO_CFG: Record<StatoIntervento, string> = {
  APERTO: 'bg-sky-50 text-sky-700',
  DA_PIANIFICARE: 'bg-amber-50 text-amber-700',
  PIANIFICATO: 'bg-indigo-50 text-indigo-700',
  IN_CORSO: 'bg-violet-50 text-violet-700',
  COMPLETATO: 'bg-emerald-50 text-emerald-700',
  ANNULLATO: 'bg-slate-100 text-slate-500',
}

const origineIcon = {
  TICKET: Ticket,
  MANUTENZIONE: Wrench,
  PREVENTIVO_ACCETTATO: FileCheck2,
  MANUALE: FileText,
}

type FiltroOrigine = 'TUTTI' | OrigineIntervento
type FiltroStato = 'TUTTI' | StatoIntervento
type Tab = 'lista' | 'mappa'

function formatDate(value?: string) {
  if (!value) return 'Non pianificato'
  return new Intl.DateTimeFormat('it-IT', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(value))
}

function matchesSearch(intervento: Intervento, search: string) {
  const q = search.trim().toLowerCase()
  if (!q) return true
  return [
    intervento.codice_intervento,
    intervento.titolo,
    intervento.cliente_nome,
    intervento.cliente_codice,
    intervento.tecnico_nome,
    intervento.citta,
    intervento.riferimento_esterno,
  ].filter(Boolean).some(value => String(value).toLowerCase().includes(q))
}

export default function Interventi() {
  const [search, setSearch] = useState('')
  const [origine, setOrigine] = useState<FiltroOrigine>('TUTTI')
  const [stato, setStato] = useState<FiltroStato>('TUTTI')
  const [tab, setTab] = useState<Tab>('lista')
  const navigate = useNavigate()

  const { data: interventi = [], isLoading } = useQuery({
    queryKey: ['interventi'],
    queryFn: () => interventiApi.list(),
  })

  const { data: tecnici = [] } = useQuery({
    queryKey: ['tecnici'],
    queryFn: tecniciApi.list,
  })

  const filtered = useMemo(() => interventi.filter(i =>
    (origine === 'TUTTI' || i.origine === origine) &&
    (stato === 'TUTTI' || i.stato === stato) &&
    matchesSearch(i, search)
  ), [interventi, origine, stato, search])

  const daPianificare = interventi.filter(i => i.stato === 'APERTO' || i.stato === 'DA_PIANIFICARE').length
  const pianificati = interventi.filter(i => i.stato === 'PIANIFICATO' || i.stato === 'IN_CORSO').length
  const urgenti = interventi.filter(i => i.priorita === 'URGENTE' || i.priorita === 'ALTA').length

  return (
    <div className="flex flex-col h-full">
      <div className="px-8 py-6 border-b border-slate-200 bg-white">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold text-slate-900">Interventi</h1>
            <p className="text-sm text-slate-500 mt-0.5">
              Ticket, manutenzioni e preventivi accettati in un unico flusso operativo
            </p>
          </div>
          <button
            onClick={() => navigate('/interventi-import')}
            className="flex items-center gap-2 border border-slate-200 hover:bg-slate-50 text-slate-700 text-sm font-medium px-4 py-2.5 rounded-lg transition-colors"
          >
            <Upload size={16} />
            Importa
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-5">
          <div className="border border-slate-200 rounded-lg px-4 py-3 bg-slate-50">
            <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
              <ClipboardList size={14} />
              Da gestire
            </div>
            <p className="text-2xl font-semibold text-slate-900 mt-1">{daPianificare}</p>
          </div>
          <div className="border border-slate-200 rounded-lg px-4 py-3 bg-slate-50">
            <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
              <CalendarClock size={14} />
              Pianificati / in corso
            </div>
            <p className="text-2xl font-semibold text-slate-900 mt-1">{pianificati}</p>
          </div>
          <div className="border border-slate-200 rounded-lg px-4 py-3 bg-slate-50">
            <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
              <ShieldAlert size={14} />
              Alta priorita
            </div>
            <p className="text-2xl font-semibold text-slate-900 mt-1">{urgenti}</p>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-64 max-w-sm">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Cerca intervento, cliente, tecnico..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition"
            />
          </div>

          <select
            value={origine}
            onChange={e => setOrigine(e.target.value as FiltroOrigine)}
            className="h-9 px-3 text-sm border border-slate-200 rounded-lg bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          >
            <option value="TUTTI">Tutte le origini</option>
            {Object.entries(ORIGINE_LABEL).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>

          <select
            value={stato}
            onChange={e => setStato(e.target.value as FiltroStato)}
            className="h-9 px-3 text-sm border border-slate-200 rounded-lg bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          >
            <option value="TUTTI">Tutti gli stati</option>
            {Object.entries(STATO_LABEL).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>

          <div className="flex items-center bg-slate-100 rounded-lg p-1 gap-0.5">
            <button
              onClick={() => setTab('lista')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                tab === 'lista'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <List size={14} />
              Lista
            </button>
            <button
              onClick={() => setTab('mappa')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                tab === 'mappa'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <Map size={14} />
              Mappa
            </button>
          </div>
        </div>
      </div>

      {tab === 'lista' && (
        <div className="flex-1 overflow-auto">
          {isLoading ? (
            <div className="divide-y divide-slate-100">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="px-8 py-5 animate-pulse">
                  <div className="h-4 bg-slate-200 rounded w-64" />
                  <div className="h-3 bg-slate-100 rounded w-96 mt-3" />
                </div>
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <ClipboardList size={42} className="text-slate-300 mb-3" />
              <p className="text-slate-500 font-medium">Nessun intervento trovato</p>
              <p className="text-slate-400 text-sm mt-1">
                Qui finiranno ticket aperti, manutenzioni importate e preventivi accettati.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {filtered.map(intervento => {
                const Icon = origineIcon[intervento.origine]
                return (
                  <div key={intervento.id} onClick={() => navigate(`/interventi/${intervento.id}`)} className="px-8 py-4 hover:bg-slate-50 transition-colors cursor-pointer">
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                        <Icon size={18} />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-semibold text-slate-900 truncate">{intervento.titolo}</p>
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATO_CFG[intervento.stato]}`}>
                            {STATO_LABEL[intervento.stato]}
                          </span>
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${PRIORITA_CFG[intervento.priorita].cls}`}>
                            {PRIORITA_CFG[intervento.priorita].label}
                          </span>
                        </div>

                        <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
                          <span className="font-mono text-blue-700 underline decoration-blue-200 underline-offset-2">{intervento.codice_intervento}</span>
                          <span>{ORIGINE_LABEL[intervento.origine]}</span>
                          {intervento.cliente_nome && <span>Cliente: {intervento.cliente_nome}</span>}
                          {intervento.tecnico_nome && <span>Tecnico: {intervento.tecnico_nome}</span>}
                          {intervento.citta && <span>{intervento.citta}{intervento.provincia ? ` (${intervento.provincia})` : ''}</span>}
                        </div>

                        {intervento.descrizione && (
                          <p className="text-sm text-slate-600 mt-2 line-clamp-2">{intervento.descrizione}</p>
                        )}
                      </div>

                      <div className="hidden sm:block text-right shrink-0">
                        <p className="text-xs text-slate-400">Pianificazione</p>
                        <p className="text-sm font-medium text-slate-700 mt-0.5">{formatDate(intervento.data_pianificata)}</p>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      <div className={`flex-1 overflow-hidden ${tab === 'mappa' ? 'flex flex-col' : 'hidden'}`}>
        <MappaInterventi interventi={filtered} tecnici={tecnici} isVisible={tab === 'mappa'} />
      </div>
    </div>
  )
}
