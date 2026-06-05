import { useState, useEffect, useCallback } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  ChevronsLeft, ChevronLeft, ChevronRight, ChevronsRight,
  FilePlus, Save, Trash2, RotateCcw, Search, Printer
} from 'lucide-react'
import { clientiApi, type ClienteCreate, type Contatto } from '../api/clienti'
import StatoBadge from '../components/StatoBadge'
import DuplicatoAlert from '../components/DuplicatoAlert'
import { SkeletonForm } from '../components/Skeleton'

const baseURL = import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL}/api` : '/api'
const SEZIONI = ['Anagrafica', 'Sede Legale', 'Fatturazione', 'Contatti', 'Pagamento', 'Note']

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-slate-600 mb-1.5">
        {label}{required && <span className="text-red-400 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  )
}

function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition placeholder:text-slate-300"
    />
  )
}

function Select({ children, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition"
    >
      {children}
    </select>
  )
}

const emptyForm = (): ClienteCreate => ({
  ragione_sociale: '',
  codice_fiscale: '',
  partita_iva: '',
  sede_legale: { indirizzo: '', cap: '', citta: '', provincia: '', telefono: '', email: '', pec: '' },
  fatturazione_elettronica: { codice_sdi: '', pec_fe: '' },
  contatti: [],
  pagamento: { metodo: undefined, condizioni: undefined, istituto: '', abi: '', cab: '', cc: '', iban: '' },
  note: '',
})

// Bottone toolbar
function TBtn({
  onClick, disabled, title, children, variant = 'default'
}: {
  onClick?: () => void
  disabled?: boolean
  title: string
  children: React.ReactNode
  variant?: 'default' | 'danger' | 'primary'
}) {
  const base = 'flex flex-col items-center justify-center gap-0.5 px-3 py-1.5 rounded text-xs font-medium transition disabled:opacity-40 disabled:cursor-not-allowed min-w-[44px]'
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

export default function ClienteForm() {
  const { id } = useParams()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const isNew = id === 'nuovo'
  const [sezione, setSezione] = useState(0)
  const [form, setForm] = useState<ClienteCreate>(emptyForm())
  const [formDirty, setFormDirty] = useState(false)
  const [duplicato, setDuplicato] = useState<{ cliente: { id: string; codice_cliente: string; ragione_sociale: string }; campo: string } | null>(null)
  const [cercaOpen, setCercaOpen] = useState(false)
  const [cercaQ, setCercaQ] = useState('')

  // Lista clienti per navigazione
  const { data: listaClienti = [] } = useQuery({
    queryKey: ['clienti'],
    queryFn: () => clientiApi.list(),
  })

  const { data: cliente, isLoading } = useQuery({
    queryKey: ['cliente', id],
    queryFn: () => clientiApi.get(id!),
    enabled: !isNew,
  })

  // Posizione corrente nella lista
  const currentIndex = listaClienti.findIndex(c => c.id === id)
  const total = listaClienti.length
  const hasPrev = currentIndex > 0
  const hasNext = currentIndex < total - 1 && currentIndex !== -1

  const navTo = (idx: number) => {
    if (idx >= 0 && idx < listaClienti.length) {
      navigate(`/clienti/${listaClienti[idx].id}`)
    }
  }

  useEffect(() => {
    if (cliente) {
      setForm({
        ragione_sociale: cliente.ragione_sociale ?? '',
        codice_fiscale: cliente.codice_fiscale ?? '',
        partita_iva: cliente.partita_iva ?? '',
        sede_legale: cliente.sede_legale ?? emptyForm().sede_legale,
        fatturazione_elettronica: cliente.fatturazione_elettronica ?? emptyForm().fatturazione_elettronica,
        contatti: cliente.contatti ?? [],
        pagamento: cliente.pagamento ?? emptyForm().pagamento,
        note: cliente.note ?? '',
      })
      setFormDirty(false)
    }
  }, [cliente])

  const checkDuplicato = useCallback(async (campo: 'partita_iva' | 'codice_fiscale', valore: string) => {
    if (!valore || valore.length < 5) return
    try {
      const params = new URLSearchParams({ [campo === 'partita_iva' ? 'partita_iva' : 'codice_fiscale']: valore })
      if (!isNew && id) params.append('escludi_id', id)
      const res = await fetch(`${baseURL}/clienti/check-duplicato?${params}`)
      const data = await res.json()
      if (data.duplicato) {
        setDuplicato({ cliente: data.cliente, campo: campo === 'partita_iva' ? 'Partita IVA' : 'Codice Fiscale' })
      } else {
        setDuplicato(null)
      }
    } catch { /* silenzioso */ }
  }, [isNew, id])

  const saveMutation = useMutation({
    mutationFn: () => isNew ? clientiApi.create(form) : clientiApi.update(id!, form),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['clienti'] })
      setFormDirty(false)
      if (isNew) navigate(`/clienti/${data.id}`, { replace: true })
      else qc.invalidateQueries({ queryKey: ['cliente', id] })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: () => clientiApi.delete(id!),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['clienti'] })
      navigate('/clienti')
    },
  })

  const set = (path: string, value: unknown) => {
    setFormDirty(true)
    setForm(prev => {
      const next = { ...prev }
      const parts = path.split('.')
      let cur: Record<string, unknown> = next as unknown as Record<string, unknown>
      for (let i = 0; i < parts.length - 1; i++) {
        cur[parts[i]] = { ...(cur[parts[i]] as Record<string, unknown>) }
        cur = cur[parts[i]] as Record<string, unknown>
      }
      cur[parts[parts.length - 1]] = value
      return next
    })
  }

  const resetForm = () => {
    if (cliente) {
      setForm({
        ragione_sociale: cliente.ragione_sociale ?? '',
        codice_fiscale: cliente.codice_fiscale ?? '',
        partita_iva: cliente.partita_iva ?? '',
        sede_legale: cliente.sede_legale ?? emptyForm().sede_legale,
        fatturazione_elettronica: cliente.fatturazione_elettronica ?? emptyForm().fatturazione_elettronica,
        contatti: cliente.contatti ?? [],
        pagamento: cliente.pagamento ?? emptyForm().pagamento,
        note: cliente.note ?? '',
      })
      setFormDirty(false)
    }
  }

  const addContatto = () => {
    setFormDirty(true)
    setForm(p => ({ ...p, contatti: [...(p.contatti ?? []), { ruolo: 'manutenzione', nome: '', telefono: '', email: '' }] }))
  }
  const removeContatto = (i: number) => {
    setFormDirty(true)
    setForm(p => ({ ...p, contatti: p.contatti?.filter((_, idx) => idx !== i) }))
  }
  const setContatto = (i: number, field: keyof Contatto, value: string) => {
    setFormDirty(true)
    setForm(p => {
      const contatti = [...(p.contatti ?? [])]
      contatti[i] = { ...contatti[i], [field]: value }
      return { ...p, contatti }
    })
  }

  const clientiFiltrati = listaClienti.filter(c =>
    c.ragione_sociale.toLowerCase().includes(cercaQ.toLowerCase()) ||
    c.codice_cliente.toLowerCase().includes(cercaQ.toLowerCase())
  )

  if (isLoading) return (
    <div className="p-8 max-w-2xl">
      <div className="h-6 bg-slate-200 rounded w-40 mb-6 animate-pulse" />
      <SkeletonForm />
    </div>
  )

  return (
    <div className="flex flex-col h-full">

      {/* TOOLBAR */}
      <div className="bg-slate-100 border-b border-slate-300 px-3 py-1 flex items-center gap-0.5">

        {/* Navigazione record */}
        <TBtn title="Primo cliente" onClick={() => navTo(0)} disabled={!hasPrev || isNew}>
          <ChevronsLeft size={18} />
          <span>Primo</span>
        </TBtn>
        <TBtn title="Cliente precedente" onClick={() => navTo(currentIndex - 1)} disabled={!hasPrev || isNew}>
          <ChevronLeft size={18} />
          <span>Prec.</span>
        </TBtn>
        <TBtn title="Cliente successivo" onClick={() => navTo(currentIndex + 1)} disabled={!hasNext || isNew}>
          <ChevronRight size={18} />
          <span>Succ.</span>
        </TBtn>
        <TBtn title="Ultimo cliente" onClick={() => navTo(total - 1)} disabled={!hasNext || isNew}>
          <ChevronsRight size={18} />
          <span>Ultimo</span>
        </TBtn>

        {/* Contatore */}
        {!isNew && currentIndex !== -1 && (
          <span className="text-xs text-slate-500 px-2 font-mono">
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
            <div className="absolute top-full left-0 mt-1 w-72 bg-white border border-slate-200 rounded-xl shadow-lg z-50 overflow-hidden">
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
              <div className="max-h-56 overflow-y-auto">
                {clientiFiltrati.slice(0, 20).map(c => (
                  <button
                    key={c.id}
                    onClick={() => { navigate(`/clienti/${c.id}`); setCercaOpen(false) }}
                    className="w-full text-left px-3 py-2 hover:bg-slate-50 transition"
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
          onClick={() => saveMutation.mutate()}
          disabled={saveMutation.isPending || !form.ragione_sociale}
          variant="primary"
        >
          <Save size={18} />
          <span>{saveMutation.isPending ? '...' : 'Salva'}</span>
        </TBtn>
        <TBtn
          title="Annulla modifiche"
          onClick={resetForm}
          disabled={!formDirty || isNew}
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
          title="Elimina cliente"
          onClick={() => {
            if (confirm(`Eliminare ${cliente?.ragione_sociale}?`)) deleteMutation.mutate()
          }}
          disabled={isNew || deleteMutation.isPending}
          variant="danger"
        >
          <Trash2 size={18} />
          <span>Elimina</span>
        </TBtn>

        <div className="flex-1" />

        {/* Info cliente */}
        {!isNew && cliente && (
          <div className="flex items-center gap-2 pr-2">
            <span className="text-xs text-slate-500 font-mono">{cliente.codice_cliente}</span>
            <StatoBadge stato={cliente.stato} />
          </div>
        )}
      </div>

      {/* Titolo */}
      <div className="px-8 py-3 border-b border-slate-200 bg-white">
        <h1 className="text-base font-semibold text-slate-900">
          {isNew ? 'Nuovo cliente' : (cliente?.ragione_sociale ?? '...')}
        </h1>
      </div>

      {/* Tabs sezioni */}
      <div className="px-8 border-b border-slate-200 bg-white">
        <div className="flex gap-0 overflow-x-auto">
          {SEZIONI.map((s, i) => (
            <button
              key={s}
              onClick={() => setSezione(i)}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                sezione === i
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Form content */}
      <div className="flex-1 overflow-auto px-8 py-6">
        <div className="max-w-2xl">
          {sezione === 0 && (
            <div className="space-y-4">
              <Field label="Ragione Sociale" required>
                <Input value={form.ragione_sociale} onChange={e => set('ragione_sociale', e.target.value)} placeholder="Es. Rossi SpA" />
              </Field>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Codice Fiscale">
                  <Input
                    value={form.codice_fiscale ?? ''}
                    onChange={e => set('codice_fiscale', e.target.value)}
                    onBlur={e => checkDuplicato('codice_fiscale', e.target.value)}
                    placeholder="12345678901"
                  />
                </Field>
                <Field label="Partita IVA">
                  <Input
                    value={form.partita_iva ?? ''}
                    onChange={e => set('partita_iva', e.target.value)}
                    onBlur={e => checkDuplicato('partita_iva', e.target.value)}
                    placeholder="IT12345678901"
                  />
                </Field>
              </div>
              {duplicato && (
                <DuplicatoAlert
                  cliente={duplicato.cliente}
                  campo={duplicato.campo}
                  onClose={() => setDuplicato(null)}
                />
              )}
            </div>
          )}

          {sezione === 1 && (
            <div className="space-y-4">
              <Field label="Indirizzo">
                <Input value={form.sede_legale?.indirizzo ?? ''} onChange={e => set('sede_legale.indirizzo', e.target.value)} placeholder="Via Roma 1" />
              </Field>
              <div className="grid grid-cols-3 gap-4">
                <Field label="CAP">
                  <Input value={form.sede_legale?.cap ?? ''} onChange={e => set('sede_legale.cap', e.target.value)} placeholder="20100" maxLength={5} />
                </Field>
                <Field label="Città">
                  <Input value={form.sede_legale?.citta ?? ''} onChange={e => set('sede_legale.citta', e.target.value)} placeholder="Milano" />
                </Field>
                <Field label="Provincia">
                  <Input value={form.sede_legale?.provincia ?? ''} onChange={e => set('sede_legale.provincia', e.target.value)} placeholder="MI" maxLength={2} />
                </Field>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Telefono">
                  <Input value={form.sede_legale?.telefono ?? ''} onChange={e => set('sede_legale.telefono', e.target.value)} placeholder="+39 02 1234567" />
                </Field>
                <Field label="Email">
                  <Input type="email" value={form.sede_legale?.email ?? ''} onChange={e => set('sede_legale.email', e.target.value)} placeholder="info@azienda.it" />
                </Field>
              </div>
              <Field label="PEC">
                <Input value={form.sede_legale?.pec ?? ''} onChange={e => set('sede_legale.pec', e.target.value)} placeholder="pec@azienda.it" />
              </Field>
            </div>
          )}

          {sezione === 2 && (
            <div className="space-y-4">
              <Field label="Codice SDI">
                <Input value={form.fatturazione_elettronica?.codice_sdi ?? ''} onChange={e => set('fatturazione_elettronica.codice_sdi', e.target.value)} placeholder="XXXXXXX (7 caratteri)" maxLength={7} />
              </Field>
              <Field label="PEC Fatturazione Elettronica">
                <Input type="email" value={form.fatturazione_elettronica?.pec_fe ?? ''} onChange={e => set('fatturazione_elettronica.pec_fe', e.target.value)} placeholder="fe@azienda.it" />
              </Field>
              <p className="text-xs text-slate-400">Almeno uno tra Codice SDI e PEC FE è richiesto per fatturare.</p>
            </div>
          )}

          {sezione === 3 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-slate-600">Contatti aziendali</p>
                <button onClick={addContatto} className="flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-700 font-medium">
                  + Aggiungi contatto
                </button>
              </div>
              {(form.contatti ?? []).length === 0 && (
                <p className="text-sm text-slate-400 py-4 text-center">Nessun contatto aggiunto</p>
              )}
              {(form.contatti ?? []).map((c, i) => (
                <div key={i} className="border border-slate-200 rounded-xl p-4 space-y-3 bg-slate-50/50">
                  <div className="flex items-center justify-between">
                    <Select value={c.ruolo} onChange={e => setContatto(i, 'ruolo', e.target.value)} className="w-48">
                      <option value="manutenzione">Resp. Manutenzione</option>
                      <option value="acquisti">Resp. Acquisti</option>
                      <option value="amministrativo">Resp. Amministrativo</option>
                      <option value="legale">Legale Rappresentante</option>
                    </Select>
                    <button onClick={() => removeContatto(i)} className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded transition">
                      <Trash2 size={14} />
                    </button>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <Field label="Nome">
                      <Input value={c.nome} onChange={e => setContatto(i, 'nome', e.target.value)} placeholder="Mario Rossi" />
                    </Field>
                    <Field label="Telefono">
                      <Input value={c.telefono ?? ''} onChange={e => setContatto(i, 'telefono', e.target.value)} placeholder="+39 339..." />
                    </Field>
                    <Field label="Email">
                      <Input value={c.email ?? ''} onChange={e => setContatto(i, 'email', e.target.value)} placeholder="m.rossi@..." />
                    </Field>
                  </div>
                </div>
              ))}
            </div>
          )}

          {sezione === 4 && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Field label="Metodo di pagamento">
                  <Select value={form.pagamento?.metodo ?? ''} onChange={e => set('pagamento.metodo', e.target.value || undefined)}>
                    <option value="">— Seleziona —</option>
                    <option value="RiBa">RiBa</option>
                    <option value="SDD">SDD</option>
                    <option value="Bonifico">Bonifico</option>
                    <option value="Contanti">Contanti</option>
                  </Select>
                </Field>
                <Field label="Condizioni di pagamento">
                  <Select value={form.pagamento?.condizioni ?? ''} onChange={e => set('pagamento.condizioni', e.target.value || undefined)}>
                    <option value="">— Seleziona —</option>
                    <option value="Immediato">Immediato</option>
                    <option value="30gg FM">30 gg FM</option>
                    <option value="60gg FM">60 gg FM</option>
                    <option value="90gg FM">90 gg FM</option>
                  </Select>
                </Field>
              </div>
              <Field label="Istituto di credito">
                <Input value={form.pagamento?.istituto ?? ''} onChange={e => set('pagamento.istituto', e.target.value)} placeholder="Banca Intesa" />
              </Field>
              <div className="grid grid-cols-3 gap-4">
                <Field label="ABI">
                  <Input value={form.pagamento?.abi ?? ''} onChange={e => set('pagamento.abi', e.target.value)} placeholder="01234" />
                </Field>
                <Field label="CAB">
                  <Input value={form.pagamento?.cab ?? ''} onChange={e => set('pagamento.cab', e.target.value)} placeholder="56789" />
                </Field>
                <Field label="C/C">
                  <Input value={form.pagamento?.cc ?? ''} onChange={e => set('pagamento.cc', e.target.value)} placeholder="000012345678" />
                </Field>
              </div>
              <Field label="IBAN">
                <Input value={form.pagamento?.iban ?? ''} onChange={e => set('pagamento.iban', e.target.value)} placeholder="IT60 X054 2811 1010 0000 0123 456" />
              </Field>
            </div>
          )}

          {sezione === 5 && (
            <div>
              <Field label="Note interne">
                <textarea
                  value={form.note ?? ''}
                  onChange={e => set('note', e.target.value)}
                  rows={6}
                  placeholder="Note interne sul cliente..."
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition resize-none placeholder:text-slate-300"
                />
              </Field>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
