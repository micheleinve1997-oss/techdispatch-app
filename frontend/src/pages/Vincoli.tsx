import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Ban, Link2, Trash2 } from 'lucide-react'
import { clientiApi } from '../api/clienti'
import { tecniciApi } from '../api/tecnici'
import { vincoliApi } from '../api/vincoli'

export default function Vincoli() {
  const qc = useQueryClient()
  const [tecnicoId, setTecnicoId] = useState('')
  const [clienteId, setClienteId] = useState('')
  const [tipo, setTipo] = useState('BLOCCO')
  const [motivo, setMotivo] = useState('')

  const { data: clienti = [] } = useQuery({ queryKey: ['clienti'], queryFn: () => clientiApi.list() })
  const { data: tecnici = [] } = useQuery({ queryKey: ['tecnici'], queryFn: tecniciApi.list })
  const { data: vincoli = [], isLoading } = useQuery({ queryKey: ['vincoli'], queryFn: vincoliApi.list })

  const create = useMutation({
    mutationFn: () => vincoliApi.create({ tecnico_id: tecnicoId, cliente_id: clienteId, tipo, motivo }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['vincoli'] })
      qc.invalidateQueries({ queryKey: ['pianificatore'] })
      setClienteId('')
      setMotivo('')
    },
  })

  const remove = useMutation({
    mutationFn: vincoliApi.delete,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['vincoli'] })
      qc.invalidateQueries({ queryKey: ['pianificatore'] })
    },
  })

  return (
    <div className="h-full overflow-auto bg-white">
      <div className="border-b border-slate-200 px-8 py-5">
        <h1 className="text-xl font-semibold text-slate-900">Vincoli</h1>
        <p className="text-sm text-slate-500 mt-1">Regole tecnico-cliente lette dal pianificatore. Il cliente arriva dalla sezione Clienti, inclusa P.IVA.</p>
      </div>
      <div className="grid grid-cols-1 xl:grid-cols-[420px_1fr] gap-8 p-8">
        <section className="border border-slate-200 rounded-xl p-5 bg-slate-50/60">
          <h2 className="font-semibold text-slate-900 mb-4">Nuovo vincolo</h2>
          <div className="space-y-4">
            <label className="text-xs font-semibold text-slate-600 uppercase">Tecnico
              <select className="mt-2 w-full border border-slate-200 rounded-lg px-3 py-2.5 bg-white" value={tecnicoId} onChange={e => setTecnicoId(e.target.value)}>
                <option value="">Seleziona tecnico</option>
                {tecnici.map(t => <option key={t.id} value={t.id}>{t.nome} {t.cognome} - {t.codice_tecnico}</option>)}
              </select>
            </label>
            <label className="text-xs font-semibold text-slate-600 uppercase">Cliente
              <select className="mt-2 w-full border border-slate-200 rounded-lg px-3 py-2.5 bg-white" value={clienteId} onChange={e => setClienteId(e.target.value)}>
                <option value="">Seleziona cliente</option>
                {clienti.map(c => <option key={c.id} value={c.id}>{c.ragione_sociale} - P.IVA {c.partita_iva || '-'}</option>)}
              </select>
            </label>
            <label className="text-xs font-semibold text-slate-600 uppercase">Tipo
              <select className="mt-2 w-full border border-slate-200 rounded-lg px-3 py-2.5 bg-white" value={tipo} onChange={e => setTipo(e.target.value)}>
                <option value="BLOCCO">Blocco: questo tecnico non può andare dal cliente</option>
                <option value="PREFERENZA">Preferenza: tecnico consigliato</option>
              </select>
            </label>
            <label className="text-xs font-semibold text-slate-600 uppercase">Motivo
              <textarea className="mt-2 w-full border border-slate-200 rounded-lg px-3 py-2.5 bg-white min-h-24" value={motivo} onChange={e => setMotivo(e.target.value)} />
            </label>
            <button disabled={!tecnicoId || !clienteId || create.isPending} onClick={() => create.mutate()} className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-4 py-2.5 font-medium disabled:opacity-40">Crea vincolo</button>
          </div>
        </section>
        <section className="border border-slate-200 rounded-xl bg-white overflow-hidden">
          {isLoading ? <p className="p-6 text-slate-400">Caricamento...</p> : (
            <table className="w-full table-fixed">
              <thead className="bg-slate-50 border-b border-slate-200"><tr><th className="text-left text-xs uppercase text-slate-500 px-4 py-3 w-[18%]">Tipo</th><th className="text-left text-xs uppercase text-slate-500 px-4 py-3 w-[24%]">Tecnico</th><th className="text-left text-xs uppercase text-slate-500 px-4 py-3 w-[32%]">Cliente</th><th className="text-left text-xs uppercase text-slate-500 px-4 py-3">Motivo</th><th className="w-12" /></tr></thead>
              <tbody className="divide-y divide-slate-100">
                {vincoli.map(v => (
                  <tr key={v.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3"><span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-semibold ${v.tipo === 'BLOCCO' ? 'bg-red-50 text-red-700' : 'bg-blue-50 text-blue-700'}`}>{v.tipo === 'BLOCCO' ? <Ban size={13} /> : <Link2 size={13} />}{v.tipo}</span></td>
                    <td className="px-4 py-3 text-slate-700">{v.tecnico?.nome} {v.tecnico?.cognome}</td>
                    <td className="px-4 py-3"><p className="font-medium text-slate-900">{v.cliente?.ragione_sociale}</p><p className="text-xs text-slate-400">P.IVA {v.cliente?.partita_iva || '-'}</p></td>
                    <td className="px-4 py-3 text-slate-600 truncate">{v.motivo || '-'}</td>
                    <td className="px-4 py-3"><button onClick={() => remove.mutate(v.id)} className="text-red-500"><Trash2 size={15} /></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      </div>
    </div>
  )
}
