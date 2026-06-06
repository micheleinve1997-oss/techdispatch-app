import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { AlertCircle, ArrowLeft, CheckCircle, Download, FileSpreadsheet, RefreshCw, Upload } from 'lucide-react'
import axios from 'axios'

const baseURL = `${import.meta.env.VITE_API_URL || 'https://techdispatch-api.onrender.com'}/api`
const api = axios.create({ baseURL })

interface TemplateField {
  label: string
  field: string
  required: boolean
}

interface PreviewData {
  columns: string[]
  auto_mapping: Record<string, string>
  template_fields: TemplateField[]
  preview: Record<string, string>[]
  total_rows: number
}

interface ImportResult {
  importati: number
  saltati: number
  errori: string[]
}

export default function ImportInterventi() {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const fileRef = useRef<HTMLInputElement>(null)

  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<PreviewData | null>(null)
  const [mapping, setMapping] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<ImportResult | null>(null)
  const [step, setStep] = useState<'upload' | 'mapping' | 'done'>('upload')
  const [error, setError] = useState<string | null>(null)

  const downloadTemplate = () => {
    window.open(`${baseURL}/interventi/template`, '_blank')
  }

  const handleFile = async (f: File) => {
    setError(null)
    setFile(f)
    setLoading(true)
    try {
      const form = new FormData()
      form.append('file', f)
      const { data } = await api.post<PreviewData>('/interventi/preview-import', form, { timeout: 30000 })
      setPreview(data)
      setMapping(data.auto_mapping)
      setStep('mapping')
    } catch (err: unknown) {
      const msg = axios.isAxiosError(err) ? err.response?.data?.detail ?? err.message : 'Errore sconosciuto'
      setError(`Impossibile leggere il file: ${msg}`)
    } finally {
      setLoading(false)
    }
  }

  const handleImport = async () => {
    if (!file) return
    setError(null)
    setLoading(true)
    try {
      const form = new FormData()
      form.append('file', file)
      form.append('mapping', JSON.stringify(mapping))
      const { data } = await api.post<ImportResult>('/interventi/import', form, { timeout: 60000 })
      setResult(data)
      setStep('done')
      qc.invalidateQueries({ queryKey: ['interventi'] })
    } catch (err: unknown) {
      const msg = axios.isAxiosError(err) ? err.response?.data?.detail ?? err.message : 'Errore sconosciuto'
      setError(`Errore durante l'importazione: ${msg}`)
    } finally {
      setLoading(false)
    }
  }

  const reset = () => {
    setFile(null)
    setPreview(null)
    setMapping({})
    setResult(null)
    setStep('upload')
    setError(null)
    if (fileRef.current) fileRef.current.value = ''
  }

  return (
    <div className="flex flex-col h-full">
      <div className="px-8 py-5 border-b border-slate-200 bg-white flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/interventi')} className="p-1.5 hover:bg-slate-100 rounded-lg transition">
            <ArrowLeft size={18} className="text-slate-500" />
          </button>
          <h1 className="text-base font-semibold text-slate-900">Importa interventi</h1>
        </div>
      </div>

      <div className="flex-1 overflow-auto px-8 py-6">
        <div className="max-w-3xl space-y-5">
          {error && (
            <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
              <AlertCircle size={18} className="text-red-500 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-red-700">Errore</p>
                <p className="text-sm text-red-600 mt-0.5">{error}</p>
              </div>
              <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600 text-xs">x</button>
            </div>
          )}

          {step === 'upload' && (
            <div className="space-y-5">
              <div className="border border-blue-200 bg-blue-50 rounded-xl p-5 flex items-start gap-4">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center shrink-0">
                  <Download size={20} className="text-blue-600" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-slate-800">Scarica il template Excel</p>
                  <p className="text-sm text-slate-500 mt-0.5">
                    Usa il modello per manutenzioni programmate, ticket o interventi da preventivo accettato.
                  </p>
                  <button
                    onClick={downloadTemplate}
                    className="mt-3 inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition"
                  >
                    <Download size={15} />
                    Scarica template_interventi.xlsx
                  </button>
                </div>
              </div>

              <div>
                <p className="text-sm font-medium text-slate-700 mb-3">Carica il tuo file</p>
                <label
                  className={`flex flex-col items-center justify-center border-2 border-dashed rounded-xl p-10 cursor-pointer transition ${
                    loading
                      ? 'border-blue-300 bg-blue-50/40 cursor-wait'
                      : 'border-slate-300 hover:border-blue-400 bg-slate-50 hover:bg-blue-50/30'
                  }`}
                  onDragOver={e => e.preventDefault()}
                  onDrop={e => {
                    e.preventDefault()
                    if (loading) return
                    const f = e.dataTransfer.files[0]
                    if (f) handleFile(f)
                  }}
                >
                  {loading ? (
                    <>
                      <RefreshCw size={32} className="text-blue-500 animate-spin mb-3" />
                      <p className="text-sm font-medium text-blue-600">Lettura file in corso...</p>
                    </>
                  ) : (
                    <>
                      <Upload size={32} className="text-slate-400 mb-3" />
                      <p className="text-sm font-medium text-slate-600">Trascina il file qui oppure clicca per sceglierlo</p>
                      <p className="text-xs text-slate-400 mt-1">Excel (.xlsx) o CSV (.csv)</p>
                    </>
                  )}
                  <input
                    ref={fileRef}
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    className="hidden"
                    disabled={loading}
                    onChange={e => {
                      const f = e.target.files?.[0]
                      if (f) handleFile(f)
                    }}
                  />
                </label>
              </div>
            </div>
          )}

          {step === 'mapping' && preview && (
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <FileSpreadsheet size={20} className="text-emerald-500" />
                  <div>
                    <p className="font-medium text-slate-800">{file?.name}</p>
                    <p className="text-sm text-slate-500">{preview.total_rows} righe trovate</p>
                  </div>
                </div>
                <button onClick={reset} className="text-sm text-slate-500 hover:text-slate-700 underline underline-offset-2">
                  Cambia file
                </button>
              </div>

              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <div className="grid grid-cols-2 bg-slate-50 px-4 py-2.5 border-b border-slate-200">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Colonna nel file</p>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Campo TechDispatch</p>
                </div>
                <div className="divide-y divide-slate-100">
                  {preview.columns.map(col => (
                    <div key={col} className="grid grid-cols-2 items-center px-4 py-3">
                      <div>
                        <p className="text-sm font-medium text-slate-700">{col}</p>
                        {preview.preview[0]?.[col] && (
                          <p className="text-xs text-slate-400 mt-0.5 truncate">es. {preview.preview[0][col]}</p>
                        )}
                      </div>
                      <select
                        value={mapping[col] ?? ''}
                        onChange={e => setMapping(m => ({ ...m, [col]: e.target.value }))}
                        className="w-full px-3 py-1.5 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
                      >
                        <option value="">- Non importare -</option>
                        {preview.template_fields.map(f => (
                          <option key={f.field} value={f.field}>
                            {f.label}{f.required ? ' *' : ''}
                          </option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-3">
                <button onClick={reset} className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition">
                  Annulla
                </button>
                <button
                  onClick={handleImport}
                  disabled={loading || !Object.values(mapping).includes('titolo')}
                  className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white text-sm font-medium px-5 py-2 rounded-lg transition"
                >
                  {loading ? <RefreshCw size={15} className="animate-spin" /> : <Upload size={15} />}
                  Importa interventi
                </button>
              </div>
            </div>
          )}

          {step === 'done' && result && (
            <div className="border border-emerald-200 bg-emerald-50 rounded-xl p-6">
              <div className="flex items-center gap-3">
                <CheckCircle size={28} className="text-emerald-500" />
                <div>
                  <p className="font-semibold text-slate-800">Import completato</p>
                  <p className="text-sm text-slate-500 mt-0.5">
                    {result.importati} importati, {result.saltati} saltati
                  </p>
                </div>
              </div>
              {result.errori.length > 0 && (
                <div className="mt-4 bg-white/70 border border-amber-200 rounded-lg p-3 max-h-52 overflow-auto">
                  {result.errori.map((e, i) => <p key={i} className="text-xs text-amber-700 mb-1">{e}</p>)}
                </div>
              )}
              <div className="mt-5 flex gap-3">
                <button onClick={() => navigate('/interventi')} className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition">
                  Vai agli interventi
                </button>
                <button onClick={reset} className="text-sm text-slate-600 hover:bg-white/70 px-4 py-2 rounded-lg transition">
                  Importa altro file
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
