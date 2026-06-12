import axios from 'axios'

const API_ORIGIN = import.meta.env.VITE_API_URL || 'https://techdispatch-api.onrender.com'
const api = axios.create({ baseURL: `${API_ORIGIN}/api` })

export interface Vincolo {
  id: string
  tecnico_id: string
  cliente_id: string
  tipo: 'BLOCCO' | 'PREFERENZA'
  motivo?: string
  attivo: boolean
  tecnico?: { id: string; codice_tecnico: string; nome: string; cognome?: string }
  cliente?: { id: string; codice_cliente: string; ragione_sociale: string; partita_iva?: string; codice_fiscale?: string }
}

export const vincoliApi = {
  list: () => api.get<Vincolo[]>('/vincoli/').then(r => r.data),
  create: (data: { tecnico_id: string; cliente_id: string; tipo: string; motivo?: string }) => api.post<Vincolo>('/vincoli/', data).then(r => r.data),
  delete: (id: string) => api.delete(`/vincoli/${id}`),
}
