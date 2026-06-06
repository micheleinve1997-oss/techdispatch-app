import { useState, useEffect, type ReactNode } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Save, Wrench, MapPin, Car, CreditCard, RefreshCw, AlertCircle } from 'lucide-react'
import { tecniciApi, SPECIALIZZAZIONI, type TecnicoCreate, type StatoTecnico, type TipoPartenza } from '../api/tecnici'

const STATO_OPTIONS: { value: StatoTecnico; label: string }[] = [
  { value: 'ATTIVO',          label: 'Attivo'          },
  { value: 'NON_DISPONIBILE', label: 'Non disponibile' },
  { value: 'IN_FERIE',        label: 'In ferie'        },
]

const empty: TecnicoCreate = {
  nome: '', cognome: '', telefono: '', email: '',
  specializzazioni: [],
  sede_partenza: { tipo: 'ditta', indirizzo: '', cap: '', citta: '', provincia: '' },
  patente: true, mezzo_proprio: false,
  stato: 'ATTIVO', note: '',
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">{label}</label>
      {children}
    </div>
  )
}

function Input({ value, onChange, placeholder, type = 'text' }: {
  value: string; onChange: (v: string) => void; placeholder?: string; type?: string
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition bg-white"
    />
  )
}

export default function TecnicoDetail() {
  const { id } = useParams<{ id: string }>()
  const isNew = !id || id === 'nuovo' || !/^[0-9a-f]{24}$/i.test(id)
  const navigate = useNavigate()
  const qc = useQueryClient()

  const { data: tecnico, isLoading } = useQuery({
    queryKey: ['tecnico', id],
    queryFn: () => tecniciApi.get(id!),
    enabled: !isNew,
  })

  const [form, setForm] = useState<TecnicoCreate>(empty)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

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
    mutationFn: () => isNew
      ? tecniciApi.create(form)
      : tecniciApi.update(id!, form),
    onSuccess: (saved) => {
      qc.invalidateQueries({ queryKey: ['tecnici'] })
      if (isNew) {
        navigate('/tecnici', { replace: true })
      } else {
        setSaved(true)
        setTimeout(() => setSaved(false), 2000)
      }
    },
    onError: (err: unknown) => {
      const e = err as { response?: { data?: { detail?: string }; status?: number } }
      const msg = e?.response?.data?.detail ?? `Errore HTTP ${e?.response?.status ?? 'sconosciuto'}`
      setError(msg)
    },
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <RefreshCw size={20} className="animate-spin text-slate-400" />
      </div>
    )
  }

  const title = isNew ? 'Nuovo tecnico' : `${tecnico?.cognome} ${tecnico?.nome}`

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-6 py-4 border-b border-slate-200 bg-white flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/tecnici')} className="p-1.5 hover:bg-slate-100 rounded-lg transition">
            <ArrowLeft size={18} className="text-slate-500" />
          </button>
          <div>
            <h1 className="text-base font-semibold text-slate-900">{title}</h1>
            {!isNew && tecnico && (
              <p className="text-xs text-slate-400">{tecnico.codice_tecnico}</p>
            )}
          </div>
        </div>
        <button
          onClick={() => saveMutation.mutate()}
          disabled={saveMutation.isPending || !form.nome || !form.cognome}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-sm font-medium px-4 py-2 rounded-lg transition"
        >
          {saveMutation.isPending
            ? <><RefreshCw size={14} className="animate-spin" /> Salvataggio...</>
            : saved
            ? <><Save size={14} /> Salvato</>
            : <><Save size={14} /> Salva</>
          }
        </button>
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
            <h2 className="text-sm font-semibold text-slate-700 mb-4 flex items-center gap-2">
              <span className="w-5 h-5 bg-blue-100 text-blue-600 rounded flex items-center justify-center text-xs">1</span>
              Anagrafica
            </h2>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Nome *">
                <Input value={form.nome} onChange={v => set('nome', v)} placeholder="Mario" />
              </Field>
              <Field label="Cognome *">
                <Input value={form.cognome} onChange={v => set('cognome', v)} placeholder="Rossi" />
              </Field>
              <Field label="Telefono">
                <Input value={form.telefono ?? ''} onChange={v => set('telefono', v)} placeholder="+39 333 1234567" type="tel" />
              </Field>
              <Field label="Email">
                <Input value={form.email ?? ''} onChange={v => set('email', v)} placeholder="mario.rossi@email.it" type="email" />
              </Field>
            </div>
            <div className="mt-4">
              <Field label="Stato">
                <div className="flex gap-2">
                  {STATO_OPTIONS.map(o => (
                    <button
                      key={o.value}
                      onClick={() => set('stato', o.value)}
                      className={`px-4 py-2 text-sm rounded-lg border transition font-medium ${
                        form.stato === o.value
                          ? 'bg-blue-600 border-blue-600 text-white'
                          : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      {o.label}
                    </button>
                  ))}
                </div>
              </Field>
            </div>
          </section>

          {/* Specializzazioni */}
          <section>
            <h2 className="text-sm font-semibold text-slate-700 mb-4 flex items-center gap-2">
              <span className="w-5 h-5 bg-blue-100 text-blue-600 rounded flex items-center justify-center text-xs">2</span>
              <Wrench size={14} />
              Specializzazioni
            </h2>
            <div className="flex flex-wrap gap-2">
              {SPECIALIZZAZIONI.map(s => {
                const sel = form.specializzazioni.includes(s)
                return (
                  <button
                    key={s}
                    onClick={() => toggleSpec(s)}
                    className={`px-3 py-1.5 text-sm rounded-full border transition font-medium ${
                      sel
                        ? 'bg-blue-600 border-blue-600 text-white'
                        : 'border-slate-200 text-slate-600 hover:border-blue-300 hover:text-blue-600'
                    }`}
                  >
                    {sel && '✓ '}{s}
                  </button>
                )
              })}
            </div>
          </section>

          {/* Sede partenza */}
          <section>
            <h2 className="text-sm font-semibold text-slate-700 mb-4 flex items-center gap-2">
              <span className="w-5 h-5 bg-blue-100 text-blue-600 rounded flex items-center justify-center text-xs">3</span>
              <MapPin size={14} />
              Sede di partenza
            </h2>

            <div className="flex gap-2 mb-4">
              {(['ditta', 'casa'] as TipoPartenza[]).map(t => (
                <button
                  key={t}
                  onClick={() => setSede('tipo', t)}
                  className={`px-4 py-2 text-sm rounded-lg border transition font-medium capitalize ${
                    form.sede_partenza?.tipo === t
                      ? 'bg-blue-600 border-blue-600 text-white'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {t === 'ditta' ? '🏢 Ditta' : '🏠 Casa'}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Field label="Indirizzo">
                  <Input value={form.sede_partenza?.indirizzo ?? ''} onChange={v => setSede('indirizzo', v)} placeholder="Via Roma 1" />
                </Field>
              </div>
              <Field label="CAP">
                <Input value={form.sede_partenza?.cap ?? ''} onChange={v => setSede('cap', v)} placeholder="20100" />
              </Field>
              <Field label="Città">
                <Input value={form.sede_partenza?.citta ?? ''} onChange={v => setSede('citta', v)} placeholder="Milano" />
              </Field>
              <Field label="Provincia">
                <Input value={form.sede_partenza?.provincia ?? ''} onChange={v => setSede('provincia', v)} placeholder="MI" />
              </Field>
            </div>
          </section>

          {/* Mezzo e patente */}
          <section>
            <h2 className="text-sm font-semibold text-slate-700 mb-4 flex items-center gap-2">
              <span className="w-5 h-5 bg-blue-100 text-blue-600 rounded flex items-center justify-center text-xs">4</span>
              <Car size={14} />
              Mobilità
            </h2>
            <div className="flex flex-col gap-3">
              <label className="flex items-center gap-3 cursor-pointer">
                <div
                  onClick={() => set('patente', !form.patente)}
                  className={`w-10 h-6 rounded-full transition-colors relative ${form.patente ? 'bg-blue-600' : 'bg-slate-200'}`}
                >
                  <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all ${form.patente ? 'left-5' : 'left-1'}`} />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-700 flex items-center gap-1.5">
                    <CreditCard size={14} className="text-slate-400" /> Patente di guida
                  </p>
                  <p className="text-xs text-slate-400">Il tecnico è automunito</p>
                </div>
              </label>
              <label className="flex items-center gap-3 cursor-pointer">
                <div
                  onClick={() => set('mezzo_proprio', !form.mezzo_proprio)}
                  className={`w-10 h-6 rounded-full transition-colors relative ${form.mezzo_proprio ? 'bg-blue-600' : 'bg-slate-200'}`}
                >
                  <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all ${form.mezzo_proprio ? 'left-5' : 'left-1'}`} />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-700 flex items-center gap-1.5">
                    <Car size={14} className="text-slate-400" /> Mezzo proprio
                  </p>
                  <p className="text-xs text-slate-400">Usa il proprio veicolo per gli interventi</p>
                </div>
              </label>
            </div>
          </section>

          {/* Note */}
          <section>
            <h2 className="text-sm font-semibold text-slate-700 mb-4 flex items-center gap-2">
              <span className="w-5 h-5 bg-blue-100 text-blue-600 rounded flex items-center justify-center text-xs">5</span>
              Note
            </h2>
            <textarea
              value={form.note ?? ''}
              onChange={e => set('note', e.target.value)}
              placeholder="Annotazioni libere sul tecnico..."
              rows={3}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition bg-white resize-none"
            />
          </section>

        </div>
      </div>
    </div>
  )
}
