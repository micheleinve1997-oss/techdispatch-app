import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, CalendarClock, MapPin, UserRound, Wrench } from 'lucide-react'
import { useNavigate, useParams } from 'react-router-dom'
import { interventiApi } from '../api/interventi'

function formatDate(value?: string) {
  if (!value) return '-'
  return new Intl.DateTimeFormat('it-IT', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(value))
}

function Field({ label, value }: { label: string; value?: string | number | null }) {
  return (
    <div className="border-b border-slate-100 py-3">
      <p className="text-xs uppercase font-semibold text-slate-400">{label}</p>
      <p className="text-sm text-slate-900 mt-1">{value || '-'}</p>
    </div>
  )
}

export default function InterventoDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { data: intervento, isLoading } = useQuery({
    queryKey: ['intervento', id],
    queryFn: () => interventiApi.get(id!),
    enabled: Boolean(id),
  })

  if (isLoading) return <div className="p-8 text-slate-400">Caricamento intervento...</div>
  if (!intervento) return <div className="p-8 text-slate-500">Intervento non trovato.</div>

  return (
    <div className="h-full overflow-auto bg-white">
      <div className="border-b border-slate-200 px-8 py-5 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <button onClick={() => navigate(-1)} className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-900 mb-3"><ArrowLeft size={16} /> Indietro</button>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-semibold text-slate-900">{intervento.titolo}</h1>
            <span className="text-xs font-mono px-2 py-1 rounded bg-slate-100 text-slate-600">{intervento.codice_intervento}</span>
          </div>
          <p className="text-sm text-slate-500 mt-1">{intervento.origine} ? {intervento.stato} ? priorita {intervento.priorita}</p>
        </div>
      </div>

      <div className="p-8 grid grid-cols-1 xl:grid-cols-[1fr_360px] gap-8">
        <section className="rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-5 py-4 bg-slate-50 border-b border-slate-200 flex items-center gap-2 font-semibold text-slate-800"><Wrench size={17} /> Dettaglio intervento</div>
          <div className="px-5 py-2">
            <Field label="Descrizione" value={intervento.descrizione} />
            <Field label="Note" value={intervento.note} />
            <Field label="Riferimento esterno" value={intervento.riferimento_esterno} />
            <Field label="Data richiesta" value={formatDate(intervento.data_richiesta)} />
            <Field label="Data pianificata" value={formatDate(intervento.data_pianificata)} />
          </div>
        </section>

        <aside className="space-y-5">
          <section className="rounded-xl border border-slate-200 overflow-hidden">
            <div className="px-5 py-4 bg-slate-50 border-b border-slate-200 flex items-center gap-2 font-semibold text-slate-800"><UserRound size={17} /> Assegnazione</div>
            <div className="px-5 py-2">
              <Field label="Cliente" value={intervento.cliente_nome} />
              <Field label="Codice cliente" value={intervento.cliente_codice} />
              <Field label="Tecnico" value={intervento.tecnico_nome} />
            </div>
          </section>

          <section className="rounded-xl border border-slate-200 overflow-hidden">
            <div className="px-5 py-4 bg-slate-50 border-b border-slate-200 flex items-center gap-2 font-semibold text-slate-800"><MapPin size={17} /> Luogo</div>
            <div className="px-5 py-2">
              <Field label="Indirizzo" value={intervento.indirizzo} />
              <Field label="CAP" value={intervento.cap} />
              <Field label="Citta" value={intervento.citta} />
              <Field label="Provincia" value={intervento.provincia} />
            </div>
          </section>

          <section className="rounded-xl border border-slate-200 px-5 py-4">
            <div className="flex items-center gap-2 text-slate-600"><CalendarClock size={17} /><span className="text-sm font-medium">Creato il {formatDate(intervento.created_at)}</span></div>
          </section>
        </aside>
      </div>
    </div>
  )
}
