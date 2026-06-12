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

export interface PropostaIntervento {
  id: string
  codice_intervento?: string
  titolo: string
  cliente_nome?: string
  cliente_id?: string
  priorita?: string
  origine?: string
  zona: string
  cap?: string
  durata_stimata: number
  viaggio_stimato?: number
  tempo_totale?: number
  motivazione?: string
  motivo?: string
}

export interface PropostaCell {
  date: string
  zona_dominante?: string | null
  ore_residue: number
  viaggio_totale?: number
  interventi: PropostaIntervento[]
}

export interface PropostaRow {
  tecnico: {
    id: string
    codice_tecnico: string
    nome: string
    cognome?: string
    cap_partenza?: string
    zona_preferita?: string
  }
  days: PropostaCell[]
}

export interface PlannerProposta {
  start: string
  days: string[]
  rows: PropostaRow[]
  non_pianificati: PropostaIntervento[]
  warnings: Array<{ tipo: string; messaggio: string; tecnico_id?: string; date?: string }>
  totali: {
    interventi_pool: number
    pianificati: number
    non_pianificati: number
    warnings: number
    viaggio_stimato_totale?: number
  }
}

export const pianificatoreApi = {
  overview: (start?: string) => api.get<PlannerOverview>('/pianificatore/overview', { params: start ? { start } : {} }).then(r => r.data),
  genera: (start?: string) => api.post<PlannerProposta>('/pianificatore/genera', null, { params: start ? { start } : {} }).then(r => r.data),
}

