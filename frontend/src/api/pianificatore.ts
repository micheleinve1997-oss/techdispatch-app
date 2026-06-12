import axios from 'axios'
import type { Indisponibilita } from './tecnici'

const API_ORIGIN = import.meta.env.VITE_API_URL || 'https://techdispatch-api.onrender.com'
const api = axios.create({ baseURL: `${API_ORIGIN}/api` })

export interface PlannerCell {
  date: string
  disponibile: boolean
  indisponibilita: Indisponibilita[]
  zona_preferita?: string
  ore_disponibili: number
  tickets: unknown[]
}

export interface PlannerRow {
  tecnico: {
    id: string
    codice_tecnico: string
    nome: string
    cognome?: string
    cap_partenza?: string
    zona_preferita?: string
    competenze: string[]
  }
  vincoli_attivi: number
  days: PlannerCell[]
}

export interface PlannerOverview {
  start: string
  days: string[]
  rows: PlannerRow[]
  vincoli_totali: number
}

export const pianificatoreApi = {
  overview: (start?: string) => api.get<PlannerOverview>('/pianificatore/overview', { params: start ? { start } : {} }).then(r => r.data),
}
