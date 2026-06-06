import axios from 'axios'

const API_ORIGIN = import.meta.env.VITE_API_URL || 'https://techdispatch-api.onrender.com'
const baseURL = `${API_ORIGIN}/api`
const api = axios.create({ baseURL })

export type OrigineIntervento = 'TICKET' | 'MANUTENZIONE' | 'PREVENTIVO_ACCETTATO' | 'MANUALE'
export type StatoIntervento = 'APERTO' | 'DA_PIANIFICARE' | 'PIANIFICATO' | 'IN_CORSO' | 'COMPLETATO' | 'ANNULLATO'
export type PrioritaIntervento = 'BASSA' | 'MEDIA' | 'ALTA' | 'URGENTE'

export interface Intervento {
  id: string
  codice_intervento: string
  titolo: string
  descrizione?: string
  origine: OrigineIntervento
  stato: StatoIntervento
  priorita: PrioritaIntervento
  cliente_id?: string
  cliente_codice?: string
  cliente_nome?: string
  tecnico_id?: string
  tecnico_nome?: string
  indirizzo?: string
  cap?: string
  citta?: string
  provincia?: string
  data_richiesta?: string
  data_pianificata?: string
  riferimento_esterno?: string
  note?: string
  attivo: boolean
  created_at: string
  updated_at: string
}

export type InterventoCreate = Omit<Intervento, 'id' | 'codice_intervento' | 'attivo' | 'created_at' | 'updated_at'>

export const interventiApi = {
  list: (params?: { stato?: string; origine?: string }) =>
    api.get<Intervento[]>('/interventi/', { params }).then(r => r.data),

  get: (id: string) =>
    api.get<Intervento>(`/interventi/${id}`).then(r => r.data),

  create: (data: InterventoCreate) =>
    api.post<Intervento>('/interventi/', data).then(r => r.data),

  update: (id: string, data: Partial<InterventoCreate>) =>
    api.put<Intervento>(`/interventi/${id}`, data).then(r => r.data),

  updateStato: (id: string, stato: StatoIntervento) =>
    api.patch(`/interventi/${id}/stato`, { stato }),

  delete: (id: string) =>
    api.delete(`/interventi/${id}`),
}
