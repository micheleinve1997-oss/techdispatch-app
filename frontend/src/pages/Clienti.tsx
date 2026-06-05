import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { Plus, Search, Building2, Trash2, Upload, ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react'
import { clientiApi } from '../api/clienti'
import StatoBadge from '../components/StatoBadge'

type SortKey = 'ragione_sociale' | 'codice_cliente' | 'citta' | 'stato'
type SortDir = 'asc' | 'desc'
type FiltroStato = 'tutti' | 'COMPLETO' | 'INCOMPLETO' | 'BOZZA'

function SortIcon({ col, sortKey, sortDir }: { col: SortKey; sortKey: SortKey; sortDir: SortDir }) {
  if (col !== sortKey) return <ChevronsUpDown size={13} className="text-slate-400 ml-1" />
  return sortDir === 'asc'
    ? <ChevronUp size={13} className="text-blue-600 ml-1" />
    : <ChevronDown size={13} className="text-blue-600 ml-1" />
}

export default function Clienti() {
  const [search, setSearch] = useState('')
  const [filtroStato, setFiltroStato] = useState<FiltroStato>('tutti')
  const [sortKey, setSortKey] = useState<SortKey>('ragione_sociale')
  const [sortDir, setSortDir] = useState<SortDir>('asc')
  const navigate = useNavigate()
  const qc = useQueryClient()

  const { data: clienti = [], isLoading, isError, refetch } = useQuery({
    queryKey: ['clienti'],
    queryFn: () => clientiApi.list(),
  })

  const deleteMutation = useMutation({
    mutationFn: clientiApi.delete,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['clienti'] }),
  })

  const handleSort = (key: SortKey) => {
    if (key === sortKey) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('asc') }
  }

  const contatori = useMemo(() => ({
    tutti: clienti.length,
    COMPLETO: clienti.filter(c => c.stato === 'COMPLETO').length,
    INCOMPLETO: clienti.filter(c => c.stato === 'INCOMPLETO').length,
    BOZZA: clienti.filter(c => c.stato === 'BOZZA').length,
  }), [clienti])

  const filtered = useMemo(() => {
    let list = clienti.filter(c => {
      const q = search.toLowerCase()
      const matchSearch = !q ||
        c.ragione_sociale.toLowerCase().includes(q) ||
        c.codice_cliente.toLowerCase().includes(q) ||
        (c.sede_legale?.citta ?? '').toLowerCase().includes(q) ||
        (c.sede_legale?.telefono ?? '').includes(q)
      const matchStato = filtroStato === 'tutti' || c.stato === filtroStato
      return matchSearch && matchStato
    })

    list = [...list].sort((a, b) => {
      let va = '', vb = ''
      if (sortKey === 'ragione_sociale') { va = a.ragione_sociale; vb = b.ragione_sociale }
      else if (sortKey === 'codice_cliente') { va = a.codice_cliente; vb = b.codice_cliente }
      else if (sortKey === 'citta') { va = a.sede_legale?.citta ?? ''; vb = b.sede_legale?.citta ?? '' }
      else if (sortKey === 'stato') { va = a.stato; vb = b.stato }
      return sortDir === 'asc' ? va.localeCompare(vb) : vb.localeCompare(va)
    })

    return list
  }, [clienti, search, filtroStato, sortKey, sortDir])

  const ThCol = ({ label, col, className = '' }: { label: string; col: SortKey; className?: string }) => (
    <th
      onClick={() => handleSort(col)}
      className={`px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide cursor-pointer hover:text-slate-700 select-none ${className}`}
    >
      <span className="inline-flex items-center">
        {label}
        <SortIcon col={col} sortKey={sortKey} sortDir={sortDir} />
      </span>
    </th>
  )

  return (
    <div className="flex flex-col h-full">

      {/* Header */}
      <div className="px-3 py-3 border-b border-slate-200 bg-white">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 flex-1">
            <div className="relative">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Cerca per nome, codice, cittÃ , telefono..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition w-80"
              />
            </div>

            {/* Filtri stato */}
            <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-1">
              {(['tutti', 'COMPLETO', 'INCOMPLETO', 'BOZZA'] as FiltroStato[]).map(s => (
                <button
                  key={s}
                  onClick={() => setFiltroStato(s)}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                    filtroStato === s
                      ? 'bg-white text-slate-800 shadow-sm'
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  {s === 'tutti' ? 'Tutti' : s.charAt(0) + s.slice(1).toLowerCase()}
                  <span className={`ml-1.5 text-xs font-mono ${filtroStato === s ? 'text-slate-500' : 'text-slate-400'}`}>
                    {contatori[s]}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => navigate('/clienti-import')}
              className="flex items-center gap-2 border border-slate-200 hover:bg-slate-50 text-slate-700 text-sm font-medium px-3 py-2 rounded-lg transition-colors"
            >
              <Upload size={15} />
              Importa
            </button>
            <button
              onClick={() => navigate('/clienti/nuovo')}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-3 py-2 rounded-lg transition-colors"
            >
              <Plus size={15} />
              Nuovo cliente
            </button>
          </div>
        </div>

        {/* Risultati */}
        <p className="text-xs text-slate-400 mt-2">
          {filtered.length === clienti.length
            ? `${clienti.length} clienti totali`
            : `${filtered.length} di ${clienti.length} clienti`}
        </p>
      </div>

      {/* Tabella */}
      <div className="flex-1 overflow-auto">
        {isLoading ? (
          <div className="p-6 space-y-3">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-10 bg-slate-100 rounded animate-pulse" />
            ))}
          </div>
        ) : isError ? (
          <div className="flex flex-col items-center justify-center py-20 text-center px-6">
            <Building2 size={40} className="text-red-300 mb-3" />
            <p className="text-red-600 font-medium">Clienti non caricati</p>
            <p className="text-slate-400 text-sm mt-1 max-w-md">
              Il database non e vuoto: e un problema temporaneo di collegamento con il backend.
            </p>
            <button
              onClick={() => refetch()}
              className="mt-4 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700"
            >
              Riprova
            </button>
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
          <table className="w-full table-fixed border-collapse">
            <thead className="sticky top-0 z-10">
              <tr className="bg-slate-50 border-b border-slate-200">
                <ThCol label="Codice" col="codice_cliente" className="w-[8%]" />
                <ThCol label="Ragione Sociale" col="ragione_sociale" className="w-[28%]" />
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide w-[16%]">Telefono</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide w-[24%]">Email</th>
                <ThCol label="CittÃ " col="citta" className="w-[16%]" />
                <ThCol label="Stato" col="stato" className="w-[8%]" />
                <th className="w-10" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((cliente, idx) => (
                <tr
                  key={cliente.id}
                  onClick={() => navigate(`/clienti/${cliente.id}`)}
                  className={`cursor-pointer hover:bg-blue-50/60 transition-colors group ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/40'}`}
                >
                  <td className="px-4 py-3 text-xs font-mono text-slate-500 whitespace-nowrap">
                    {cliente.codice_cliente}
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm font-medium text-slate-900">{cliente.ragione_sociale}</span>
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-600 whitespace-nowrap">
                    {cliente.sede_legale?.telefono ?? <span className="text-slate-300">â€”</span>}
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-600 truncate max-w-[200px]">
                    {cliente.sede_legale?.email ?? <span className="text-slate-300">â€”</span>}
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-600 whitespace-nowrap">
                    {cliente.sede_legale?.citta
                      ? `${cliente.sede_legale.citta}${cliente.sede_legale.provincia ? ` (${cliente.sede_legale.provincia})` : ''}`
                      : <span className="text-slate-300">â€”</span>
                    }
                  </td>
                  <td className="px-4 py-3">
                    <StatoBadge stato={cliente.stato} />
                  </td>
                  <td className="px-2 py-3">
                    <button
                      onClick={e => {
                        e.stopPropagation()
                        if (confirm(`Eliminare ${cliente.ragione_sociale}?`)) deleteMutation.mutate(cliente.id)
                      }}
                      className="opacity-0 group-hover:opacity-100 p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded transition-all"
                    >
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

