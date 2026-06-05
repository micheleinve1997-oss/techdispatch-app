import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { Plus, Search, Building2, Trash2, Upload, List, Map } from 'lucide-react'
import { clientiApi } from '../api/clienti'
import StatoBadge from '../components/StatoBadge'
import { SkeletonRow } from '../components/Skeleton'
import MappaClienti from '../components/MappaClienti'

type Tab = 'lista' | 'mappa'

export default function Clienti() {
  const [search, setSearch] = useState('')
  const [tab, setTab] = useState<Tab>('lista')
  const navigate = useNavigate()
  const qc = useQueryClient()

  const { data: clienti = [], isLoading } = useQuery({
    queryKey: ['clienti'],
    queryFn: () => clientiApi.list(),
  })

  const deleteMutation = useMutation({
    mutationFn: clientiApi.delete,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['clienti'] }),
  })

  const filtered = clienti.filter(c =>
    c.ragione_sociale.toLowerCase().includes(search.toLowerCase()) ||
    c.codice_cliente.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-8 py-6 border-b border-slate-200 bg-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-slate-900">Clienti</h1>
            <p className="text-sm text-slate-500 mt-0.5">{clienti.length} clienti totali</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate('/clienti-import')}
              className="flex items-center gap-2 border border-slate-200 hover:bg-slate-50 text-slate-700 text-sm font-medium px-4 py-2.5 rounded-lg transition-colors"
            >
              <Upload size={16} />
              Importa
            </button>
            <button
              onClick={() => navigate('/clienti/nuovo')}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2.5 rounded-lg transition-colors"
            >
              <Plus size={16} />
              Nuovo cliente
            </button>
          </div>
        </div>

        {/* Search + Tabs */}
        <div className="mt-4 flex items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Cerca per nome o codice..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition"
            />
          </div>

          {/* Tab switcher */}
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

      {/* Tab: Lista */}
      {tab === 'lista' && (
        <div className="flex-1 overflow-auto">
          {isLoading ? (
            <div className="divide-y divide-slate-100">
              {Array.from({ length: 6 }).map((_, i) => <SkeletonRow key={i} />)}
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <Building2 size={40} className="text-slate-300 mb-3" />
              <p className="text-slate-500 font-medium">Nessun cliente trovato</p>
              <p className="text-slate-400 text-sm mt-1">
                {search ? 'Prova con un altro termine' : 'Crea il primo cliente'}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {filtered.map(cliente => (
                <div
                  key={cliente.id}
                  onClick={() => navigate(`/clienti/${cliente.id}`)}
                  className="flex items-center gap-4 px-8 py-4 hover:bg-slate-50 cursor-pointer group transition-colors"
                >
                  <div className="w-9 h-9 bg-blue-100 rounded-full flex items-center justify-center shrink-0">
                    <span className="text-blue-700 text-sm font-semibold">
                      {cliente.ragione_sociale.charAt(0).toUpperCase()}
                    </span>
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900 truncate">{cliente.ragione_sociale}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{cliente.codice_cliente}</p>
                  </div>

                  {cliente.sede_legale?.citta && (
                    <span className="text-xs text-slate-400 hidden sm:block">
                      {cliente.sede_legale.citta} ({cliente.sede_legale.provincia})
                    </span>
                  )}

                  <StatoBadge stato={cliente.stato} />

                  <button
                    onClick={e => {
                      e.stopPropagation()
                      if (confirm(`Eliminare ${cliente.ragione_sociale}?`)) {
                        deleteMutation.mutate(cliente.id)
                      }
                    }}
                    className="opacity-0 group-hover:opacity-100 p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded transition-all"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab: Mappa — rimane montata per non perdere lo stato del geocoding */}
      <div className={`flex-1 overflow-hidden ${tab === 'mappa' ? 'flex flex-col' : 'hidden'}`}>
        <MappaClienti clienti={clienti} isVisible={tab === 'mappa'} />
      </div>
    </div>
  )
}
