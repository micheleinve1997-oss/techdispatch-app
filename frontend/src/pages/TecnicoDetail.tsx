import { useState, useEffect, useCallback, type ReactNode } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Wrench, MapPin, Car, CreditCard, RefreshCw, AlertCircle } from 'lucide-react'
import { tecniciApi, SPECIALIZZAZIONI, type TecnicoCreate, type StatoTecnico, type TipoPartenza } from '../api/tecnici'
import { useToolbar } from '../context/ToolbarContext'

const STATO_OPTIONS: { value: StatoTecnico; label: string }[] = [
  { value: 'ATTIVO',          label: 'Attivo'          },
  { value: 'NON_DISPONIBILE', label: 'Non disponibile' },
  { value: 'IN_FERIE',        label: 'In ferie'        },
]

const STATO_CFG: Record<StatoTecnico, { dot: string; text: string }> = {
  ATTIVO:          { dot: 'bg-emerald-500', text: 'text-emerald-700' },
  NON_DISPONIBILE: { dot: 'bg-amber-400',   text: 'text-amber-700'  },
  IN_FERIE:        { dot: 'bg-slate-400',   text: 'text-slate-500'  },
}

const emptyForm = (): TecnicoCreate => ({
  nome: '', cognome: '', telefono: '', email: '',
  specializzazioni: [],
  sede_partenza: { tipo: 'ditta', indirizzo: '', cap: '', citta: '', provincia: '' },
  patente: true, mezzo_proprio: false,
  stato: 'ATTIVO', note: '',
})

function SectionTitle({ n, icon, label }: { n: number; icon?: ReactNode; label: string }) {
  return (
    <h2 className="text-sm font-semibold text-slate-700 mb-4 flex items-center gap-2">
      <span className="w-5 h-5 bg-blue-100 text-blue-600 rounded flex items-center justify-center text-xs">{n}</span>
      {icon}{label}
    </h2>
  )
}

function ReadField({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <p className="text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">{label}</p>
      <div className="w-full min-h-[38px] px-3 py-2 text-sm border border-slate-200 rounded-lg bg-slate-50 text-slate-900 flex items-center">
        {value || <span className="text-slate-300 italic">—</span>}
      </div>
    </div>
  )
}

function Field({ label, required, children }: { label: string; required?: boolean; children: ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">
        {label}{required && <span className="text-red-400 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  )
}

function Input({ value, onChange, placeholder, type = 'text' }: {
  value: string; onChange: (v: string) => void; placeholder?: string; type?: string
}) {
  return (
    <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition bg-white"
    />
  )
}

export default function TecnicoDetail() {
  const { id } = useParams<{ id: string }>()
  const isNew = !id || id === 'nuovo' || !/^[0-9a-f]{24}$/i.test(id)
  const navigate = useNavigate()
  const qc = useQueryClient()
  const { setActions, clearActions } = useToolbar()

  const { data: tecnico, isLoading } = useQuery({
    queryKey: ['tecnico', id],
    queryFn: () => tecniciApi.get(id!),
    enabled: !isNew,
  })

  const [form, setForm] = useState<TecnicoCreate>(emptyForm())
  const [editMode, setEditMode] = useState(isNew)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (tecnico) {
      setForm({
        nome: tecnico.nome,
        cognome: tecnico.cognome,
        telefono: tecnico.telefono ?? '',
        email: tecnico.email ?? '',
        specializzazioni: tecnico.specializzazioni ?? [],
        sede_partenza: tecnico.sede_partenza ?? { tipo: 'ditta', indirizzo: '', cap: '', citta: '', provincia: '' },
        patente: tecnico.patente,
        mezzo_proprio: tecnico.mezzo_proprio,
        stato: tecnico.stato,
        note: tecnico.note ?? '',
      })
    }
  }, [tecnico])

  const set = (key: keyof TecnicoCreate, value: unknown) =>
    setForm(f => ({ ...f, [key]: value }))

  const setSede = (key: string, value: string) =>
    setForm(f => ({ ...f, sede_partenza: { ...f.sede_partenza!, [key]: value } }))

  const toggleSpec = (s: string) =>
    setForm(f => ({
      ...f,
      specializzazioni: f.specializzazioni.includes(s)
        ? f.specializzazioni.filter(x => x !== s)
        : [...f.specializzazioni, s],
    }))

  const saveMutation = useMutation({
    mutationFn: () => isNew ? tecniciApi.create(form) : tecniciApi.update(id!, form),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tecnici'] })
      qc.invalidateQueries({ queryKey: ['tecnico', id] })
      if (isNew) {
        navigate('/tecnici', { replace: true })
      } else {
        setEditMode(false)
      }
    },
    onError: (err: unknown) => {
      const e = err as { response?: { data?: { detail?: string }; status?: number } }
      setError(e?.response?.data?.detail ?? `Errore HTTP ${e?.response?.status ?? 'sconosciuto'}`)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: () => tecniciApi.delete(id!),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['tecnici'] }); navigate('/tecnici') },
  })

  const handleEdit = useCallback(() => setEditMode(true), [])
  const handleReset = useCallback(() => {
    if (tecnico) {
      setForm({
        nome: tecnico.nome, cognome: tecnico.cognome,
        telefono: tecnico.telefono ?? '', email: tecnico.email ?? '',
        specializzazioni: tecnico.specializzazioni ?? [],
        sede_partenza: tecnico.sede_partenza ?? { tipo: 'ditta', indirizzo: '', cap: '', citta: '', provincia: '' },
        patente: tecnico.patente, mezzo_proprio: tecnico.mezzo_proprio,
        stato: tecnico.stato, note: tecnico.note ?? '',
      })
    }
    setEditMode(false)
  }, [tecnico])

  const handleDelete = useCallback(() => {
    if (confirm(`Eliminare ${tecnico?.cognome} ${tecnico?.nome}?`)) deleteMutation.mutate()
  }, [tecnico, deleteMutation])

  useEffect(() => {
    if (isNew) return
    setActions({
      canEdit: !editMode,
      editMode,
      onEdit: handleEdit,
      onSave: () => saveMutation.mutate(),
      canSave: Boolean(form.nome && form.cognome),
      isSaving: saveMutation.isPending,
      onReset: handleReset,
      canReset: true,
      onDelete: handleDelete,
      canDelete: !editMode,
    })
    return clearActions
  }, [editMode, form.nome, form.cognome, saveMutation.isPending, isNew, setActions, clearActions, handleEdit, handleReset, handleDelete])

  if (isLoading) return (
    <div className="flex items-center justify-center h-full">
      <RefreshCw size={20} className="animate-spin text-slate-400" />
    </div>
  )

  const statoLabel = STATO_OPTIONS.find(o => o.value === (tecnico?.stato ?? form.stato))?.label ?? ''
  const statoCfg = STATO_CFG[tecnico?.stato ?? form.stato]

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-6 py-4 border-b border-slate-200 bg-white flex items-center justify-between">
        <div>
          {isNew ? (
            <h1 className="text-base font-semibold text-slate-900">Nuovo tecnico</h1>
          ) : (
            <div className="flex items-center gap-3">
              <h1 className="text-base font-semibold text-slate-900">
                {tecnico?.cognome} {tecnico?.nome}
              </h1>
              <span className="text-xs text-slate-400">{tecnico?.codice_tecnico}</span>
              <span className={`flex items-center gap-1 text-xs font-medium ${statoCfg.text}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${statoCfg.dot}`} />
                {statoLabel}
              </span>
            </div>
          )}
        </div>

        {/* Salva/Annulla visibili solo in view nuovo */}
        {isNew && (
          <button
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending || !form.nome || !form.cognome}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-sm font-medium px-4 py-2 rounded-lg transition"
          >
            {saveMutation.isPending ? <><RefreshCw size={14} className="animate-spin" /> Salvataggio...</> : 'Salva'}
          </button>
        )}
      </div>

      {/* Body */}
      <div className="flex-1 overflow-auto px-6 py-6">
        <div className="max-w-2xl space-y-8">

          {error && (
            <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
              <AlertCircle size={16} className="text-red-500 shrink-0 mt-0.5" />
              <p className="text-sm text-red-700 flex-1">{error}</p>
              <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600 text-xs">✕</button>
            </div>
          )}

          {/* Anagrafica */}
          <section>
            <SectionTitle n={1} label="Anagrafica" />
            {editMode ? (
              <div className="grid grid-cols-2 gap-4">
                <Field label="Nome" required><Input value={form.nome} onChange={v => set('nome', v)} placeholder="Mario" /></Field>
                <Field label="Cognome" required><Input value={form.cognome} onChange={v => set('cognome', v)} placeholder="Rossi" /></Field>
                <Field label="Telefono"><Input value={form.telefono ?? ''} onChange={v => set('telefono', v)} placeholder="+39 333 1234567" type="tel" /></Field>
                <Field label="Email"><Input value={form.email ?? ''} onChange={v => set('email', v)} placeholder="mario@email.it" type="email" /></Field>
                <div className="col-span-2">
                  <Field label="Stato">
                    <div className="flex gap-2">
                      {STATO_OPTIONS.map(o => (
                        <button key={o.value} onClick={() => set('stato', o.value)}
                          className={`px-4 py-2 text-sm rounded-lg border transition font-medium ${form.stato === o.value ? 'bg-blue-600 border-blue-600 text-white' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
                          {o.label}
                        </button>
                      ))}
                    </div>
                  </Field>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                <ReadField label="Nome" value={tecnico?.nome} />
                <ReadField label="Cognome" value={tecnico?.cognome} />
                <ReadField label="Telefono" value={tecnico?.telefono} />
                <ReadField label="Email" value={tecnico?.email} />
              </div>
            )}
          </section>

          {/* Specializzazioni */}
          <section>
            <SectionTitle n={2} icon={<Wrench size={14} />} label="Specializzazioni" />
            {editMode ? (
              <div className="flex flex-wrap gap-2">
                {SPECIALIZZAZIONI.map(s => {
                  const sel = form.specializzazioni.includes(s)
                  return (
                    <button key={s} onClick={() => toggleSpec(s)}
                      className={`px-3 py-1.5 text-sm rounded-full border transition font-medium ${sel ? 'bg-blue-600 border-blue-600 text-white' : 'border-slate-200 text-slate-600 hover:border-blue-300'}`}>
                      {sel && '✓ '}{s}
                    </button>
                  )
                })}
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {(tecnico?.specializzazioni ?? []).length === 0
                  ? <span className="text-sm text-slate-400 italic">Nessuna specializzazione</span>
                  : (tecnico?.specializzazioni ?? []).map(s => (
                      <span key={s} className="flex items-center gap-1 text-xs bg-blue-50 text-blue-700 border border-blue-100 px-3 py-1.5 rounded-full font-medium">
                        <Wrench size={10} />{s}
                      </span>
                    ))
                }
              </div>
            )}
          </section>

          {/* Sede partenza */}
          <section>
            <SectionTitle n={3} icon={<MapPin size={14} />} label="Sede di partenza" />
            {editMode ? (
              <>
                <div className="flex gap-2 mb-4">
                  {(['ditta', 'casa'] as TipoPartenza[]).map(t => (
                    <button key={t} onClick={() => setSede('tipo', t)}
                      className={`px-4 py-2 text-sm rounded-lg border transition font-medium ${form.sede_partenza?.tipo === t ? 'bg-blue-600 border-blue-600 text-white' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
                      {t === 'ditta' ? '🏢 Ditta' : '🏠 Casa'}
                    </button>
                  ))}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2"><Field label="Indirizzo"><Input value={form.sede_partenza?.indirizzo ?? ''} onChange={v => setSede('indirizzo', v)} placeholder="Via Roma 1" /></Field></div>
                  <Field label="CAP"><Input value={form.sede_partenza?.cap ?? ''} onChange={v => setSede('cap', v)} placeholder="20100" /></Field>
                  <Field label="Città"><Input value={form.sede_partenza?.citta ?? ''} onChange={v => setSede('citta', v)} placeholder="Milano" /></Field>
                  <Field label="Provincia"><Input value={form.sede_partenza?.provincia ?? ''} onChange={v => setSede('provincia', v)} placeholder="MI" /></Field>
                </div>
              </>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                <ReadField label="Tipo" value={tecnico?.sede_partenza?.tipo === 'casa' ? '🏠 Casa' : '🏢 Ditta'} />
                <ReadField label="Indirizzo" value={tecnico?.sede_partenza?.indirizzo} />
                <ReadField label="CAP" value={tecnico?.sede_partenza?.cap} />
                <ReadField label="Città" value={tecnico?.sede_partenza?.citta} />
                <ReadField label="Provincia" value={tecnico?.sede_partenza?.provincia} />
              </div>
            )}
          </section>

          {/* Mobilità */}
          <section>
            <SectionTitle n={4} icon={<Car size={14} />} label="Mobilità" />
            {editMode ? (
              <div className="flex flex-col gap-3">
                {[
                  { key: 'patente' as const, icon: <CreditCard size={14} className="text-slate-400" />, label: 'Patente di guida', sub: 'Il tecnico è automunito' },
                  { key: 'mezzo_proprio' as const, icon: <Car size={14} className="text-slate-400" />, label: 'Mezzo proprio', sub: 'Usa il proprio veicolo' },
                ].map(({ key, icon, label, sub }) => (
                  <label key={key} className="flex items-center gap-3 cursor-pointer">
                    <div onClick={() => set(key, !form[key])}
                      className={`w-10 h-6 rounded-full transition-colors relative ${form[key] ? 'bg-blue-600' : 'bg-slate-200'}`}>
                      <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all ${form[key] ? 'left-5' : 'left-1'}`} />
                    </div>
                    <div><p className="text-sm font-medium text-slate-700 flex items-center gap-1.5">{icon}{label}</p><p className="text-xs text-slate-400">{sub}</p></div>
                  </label>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                <ReadField label="Patente" value={tecnico?.patente ? 'Sì' : 'No'} />
                <ReadField label="Mezzo proprio" value={tecnico?.mezzo_proprio ? 'Sì' : 'No'} />
              </div>
            )}
          </section>

          {/* Note */}
          <section>
            <SectionTitle n={5} label="Note" />
            {editMode ? (
              <textarea value={form.note ?? ''} onChange={e => set('note', e.target.value)}
                placeholder="Annotazioni libere..." rows={3}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition bg-white resize-none"
              />
            ) : (
              <ReadField label="" value={tecnico?.note} />
            )}
          </section>

        </div>
      </div>
    </div>
  )
}
