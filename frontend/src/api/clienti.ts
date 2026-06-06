import axios from 'axios'

const API_ORIGIN = import.meta.env.VITE_API_URL || 'https://techdispatch-api.onrender.com'
const baseURL = `${API_ORIGIN}/api`

const api = axios.create({ baseURL })

export interface SedeLegale {
  indirizzo: string
  cap: string
  citta: string
  provincia: string
  telefono: string
  email: string
  pec?: string
}

export interface FatturazioneElettronica {
  codice_sdi?: string
  pec_fe?: string
}

export interface Contatto {
  ruolo: string
  nome: string
  telefono?: string
  email?: string
}

export interface Pagamento {
  metodo?: string
  condizioni?: string
  istituto?: string
  abi?: string
  cab?: string
  cc?: string
  iban?: string
}

export interface Cliente {
  id: string
  codice_cliente: string
  ragione_sociale: string
  codice_fiscale?: string
  partita_iva?: string
  sede_legale?: SedeLegale
  fatturazione_elettronica?: FatturazioneElettronica
  contatti?: Contatto[]
  pagamento?: Pagamento
  note?: string
  stato: 'BOZZA' | 'INCOMPLETO' | 'COMPLETO'
  attivo: boolean
  created_at: string
  updated_at: string
  lat?: number
  lng?: number
}

export type ClienteCreate = Omit<Cliente, 'id' | 'codice_cliente' | 'stato' | 'attivo' | 'created_at' | 'updated_at'>

export const clientiApi = {
  list: (stato?: string) =>
    api.get<Cliente[]>('/clienti/', { params: stato ? { stato } : {} }).then(r => r.data),

  get: (id: string) =>
    api.get<Cliente>(`/clienti/${id}`).then(r => r.data),

  create: (data: ClienteCreate) =>
    api.post<Cliente>('/clienti/', data).then(r => r.data),

  update: (id: string, data: Partial<ClienteCreate>) =>
    api.put<Cliente>(`/clienti/${id}`, data).then(r => r.data),

  delete: (id: string) =>
    api.delete(`/clienti/${id}`),

  saveGeo: (id: string, lat: number, lng: number) =>
    api.patch(`/clienti/${id}/geo`, { lat, lng }),
}

