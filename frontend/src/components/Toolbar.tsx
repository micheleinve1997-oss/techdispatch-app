import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  ChevronsLeft, ChevronLeft, ChevronRight, ChevronsRight,
  Search, FilePlus, Save, RotateCcw, Printer, Trash2
} from 'lucide-react'
import { clientiApi } from '../api/clienti'
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
  const { actions } = useToolbar()
  const [cercaOpen, setCercaOpen] = useState(false)
  const [cercaQ, setCercaQ] = useState('')

  const { data: clienti = [] } = useQuery({
    queryKey: ['clienti'],
    queryFn: () => clientiApi.list(),
  })

  // Legge il cliente corrente dall'URL
  const pathname = window.location.pathname
  const match = pathname.match(/^\/clienti\/(.+)$/)
  const currentId = match ? match[1] : null
  const isNew = currentId === 'nuovo'

  const currentIndex = currentId && !isNew
    ? clienti.findIndex(c => c.id === currentId)
    : -1
  const total = clienti.length
  const hasPrev = currentIndex > 0
  const hasNext = currentIndex < total - 1 && currentIndex !== -1

  const navTo = (idx: number) => {
    if (idx >= 0 && idx < clienti.length) {
      navigate(`/clienti/${clienti[idx].id}`)
    }
  }

  const clientiFiltrati = clienti.filter(c =>
    c.ragione_sociale.toLowerCase().includes(cercaQ.toLowerCase()) ||
    c.codice_cliente.toLowerCase().includes(cercaQ.toLowerCase())
  )

  return (
    <div className="bg-slate-100 border-b border-slate-300 px-3 py-1 flex items-center gap-0.5 shrink-0 z-10">

      {/* Navigazione */}
      <TBtn title="Primo" onClick={() => navTo(0)} disabled={!hasPrev}>
        <ChevronsLeft size={18} />
        <span>Primo</span>
      </TBtn>
      <TBtn title="Precedente" onClick={() => navTo(currentIndex - 1)} disabled={!hasPrev}>
        <ChevronLeft size={18} />
        <span>Prec.</span>
      </TBtn>
      <TBtn title="Successivo" onClick={() => navTo(currentIndex + 1)} disabled={!hasNext}>
        <ChevronRight size={18} />
        <span>Succ.</span>
      </TBtn>
      <TBtn title="Ultimo" onClick={() => navTo(total - 1)} disabled={!hasNext}>
        <ChevronsRight size={18} />
        <span>Ultimo</span>
      </TBtn>

      {currentIndex !== -1 && (
        <span className="text-xs text-slate-500 px-2 font-mono tabular-nums">
          {currentIndex + 1} / {total}
        </span>
      )}

      <Divider />

      {/* Cerca */}
      <div className="relative">
        <TBtn title="Cerca cliente" onClick={() => { setCercaOpen(o => !o); setCercaQ('') }}>
          <Search size={18} />
          <span>Cerca</span>
        </TBtn>
        {cercaOpen && (
          <div className="absolute top-full left-0 mt-1 w-72 bg-white border border-slate-200 rounded-xl shadow-xl z-50 overflow-hidden">
            <div className="p-2 border-b border-slate-100">
              <input
                autoFocus
                type="text"
                value={cercaQ}
                onChange={e => setCercaQ(e.target.value)}
                placeholder="Nome o codice..."
                className="w-full px-3 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
            <div className="max-h-64 overflow-y-auto">
              {clientiFiltrati.slice(0, 30).map(c => (
                <button
                  key={c.id}
                  onClick={() => { navigate(`/clienti/${c.id}`); setCercaOpen(false) }}
                  className="w-full text-left px-4 py-2.5 hover:bg-slate-50 transition border-b border-slate-50"
                >
                  <p className="text-sm font-medium text-slate-800">{c.ragione_sociale}</p>
                  <p className="text-xs text-slate-400">{c.codice_cliente}</p>
                </button>
              ))}
              {clientiFiltrati.length === 0 && (
                <p className="text-sm text-slate-400 text-center py-4">Nessun risultato</p>
              )}
            </div>
          </div>
        )}
      </div>

      <Divider />

      {/* Azioni */}
      <TBtn title="Nuovo cliente" onClick={() => navigate('/clienti/nuovo')} variant="primary">
        <FilePlus size={18} />
        <span>Nuovo</span>
      </TBtn>

      <TBtn
        title="Salva"
        onClick={actions.onSave}
        disabled={!actions.onSave || !actions.canSave || actions.isSaving}
        variant="primary"
      >
        <Save size={18} />
        <span>{actions.isSaving ? '...' : 'Salva'}</span>
      </TBtn>

      <TBtn
        title="Annulla modifiche"
        onClick={actions.onReset}
        disabled={!actions.onReset || !actions.canReset}
      >
        <RotateCcw size={18} />
        <span>Annulla</span>
      </TBtn>

      <Divider />

      <TBtn title="Stampa" onClick={() => window.print()}>
        <Printer size={18} />
        <span>Stampa</span>
      </TBtn>

      <Divider />

      <TBtn
        title="Elimina"
        onClick={actions.onDelete}
        disabled={!actions.onDelete || !actions.canDelete}
        variant="danger"
      >
        <Trash2 size={18} />
        <span>Elimina</span>
      </TBtn>
    </div>
  )
}
