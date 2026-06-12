import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { CalendarOff, Trash2, UserRound } from 'lucide-react'
import { tecniciApi, SPECIALIZZAZIONI, type Indisponibilita, type StatoTecnico, type Tecnico, type TecnicoCreate } from '../api/tecnici'

const emptyForm: TecnicoCreate = {
  nome: '',
  cognome: '',
  telefono: '',
  email: '',
  specializzazioni: [],
  sede_partenza: { tipo: 'ditta', indirizzo: '', cap: '', citta: '', provincia: '' },
  patente: true,
  mezzo_proprio: false,
  stato: 'ATTIVO',
  note: '',
  zona_preferita: '',
  zone: [],
  competenze: [],
  ore_giornaliere: 8,
  indisponibilita: [],
}

function splitList(value: string) {
  return value.split(',').map(v => v.trim()).filter(Boolean)
}

export default function Tecnici() {
  const qc = useQueryClient()
  const [form, setForm] = useState<TecnicoCreate>(emptyForm)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [zoneText, setZoneText] = useState('')
  const [assenza, setAssenza] = useState<Indisponibilita>({ tipo: 'FERIE', data_inizio: '', data_fine: '', note: '' })

  const { data: tecnici = [], isLoading } = useQuery({ queryKey: ['tecnici'], queryFn: tecniciApi.list })

  const save = useMutation({
    mutationFn: () => {
      const payload = {
        ...form,
        zone: splitList(zoneText),
        competenze: form.specializzazioni,
      }
      return editingId ? tecniciApi.update(editingId, payload) : tecniciApi.create(payload)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tecnici'] })
      qc.invalidateQueries({ queryKey: ['pianificatore'] })
      setForm(emptyForm)
      setZoneText('')
      setEditingId(null)
    },
  })

  const remove = useMutation({
    mutationFn: tecniciApi.delete,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tecnici'] })
      qc.invalidateQueries({ queryKey: ['pianificatore'] })
    },
  })

  const tecnicoLabel = useMemo(() => editingId ? 'Modifica tecnico' : 'Nuovo tecnico', [editingId])
  const attivi = tecnici.filter(t => t.stato === 'ATTIVO').length

  const editTecnico = (t: Tecnico) => {
    setEditingId(t.id)
    setForm({
      nome: t.nome,
      cognome: t.cognome,
      telefono: t.telefono ?? '',
      email: t.email ?? '',
      specializzazioni: t.specializzazioni ?? [],
      sede_partenza: t.sede_partenza ?? { tipo: 'ditta', indirizzo: '', cap: '', citta: '', provincia: '' },
      patente: t.patente ?? true,
      mezzo_proprio: t.mezzo_proprio ?? false,
      stato: t.stato,
      note: t.note ?? '',
      zona_preferita: t.zona_preferita ?? '',
      zone: t.zone ?? [],
      competenze: t.competenze ?? t.specializzazioni ?? [],
      ore_giornaliere: t.ore_giornaliere ?? 8,
      indisponibilita: t.indisponibilita ?? [],
    })
    setZoneText((t.zone ?? []).join(', '))
  }

  const setSede = (key: string, value: string) => {
    setForm(f => ({ ...f, sede_partenza: { ...(f.sede_partenza ?? { tipo: 'ditta' }), [key]: value } }))
  }

  const toggleSpec = (s: string) => {
    setForm(f => ({
      ...f,
      specializzazioni: f.specializzazioni.includes(s) ? f.specializzazioni.filter(x => x !== s) : [...f.specializzazioni, s],
    }))
  }

  const addAssenza = () => {
    if (!assenza.data_inizio || !assenza.data_fine) return
    setForm(f => ({ ...f, indisponibilita: [...(f.indisponibilita ?? []), assenza] }))
    setAssenza({ tipo: 'FERIE', data_inizio: '', data_fine: '', note: '' })
  }

  return (
    <div className="h-full overflow-auto bg-white">
      <div className="border-b border-slate-200 px-8 py-5 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Tecnici</h1>
          <p className="text-sm text-slate-500 mt-1">Questa sezione alimenta direttamente il pianificatore.</p>
        </div>
        <div className="text-sm text-slate-500">{attivi} attivi su {tecnici.length}</div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[440px_1fr] gap-8 p-8">
        <section className="border border-slate-200 rounded-xl p-5 bg-slate-50/60">
          <h2 className="font-semibold text-slate-900 mb-4">{tecnicoLabel}</h2>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <label className="text-xs font-semibold text-slate-600 uppercase">Nome<input className="mt-2 w-full border border-slate-200 rounded-lg px-3 py-2.5 bg-white" value={form.nome} onChange={e => setForm({ ...form, nome: e.target.value })} /></label>
              <label className="text-xs font-semibold text-slate-600 uppercase">Cognome<input className="mt-2 w-full border border-slate-200 rounded-lg px-3 py-2.5 bg-white" value={form.cognome} onChange={e => setForm({ ...form, cognome: e.target.value })} /></label>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <label className="text-xs font-semibold text-slate-600 uppercase">Telefono<input className="mt-2 w-full border border-slate-200 rounded-lg px-3 py-2.5 bg-white" value={form.telefono ?? ''} onChange={e => setForm({ ...form, telefono: e.target.value })} /></label>
              <label className="text-xs font-semibold text-slate-600 uppercase">Email<input className="mt-2 w-full border border-slate-200 rounded-lg px-3 py-2.5 bg-white" value={form.email ?? ''} onChange={e => setForm({ ...form, email: e.target.value })} /></label>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <label className="text-xs font-semibold text-slate-600 uppercase">CAP<input className="mt-2 w-full border border-slate-200 rounded-lg px-3 py-2.5 bg-white" value={form.sede_partenza?.cap ?? ''} onChange={e => setSede('cap', e.target.value)} /></label>
              <label className="text-xs font-semibold text-slate-600 uppercase">Città<input className="mt-2 w-full border border-slate-200 rounded-lg px-3 py-2.5 bg-white" value={form.sede_partenza?.citta ?? ''} onChange={e => setSede('citta', e.target.value)} /></label>
              <label className="text-xs font-semibold text-slate-600 uppercase">Ore<input type="number" className="mt-2 w-full border border-slate-200 rounded-lg px-3 py-2.5 bg-white" value={form.ore_giornaliere ?? 8} onChange={e => setForm({ ...form, ore_giornaliere: Number(e.target.value) })} /></label>
            </div>
            <label className="text-xs font-semibold text-slate-600 uppercase">Zona preferita<input className="mt-2 w-full border border-slate-200 rounded-lg px-3 py-2.5 bg-white" value={form.zona_preferita ?? ''} onChange={e => setForm({ ...form, zona_preferita: e.target.value })} placeholder="Es. Bergamasca" /></label>
            <label className="text-xs font-semibold text-slate-600 uppercase">Zone abilitate<input className="mt-2 w-full border border-slate-200 rounded-lg px-3 py-2.5 bg-white" value={zoneText} onChange={e => setZoneText(e.target.value)} placeholder="Lecco, Bergamasca, Milano" /></label>
            <label className="text-xs font-semibold text-slate-600 uppercase">Stato
              <select className="mt-2 w-full border border-slate-200 rounded-lg px-3 py-2.5 bg-white" value={form.stato} onChange={e => setForm({ ...form, stato: e.target.value as StatoTecnico })}>
                <option value="ATTIVO">Attivo</option>
                <option value="NON_DISPONIBILE">Non disponibile</option>
                <option value="IN_FERIE">In ferie</option>
              </select>
            </label>
            <div>
              <p className="text-xs font-semibold text-slate-600 uppercase mb-2">Specializzazioni</p>
              <div className="flex flex-wrap gap-2">
                {SPECIALIZZAZIONI.map(s => <button key={s} onClick={() => toggleSpec(s)} className={`px-3 py-1.5 text-xs rounded-full border ${form.specializzazioni.includes(s) ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-600 border-slate-200'}`}>{s}</button>)}
              </div>
            </div>
            <div className="border-t border-slate-200 pt-4">
              <p className="text-xs font-semibold text-slate-600 uppercase mb-3">Ferie / non disponibilità a calendario</p>
              <div className="grid grid-cols-2 gap-2">
                <select className="border border-slate-200 rounded-lg px-3 py-2 bg-white" value={assenza.tipo} onChange={e => setAssenza({ ...assenza, tipo: e.target.value })}><option>FERIE</option><option>NON_DISPONIBILE</option><option>FORMAZIONE</option></select>
                <input className="border border-slate-200 rounded-lg px-3 py-2 bg-white" placeholder="Note" value={assenza.note ?? ''} onChange={e => setAssenza({ ...assenza, note: e.target.value })} />
                <input type="date" className="border border-slate-200 rounded-lg px-3 py-2 bg-white" value={assenza.data_inizio} onChange={e => setAssenza({ ...assenza, data_inizio: e.target.value })} />
                <input type="date" className="border border-slate-200 rounded-lg px-3 py-2 bg-white" value={assenza.data_fine} onChange={e => setAssenza({ ...assenza, data_fine: e.target.value })} />
              </div>
              <button onClick={addAssenza} className="mt-3 text-sm text-blue-600 font-medium">+ Aggiungi al calendario</button>
            </div>
            <button disabled={!form.nome || !form.cognome || save.isPending} onClick={() => save.mutate()} className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-4 py-2.5 font-medium disabled:opacity-40">Salva tecnico</button>
          </div>
        </section>

        <section className="overflow-hidden border border-slate-200 rounded-xl bg-white">
          {isLoading ? <p className="p-6 text-slate-400">Caricamento...</p> : (
            <table className="w-full table-fixed">
              <thead className="bg-slate-50 border-b border-slate-200"><tr><th className="text-left text-xs uppercase text-slate-500 px-4 py-3 w-[22%]">Tecnico</th><th className="text-left text-xs uppercase text-slate-500 px-4 py-3 w-[12%]">Stato</th><th className="text-left text-xs uppercase text-slate-500 px-4 py-3 w-[12%]">CAP</th><th className="text-left text-xs uppercase text-slate-500 px-4 py-3 w-[18%]">Zona</th><th className="text-left text-xs uppercase text-slate-500 px-4 py-3">Competenze</th><th className="text-left text-xs uppercase text-slate-500 px-4 py-3 w-[14%]">Blocchi</th><th className="w-20" /></tr></thead>
              <tbody className="divide-y divide-slate-100">
                {tecnici.map(t => <tr key={t.id} className="hover:bg-slate-50"><td className="px-4 py-3 font-medium text-slate-900"><UserRound size={15} className="inline mr-2 text-slate-400" />{t.cognome} {t.nome}</td><td className="px-4 py-3 text-slate-600">{t.stato}</td><td className="px-4 py-3 text-slate-600">{t.sede_partenza?.cap || '-'}</td><td className="px-4 py-3 text-slate-600">{t.zona_preferita || t.sede_partenza?.citta || '-'}</td><td className="px-4 py-3 text-slate-600 truncate">{(t.specializzazioni ?? []).join(', ') || '-'}</td><td className="px-4 py-3 text-slate-600"><CalendarOff size={14} className="inline mr-1 text-slate-400" />{(t.indisponibilita ?? []).length}</td><td className="px-4 py-3 flex gap-2 justify-end"><button onClick={() => editTecnico(t)} className="text-blue-600 text-sm">modifica</button><button onClick={() => remove.mutate(t.id)} className="text-red-500"><Trash2 size={15} /></button></td></tr>)}
              </tbody>
            </table>
          )}
        </section>
      </div>
    </div>
  )
}
