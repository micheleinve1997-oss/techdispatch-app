import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { Plus, Search, UserCheck, Trash2, Phone, Mail, Wrench, Upload } from 'lucide-react'
import { tecniciApi, type Tecnico, type StatoTecnico } from '../api/tecnici'

const STATO_CFG: Record<StatoTecnico, { label: string; dot: string; text: string }> = {
  ATTIVO:           { label: 'Attivo',           dot: 'bg-emerald-500', text: 'text-emerald-700' },
  NON_DISPONIBILE:  { label: 'Non disponibile',  dot: 'bg-amber-400',   text: 'text-amber-700'  },
  IN_FERIE:         { label: 'In ferie',          dot: 'bg-slate-400',   text: 'text-slate-600'  },
}

function Iniziali({ nome, cognome }: { nome: string; cognome: string }) {
  const colors = ['bg-blue-500', 'bg-violet-500', 'bg-emerald-500', 'bg-amber-500', 'bg-rose-500', 'bg-teal-500']
  const idx = (nome.charCodeAt(0) + cognome.charCodeAt(0)) % colors.length
  return (
    <div className={`w-10 h-10 ${colors[idx]} rounded-full flex items-center justify-center shrink-0`}>
      <span className="text-white text-sm font-semibold">
        {nome.charAt(0).toUpperCase()}{cognome.charAt(0).toUpperCase()}
      </span>
    </div>
  )
}

export default function Tecnici() {
  const [search, setSearch] = useState('')
  const navigate = useNavigate()
  const qc = useQueryClient()

  const { data: tecnici = [], isLoading } = useQuery({
    queryKey: ['tecnici'],
    queryFn: tecniciApi.list,
  })

  const deleteMutation = useMutation({
    mutationFn: tecniciApi.delete,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tecnici'] }),
  })

  const filtered = tecnici.filter(t =>
    `${t.nome} ${t.cognome}`.toLowerCase().includes(search.toLowerCase()) ||
    t.codice_tecnico.toLowerCase().includes(search.toLowerCase())
  )

  const attivi = tecnici.filter(t => t.stato === 'ATTIVO').length

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-8 py-6 border-b border-slate-200 bg-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-slate-900">Tecnici</h1>
            <p className="text-sm text-slate-500 mt-0.5">
              {attivi} attivi su {tecnici.length} totali
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate('/tecnici-import')}
              className="flex items-center gap-2 border border-slate-200 hover:bg-slate-50 text-slate-700 text-sm font-medium px-4 py-2.5 rounded-lg transition-colors"
            >
              <Upload size={16} />
              Importa
            </button>
            <button
              onClick={() => navigate('/tecnici/nuovo')}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2.5 rounded-lg transition-colors"
            >
              <Plus size={16} />
              Nuovo tecnico
            </button>
          </div>
        </div>

        <div className="mt-4 relative max-w-sm">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Cerca per nome o codice..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition"
          />
        </div>
      </div>

      {/* Lista */}
      <div className="flex-1 overflow-auto">
        {isLoading ? (
          <div className="divide-y divide-slate-100">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 px-8 py-4 animate-pulse">
                <div className="w-10 h-10 bg-slate-200 rounded-full" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-slate-200 rounded w-40" />
                  <div className="h-3 bg-slate-100 rounded w-24" />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <UserCheck size={40} className="text-slate-300 mb-3" />
            <p className="text-slate-500 font-medium">Nessun tecnico trovato</p>
            <p className="text-slate-400 text-sm mt-1">
              {search ? 'Prova con un altro termine' : 'Aggiungi il primo tecnico'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filtered.map((t: Tecnico) => {
              const cfg = STATO_CFG[t.stato]
              return (
                <div
                  key={t.id}
                  onClick={() => navigate(`/tecnici/${t.id}`)}
                  className="flex items-center gap-4 px-8 py-4 hover:bg-slate-50 cursor-pointer group transition-colors"
                >
                  <Iniziali nome={t.nome} cognome={t.cognome} />

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-slate-900">{t.cognome} {t.nome}</p>
                      <span className={`flex items-center gap-1 text-xs font-medium ${cfg.text}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                        {cfg.label}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">{t.codice_tecnico}</p>
                  </div>

                  {/* Specializzazioni */}
                  <div className="hidden md:flex items-center gap-1.5 flex-wrap max-w-xs">
                    {t.specializzazioni.slice(0, 2).map(s => (
                      <span key={s} className="flex items-center gap-1 text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
                        <Wrench size={10} />
                        {s}
                      </span>
                    ))}
                    {t.specializzazioni.length > 2 && (
                      <span className="text-xs text-slate-400">+{t.specializzazioni.length - 2}</span>
                    )}
                  </div>

                  {/* Contatti */}
                  <div className="hidden lg:flex items-center gap-3 text-xs text-slate-400">
                    {t.telefono && (
                      <span className="flex items-center gap-1"><Phone size={11} />{t.telefono}</span>
                    )}
                    {t.email && (
                      <span className="flex items-center gap-1 truncate max-w-[160px]"><Mail size={11} />{t.email}</span>
                    )}
                  </div>

                  <button
                    onClick={e => {
                      e.stopPropagation()
                      if (confirm(`Eliminare ${t.nome} ${t.cognome}?`)) {
                        deleteMutation.mutate(t.id)
                      }
                    }}
                    className="opacity-0 group-hover:opacity-100 p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded transition-all"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
