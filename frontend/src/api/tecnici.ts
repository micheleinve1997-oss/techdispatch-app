import axios from 'axios'

const API_ORIGIN = import.meta.env.VITE_API_URL || 'https://techdispatch-api.onrender.com'
const baseURL = `${API_ORIGIN}/api`
const api = axios.create({ baseURL })

export type StatoTecnico = 'ATTIVO' | 'NON_DISPONIBILE' | 'IN_FERIE'
export type TipoPartenza = 'casa' | 'ditta'

export const SPECIALIZZAZIONI = [
  'Caldaie e riscaldamento',
  'Climatizzatori e pompe di calore',
  'Impianti idrici e termoidraulica',
  'Elettrico e domotica',
  'Energie rinnovabili',
  'Antincendio e sicurezza',
  'Ventilazione e UTA',
  'Ascensori e montacarichi',
]

export interface SedePartenza {
  tipo: TipoPartenza
  indirizzo?: string
  cap?: string
  citta?: string
  provincia?: string
  lat?: number
  lng?: number
}

export interface Indisponibilita {
  tipo: string
  data_inizio: string
  data_fine: string
  note?: string
}

export interface Tecnico {
  id: string
  codice_tecnico: string
  nome: string
  cognome: string
  telefono?: string
  email?: string
  specializzazioni: string[]
  sede_partenza?: SedePartenza
  patente: boolean
  mezzo_proprio: boolean
  stato: StatoTecnico
  note?: string
  zona_preferita?: string
  zone?: string[]
  competenze?: string[]
  ore_giornaliere?: number
  indisponibilita?: Indisponibilita[]
  attivo: boolean
  created_at: string
  updated_at: string
}

export type TecnicoCreate = Omit<Tecnico, 'id' | 'codice_tecnico' | 'attivo' | 'created_at' | 'updated_at'>

export const tecniciApi = {
  list: () => api.get<Tecnico[]>('/tecnici/').then(r => r.data),
  get: (id: string) => api.get<Tecnico>(`/tecnici/${id}`).then(r => r.data),
  create: (data: TecnicoCreate) => api.post<Tecnico>('/tecnici/', data).then(r => r.data),
  update: (id: string, data: Partial<TecnicoCreate>) => api.put<Tecnico>(`/tecnici/${id}`, data).then(r => r.data),
  updateStato: (id: string, stato: StatoTecnico) => api.patch(`/tecnici/${id}/stato`, { stato }),
  saveGeo: (id: string, lat: number, lng: number) => api.patch(`/tecnici/${id}/geo`, { lat, lng }),
  clearAll: () => api.delete<{ ok: boolean; eliminati: number }>('/tecnici/clear-all').then(r => r.data),
  delete: (id: string) => api.delete(`/tecnici/${id}`),
}
