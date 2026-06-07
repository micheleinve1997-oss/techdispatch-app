import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  ChevronsLeft, ChevronLeft, ChevronRight, ChevronsRight,
  Search, FilePlus, Save, RotateCcw, Printer, Trash2, Pencil, Database
} from 'lucide-react'
import { clientiApi } from '../api/clienti'
import { tecniciApi } from '../api/tecnici'
import { interventiApi } from '../api/interventi'
import { useToolbar } from '../context/ToolbarContext'

function TBtn({
  onClick, disabled, title, children, variant = 'default'
}: {
  onClick?: () => void
  disabled?: boolean
  title: string
  children: React.ReactNode
  variant?: 'default' | 'danger' | 'primary'
}) {
  const base = 'flex flex-col items-center justify-center gap-0.5 px-3 py-1.5 rounded text-xs font-medium transition disabled:opacity-40 disabled:cursor-not-allowed min-w-[44px] select-none'
  const variants = {
    default: 'text-slate-600 hover:bg-slate-200 hover:text-slate-900',
    danger:  'text-red-600 hover:bg-red-100 hover:text-red-700',
    primary: 'text-blue-600 hover:bg-blue-100 hover:text-blue-700',
  }
  return (
    <button onClick={onClick} disabled={disabled} title={title}
      className={`${base} ${variants[variant]}`}>
      {children}
    </button>
  )
}

function Divider() {
  return <div className="w-px h-8 bg-slate-300 mx-1" />
}

export default function Toolbar() {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const { actions } = useToolbar()
  const [cercaOpen, setCercaOpen] = useState(false)
  const [cercaQ, setCercaQ] = useState('')

  const pathname = window.location.pathname
  const isTecnici = pathname.startsWith('/tecnici')
  const isClienti = pathname.startsWith('/clienti')
  const isInterventi = pathname.startsWith('/interventi')
  const activeSection = isClienti ? 'clienti' : isTecnici ? 'tecnici' : isInterventi ? 'interventi' : null

  // Clienti
  const { data: clienti = [] } = useQuery({
    queryKey: ['clienti'],
    queryFn: () => clientiApi.list(),
    enabled: isClienti,
  })

  // Tecnici
  const { data: tecnici = [] } = useQuery({
    queryKey: ['tecnici'],
    queryFn: tecniciApi.list,
    enabled: isTecnici || isInterventi,
  })

  const { data: interventi = [] } = useQuery({
    queryKey: ['interventi'],
    queryFn: () => interventiApi.list(),
    enabled: isInterventi,
  })

  // Routing corrente
  const clienteMatch = pathname.match(/^\/clienti\/(.+)$/)
  const tecnicoMatch = pathname.match(/^\/tecnici\/(.+)$/)
  const currentClienteId = clienteMatch?.[1]
  const currentTecnicoId = tecnicoMatch?.[1]
  const isNew = currentClienteId === 'nuovo' || currentTecnicoId === 'nuovo'

  const currentIndex = isTecnici
    ? (currentTecnicoId && !isNew ? tecnici.findIndex(t => t.id === currentTecnicoId) : -1)
    : (currentClienteId && !isNew ? clienti.findIndex(c => c.id === currentClienteId) : -1)

  const list = isTecnici ? tecnici : clienti
  const total = list.length
  const hasPrev = currentIndex > 0
  const hasNext = currentIndex < total - 1 && currentIndex !== -1

  const navTo = (idx: number) => {
    if (idx >= 0 && idx < list.length) {
      const item = list[idx]
      navigate(isTecnici ? `/tecnici/${item.id}` : `/clienti/${item.id}`)
    }
  }

  const filtrati = isTecnici
    ? tecnici.filter(t =>
        `${t.nome} ${t.cognome}`.toLowerCase().includes(cercaQ.toLowerCase()) ||
        t.codice_tecnico.toLowerCase().includes(cercaQ.toLowerCase())
      )
    : clienti.filter(c =>
        c.ragione_sociale.toLowerCase().includes(cercaQ.toLowerCase()) ||
        c.codice_cliente.toLowerCase().includes(cercaQ.toLowerCase())
      )

  const clearSection = async () => {
    if (!activeSection) return
    const labels = {
      clienti: 'clienti',
      tecnici: 'tecnici',
      interventi: 'interventi',
    }
    const label = labels[activeSection]
    const typed = window.prompt(`Stai per eliminare definitivamente tutti i dati della sezione ${label}. Scrivi SVUOTA per confermare.`)
    if (typed !== 'SVUOTA') return

    if (activeSection === 'clienti') {
      await clientiApi.clearAll()
      localStorage.removeItem('td_geo_cache')
      qc.invalidateQueries({ queryKey: ['clienti'] })
      navigate('/clienti')
    } else if (activeSection === 'tecnici') {
      await tecniciApi.clearAll()
      localStorage.removeItem('td_geo_tecnici_cache')
      qc.invalidateQueries({ queryKey: ['tecnici'] })
      navigate('/tecnici')
    } else {
      await interventiApi.clearAll()
      localStorage.removeItem('td_geo_interventi_cache')
      qc.invalidateQueries({ queryKey: ['interventi'] })
      navigate('/interventi')
    }
  }

  const clearCount = activeSection === 'clienti'
    ? clienti.length
    : activeSection === 'tecnici'
      ? tecnici.length
      : activeSection === 'interventi'
        ? interventi.length
        : 0
  const newTarget = activeSection === 'clienti'
    ? '/clienti/nuovo'
    : activeSection === 'tecnici'
      ? '/tecnici/nuovo'
      : null

  return (
    <div className="w-full bg-slate-100 border-b border-slate-300 px-3 py-1 flex items-center gap-0.5 shrink-0 z-10">

      {/* Navigazione */}
      <TBtn title="Primo" onClick={() => navTo(0)} disabled={!hasPrev}>
        <ChevronsLeft size={18} /><span>Primo</span>
      </TBtn>
      <TBtn title="Precedente" onClick={() => navTo(currentIndex - 1)} disabled={!hasPrev}>
        <ChevronLeft size={18} /><span>Prec.</span>
      </TBtn>
      <TBtn title="Successivo" onClick={() => navTo(currentIndex + 1)} disabled={!hasNext}>
        <ChevronRight size={18} /><span>Succ.</span>
      </TBtn>
      <TBtn title="Ultimo" onClick={() => navTo(total - 1)} disabled={!hasNext}>
        <ChevronsRight size={18} /><span>Ultimo</span>
      </TBtn>

      {currentIndex !== -1 && (
        <span className="text-xs text-slate-500 px-2 font-mono tabular-nums">
          {currentIndex + 1} / {total}
        </span>
      )}

      <Divider />

      {/* Cerca */}
      <div className="relative">
        <TBtn title="Cerca" onClick={() => { setCercaOpen(o => !o); setCercaQ('') }}>
          <Search size={18} /><span>Cerca</span>
        </TBtn>
        {cercaOpen && (
          <div className="absolute top-full left-0 mt-1 w-72 bg-white border border-slate-200 rounded-xl shadow-xl z-50 overflow-hidden">
            <div className="p-2 border-b border-slate-100">
              <input
                autoFocus
                type="text"
                value={cercaQ}
                onChange={e => setCercaQ(e.target.value)}
                placeholder="Cerca..."
                className="w-full px-3 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
            <div className="max-h-64 overflow-y-auto">
              {isTecnici
                ? (filtrati as typeof tecnici).slice(0, 30).map(t => (
                    <button key={t.id} onClick={() => { navigate(`/tecnici/${t.id}`); setCercaOpen(false) }}
                      className="w-full text-left px-4 py-2.5 hover:bg-slate-50 transition border-b border-slate-50">
                      <p className="text-sm font-medium text-slate-800">{t.cognome} {t.nome}</p>
                      <p className="text-xs text-slate-400">{t.codice_tecnico}</p>
                    </button>
                  ))
                : (filtrati as typeof clienti).slice(0, 30).map(c => (
                    <button key={c.id} onClick={() => { navigate(`/clienti/${c.id}`); setCercaOpen(false) }}
                      className="w-full text-left px-4 py-2.5 hover:bg-slate-50 transition border-b border-slate-50">
                      <p className="text-sm font-medium text-slate-800">{c.ragione_sociale}</p>
                      <p className="text-xs text-slate-400">{c.codice_cliente}</p>
                    </button>
                  ))
              }
              {filtrati.length === 0 && (
                <p className="text-sm text-slate-400 text-center py-4">Nessun risultato</p>
              )}
            </div>
          </div>
        )}
      </div>

      <Divider />

      <TBtn title="Nuovo" onClick={() => newTarget && navigate(newTarget)} disabled={!newTarget} variant="primary">
        <FilePlus size={18} /><span>Nuovo</span>
      </TBtn>

      {actions.canEdit && !actions.editMode && (
        <TBtn title="Modifica" onClick={actions.onEdit} variant="primary">
          <Pencil size={18} /><span>Modifica</span>
        </TBtn>
      )}

      {actions.editMode && (
        <>
          <TBtn title="Salva" onClick={actions.onSave} disabled={!actions.canSave || actions.isSaving} variant="primary">
            <Save size={18} /><span>{actions.isSaving ? '...' : 'Salva'}</span>
          </TBtn>
          <TBtn title="Annulla modifiche" onClick={actions.onReset} disabled={!actions.canReset}>
            <RotateCcw size={18} /><span>Annulla</span>
          </TBtn>
        </>
      )}

      <Divider />

      <TBtn title="Stampa" onClick={() => window.print()}>
        <Printer size={18} /><span>Stampa</span>
      </TBtn>

      <Divider />

      {activeSection && (
        <TBtn title={`Svuota sezione ${activeSection}`} onClick={clearSection} disabled={clearCount === 0} variant="danger">
          <Database size={18} /><span>Svuota</span>
        </TBtn>
      )}

      <TBtn title="Elimina" onClick={actions.onDelete} disabled={!actions.onDelete || !actions.canDelete} variant="danger">
        <Trash2 size={18} /><span>Elimina</span>
      </TBtn>
    </div>
  )
}
