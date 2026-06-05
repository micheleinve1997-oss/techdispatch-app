import { useState, useEffect, useCallback } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Trash2, Pencil } from 'lucide-react'
import { clientiApi, type ClienteCreate, type Contatto } from '../api/clienti'
import StatoBadge from '../components/StatoBadge'
import DuplicatoAlert from '../components/DuplicatoAlert'
import { SkeletonForm } from '../components/Skeleton'
import { useToolbar } from '../context/ToolbarContext'

const baseURL = import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL}/api` : '/api'
const SEZIONI = ['Anagrafica', 'Sede Legale', 'Fatturazione', 'Contatti', 'Pagamento', 'Note']

// Campo in sola lettura
function ReadField({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <p className="text-xs font-medium text-slate-400 mb-1">{label}</p>
      <p className="text-sm text-slate-800 py-1.5 min-h-[34px]">
        {value || <span className="text-slate-300 italic">—</span>}
      </p>
    </div>
  )
}

// Campo editabile
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
    <input {...props}
      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition placeholder:text-slate-300"
    />
  )
}

function Select({ children, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select {...props} className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition">
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

export default function ClienteForm() {
  const { id } = useParams()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const { setActions, clearActions } = useToolbar()
  const isNew = id === 'nuovo' || id === undefined
  const [sezione, setSezione] = useState(0)
  const [form, setForm] = useState<ClienteCreate>(emptyForm())
  const [editMode, setEditMode] = useState(isNew) // nuovo cliente = subito in modifica
  const [formDirty, setFormDirty] = useState(false)
  const [duplicato, setDuplicato] = useState<{ cliente: { id: string; codice_cliente: string; ragione_sociale: string }; campo: string } | null>(null)

  const { data: cliente, isLoading } = useQuery({
    queryKey: ['cliente', id],
    queryFn: () => clientiApi.get(id!),
    enabled: !isNew,
  })

  // Quando cambia cliente, torna in visualizzazione
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
      setEditMode(false)
      setFormDirty(false)
    }
  }, [cliente])

  const checkDuplicato = useCallback(async (campo: 'partita_iva' | 'codice_fiscale', valore: string) => {
    if (!valore || valore.length < 5) return
    try {
      const params = new URLSearchParams({ [campo]: valore })
      if (!isNew && id) params.append('escludi_id', id)
      const res = await fetch(`${baseURL}/clienti/check-duplicato?${params}`)
      const data = await res.json()
      if (data.duplicato) setDuplicato({ cliente: data.cliente, campo: campo === 'partita_iva' ? 'Partita IVA' : 'Codice Fiscale' })
      else setDuplicato(null)
    } catch { /* silenzioso */ }
  }, [isNew, id])

  const saveMutation = useMutation({
    mutationFn: () => isNew ? clientiApi.create(form) : clientiApi.update(id!, form),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['clienti'] })
      setFormDirty(false)
      setEditMode(false)
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

  const resetForm = useCallback(() => {
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
      setEditMode(false)
      setFormDirty(false)
    }
  }, [cliente])

  // Registra azioni toolbar
  useEffect(() => {
    setActions({
      editMode,
      onEdit: () => setEditMode(true),
      canEdit: !isNew && !editMode,
      onSave: () => saveMutation.mutate(),
      onDelete: isNew ? undefined : () => {
        if (confirm(`Eliminare ${cliente?.ragione_sociale}?`)) deleteMutation.mutate()
      },
      onReset: resetForm,
      canSave: !!form.ragione_sociale,
      canDelete: !isNew,
      canReset: formDirty,
      isSaving: saveMutation.isPending,
    })
    return () => clearActions()
  }, [form.ragione_sociale, formDirty, isNew, editMode, saveMutation.isPending, cliente, resetForm])

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

  const addContatto = () => { setFormDirty(true); setForm(p => ({ ...p, contatti: [...(p.contatti ?? []), { ruolo: 'manutenzione', nome: '', telefono: '', email: '' }] })) }
  const removeContatto = (i: number) => { setFormDirty(true); setForm(p => ({ ...p, contatti: p.contatti?.filter((_, idx) => idx !== i) })) }
  const setContatto = (i: number, field: keyof Contatto, value: string) => {
    setFormDirty(true)
    setForm(p => { const c = [...(p.contatti ?? [])]; c[i] = { ...c[i], [field]: value }; return { ...p, contatti: c } })
  }

  if (isLoading) return (
    <div className="p-8 max-w-2xl"><div className="h-6 bg-slate-200 rounded w-40 mb-6 animate-pulse" /><SkeletonForm /></div>
  )

  return (
    <div className="flex flex-col h-full">
      {/* Intestazione */}
      <div className="px-8 py-3 border-b border-slate-200 bg-white flex items-center justify-between">
        <div>
          <h1 className="text-base font-semibold text-slate-900">
            {isNew ? 'Nuovo cliente' : (cliente?.ragione_sociale ?? '...')}
          </h1>
          {editMode && !isNew && (
            <p className="text-xs text-blue-600 mt-0.5 flex items-center gap-1">
              <Pencil size={11} /> Modalità modifica attiva
            </p>
          )}
        </div>
        {!isNew && cliente && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 font-mono">{cliente.codice_cliente}</span>
            <StatoBadge stato={cliente.stato} />
            {!editMode && (
              <button
                onClick={() => setEditMode(true)}
                className="flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-700 border border-blue-200 hover:border-blue-400 bg-blue-50 hover:bg-blue-100 px-2.5 py-1 rounded-lg transition font-medium"
              >
                <Pencil size={13} />
                Modifica
              </button>
            )}
          </div>
        )}
      </div>

      {/* Tab sezioni */}
      <div className="px-8 border-b border-slate-200 bg-white">
        <div className="flex overflow-x-auto">
          {SEZIONI.map((s, i) => (
            <button key={s} onClick={() => setSezione(i)}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                sezione === i ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}>
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Contenuto */}
      <div className="flex-1 overflow-auto px-8 py-6">
        <div className="max-w-2xl">

          {/* SEZIONE 0 — Anagrafica */}
          {sezione === 0 && (
            <div className="space-y-4">
              {editMode ? (
                <>
                  <Field label="Ragione Sociale" required>
                    <Input value={form.ragione_sociale} onChange={e => set('ragione_sociale', e.target.value)} placeholder="Es. Rossi SpA" />
                  </Field>
                  <div className="grid grid-cols-2 gap-4">
                    <Field label="Codice Fiscale">
                      <Input value={form.codice_fiscale ?? ''} onChange={e => set('codice_fiscale', e.target.value)} onBlur={e => checkDuplicato('codice_fiscale', e.target.value)} placeholder="12345678901" />
                    </Field>
                    <Field label="Partita IVA">
                      <Input value={form.partita_iva ?? ''} onChange={e => set('partita_iva', e.target.value)} onBlur={e => checkDuplicato('partita_iva', e.target.value)} placeholder="IT12345678901" />
                    </Field>
                  </div>
                  {duplicato && <DuplicatoAlert cliente={duplicato.cliente} campo={duplicato.campo} onClose={() => setDuplicato(null)} />}
                </>
              ) : (
                <div className="grid grid-cols-2 gap-x-8 gap-y-2">
                  <ReadField label="Ragione Sociale" value={form.ragione_sociale} />
                  <div />
                  <ReadField label="Codice Fiscale" value={form.codice_fiscale} />
                  <ReadField label="Partita IVA" value={form.partita_iva} />
                </div>
              )}
            </div>
          )}

          {/* SEZIONE 1 — Sede Legale */}
          {sezione === 1 && (
            editMode ? (
              <div className="space-y-4">
                <Field label="Indirizzo"><Input value={form.sede_legale?.indirizzo ?? ''} onChange={e => set('sede_legale.indirizzo', e.target.value)} placeholder="Via Roma 1" /></Field>
                <div className="grid grid-cols-3 gap-4">
                  <Field label="CAP"><Input value={form.sede_legale?.cap ?? ''} onChange={e => set('sede_legale.cap', e.target.value)} placeholder="20100" maxLength={5} /></Field>
                  <Field label="Città"><Input value={form.sede_legale?.citta ?? ''} onChange={e => set('sede_legale.citta', e.target.value)} placeholder="Milano" /></Field>
                  <Field label="Provincia"><Input value={form.sede_legale?.provincia ?? ''} onChange={e => set('sede_legale.provincia', e.target.value)} placeholder="MI" maxLength={2} /></Field>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Telefono"><Input value={form.sede_legale?.telefono ?? ''} onChange={e => set('sede_legale.telefono', e.target.value)} placeholder="+39 02 1234567" /></Field>
                  <Field label="Email"><Input type="email" value={form.sede_legale?.email ?? ''} onChange={e => set('sede_legale.email', e.target.value)} placeholder="info@azienda.it" /></Field>
                </div>
                <Field label="PEC"><Input value={form.sede_legale?.pec ?? ''} onChange={e => set('sede_legale.pec', e.target.value)} placeholder="pec@azienda.it" /></Field>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-x-8 gap-y-2">
                <ReadField label="Indirizzo" value={form.sede_legale?.indirizzo} />
                <ReadField label="CAP / Città / Provincia" value={[form.sede_legale?.cap, form.sede_legale?.citta, form.sede_legale?.provincia].filter(Boolean).join(' · ')} />
                <ReadField label="Telefono" value={form.sede_legale?.telefono} />
                <ReadField label="Email" value={form.sede_legale?.email} />
                <ReadField label="PEC" value={form.sede_legale?.pec} />
              </div>
            )
          )}

          {/* SEZIONE 2 — Fatturazione */}
          {sezione === 2 && (
            editMode ? (
              <div className="space-y-4">
                <Field label="Codice SDI"><Input value={form.fatturazione_elettronica?.codice_sdi ?? ''} onChange={e => set('fatturazione_elettronica.codice_sdi', e.target.value)} placeholder="XXXXXXX" maxLength={7} /></Field>
                <Field label="PEC Fatturazione"><Input type="email" value={form.fatturazione_elettronica?.pec_fe ?? ''} onChange={e => set('fatturazione_elettronica.pec_fe', e.target.value)} placeholder="fe@azienda.it" /></Field>
                <p className="text-xs text-slate-400">Almeno uno tra Codice SDI e PEC FE è richiesto per fatturare.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-x-8 gap-y-2">
                <ReadField label="Codice SDI" value={form.fatturazione_elettronica?.codice_sdi} />
                <ReadField label="PEC Fatturazione" value={form.fatturazione_elettronica?.pec_fe} />
              </div>
            )
          )}

          {/* SEZIONE 3 — Contatti */}
          {sezione === 3 && (
            <div className="space-y-4">
              {editMode && (
                <div className="flex justify-end">
                  <button onClick={addContatto} className="text-xs text-blue-600 hover:text-blue-700 font-medium">+ Aggiungi contatto</button>
                </div>
              )}
              {(form.contatti ?? []).length === 0 && (
                <p className="text-sm text-slate-400 py-4 text-center">Nessun contatto aggiunto</p>
              )}
              {(form.contatti ?? []).map((c, i) => (
                <div key={i} className="border border-slate-200 rounded-xl p-4 space-y-3 bg-slate-50/50">
                  {editMode ? (
                    <>
                      <div className="flex items-center justify-between">
                        <Select value={c.ruolo} onChange={e => setContatto(i, 'ruolo', e.target.value)} className="w-48">
                          <option value="manutenzione">Resp. Manutenzione</option>
                          <option value="acquisti">Resp. Acquisti</option>
                          <option value="amministrativo">Resp. Amministrativo</option>
                          <option value="legale">Legale Rappresentante</option>
                        </Select>
                        <button onClick={() => removeContatto(i)} className="p-1.5 text-slate-400 hover:text-red-500 rounded"><Trash2 size={14} /></button>
                      </div>
                      <div className="grid grid-cols-3 gap-3">
                        <Field label="Nome"><Input value={c.nome} onChange={e => setContatto(i, 'nome', e.target.value)} /></Field>
                        <Field label="Telefono"><Input value={c.telefono ?? ''} onChange={e => setContatto(i, 'telefono', e.target.value)} /></Field>
                        <Field label="Email"><Input value={c.email ?? ''} onChange={e => setContatto(i, 'email', e.target.value)} /></Field>
                      </div>
                    </>
                  ) : (
                    <div className="grid grid-cols-4 gap-4">
                      <ReadField label="Ruolo" value={c.ruolo} />
                      <ReadField label="Nome" value={c.nome} />
                      <ReadField label="Telefono" value={c.telefono} />
                      <ReadField label="Email" value={c.email} />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* SEZIONE 4 — Pagamento */}
          {sezione === 4 && (
            editMode ? (
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
                <Field label="Istituto di credito"><Input value={form.pagamento?.istituto ?? ''} onChange={e => set('pagamento.istituto', e.target.value)} /></Field>
                <div className="grid grid-cols-3 gap-4">
                  <Field label="ABI"><Input value={form.pagamento?.abi ?? ''} onChange={e => set('pagamento.abi', e.target.value)} /></Field>
                  <Field label="CAB"><Input value={form.pagamento?.cab ?? ''} onChange={e => set('pagamento.cab', e.target.value)} /></Field>
                  <Field label="C/C"><Input value={form.pagamento?.cc ?? ''} onChange={e => set('pagamento.cc', e.target.value)} /></Field>
                </div>
                <Field label="IBAN"><Input value={form.pagamento?.iban ?? ''} onChange={e => set('pagamento.iban', e.target.value)} /></Field>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-x-8 gap-y-2">
                <ReadField label="Metodo pagamento" value={form.pagamento?.metodo} />
                <ReadField label="Condizioni" value={form.pagamento?.condizioni} />
                <ReadField label="Istituto" value={form.pagamento?.istituto} />
                <ReadField label="IBAN" value={form.pagamento?.iban} />
                <ReadField label="ABI" value={form.pagamento?.abi} />
                <ReadField label="CAB / C/C" value={[form.pagamento?.cab, form.pagamento?.cc].filter(Boolean).join(' / ')} />
              </div>
            )
          )}

          {/* SEZIONE 5 — Note */}
          {sezione === 5 && (
            editMode ? (
              <Field label="Note interne">
                <textarea value={form.note ?? ''} onChange={e => set('note', e.target.value)} rows={6} placeholder="Note interne sul cliente..."
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition resize-none placeholder:text-slate-300" />
              </Field>
            ) : (
              <ReadField label="Note interne" value={form.note} />
            )
          )}

        </div>
      </div>
    </div>
  )
}
