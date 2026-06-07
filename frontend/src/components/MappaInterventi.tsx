import { useEffect, useRef, useState } from 'react'
import { AlertCircle, Loader2, MapPin } from 'lucide-react'
import type { Intervento } from '../api/interventi'
import { interventiApi } from '../api/interventi'
import type { Tecnico } from '../api/tecnici'
import { tecniciApi } from '../api/tecnici'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

import iconUrl from 'leaflet/dist/images/marker-icon.png'
import iconRetinaUrl from 'leaflet/dist/images/marker-icon-2x.png'
import shadowUrl from 'leaflet/dist/images/marker-shadow.png'

delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl
L.Icon.Default.mergeOptions({ iconUrl, iconRetinaUrl, shadowUrl })

interface GeoIntervento extends Intervento {
  lat: number
  lng: number
}

interface GeoTecnico extends Tecnico {
  lat: number
  lng: number
}

interface Props {
  interventi: Intervento[]
  tecnici: Tecnico[]
  isVisible: boolean
}

const GEO_INTERVENTI_KEY = 'td_geo_interventi_cache'
const GEO_TECNICI_KEY = 'td_geo_tecnici_cache'

function loadCache(key: string): Record<string, { lat: number; lng: number }> {
  try { return JSON.parse(localStorage.getItem(key) || '{}') } catch { return {} }
}

function saveCache(key: string, id: string, lat: number, lng: number) {
  const cache = loadCache(key)
  cache[id] = { lat, lng }
  localStorage.setItem(key, JSON.stringify(cache))
}

function formatDate(value?: string) {
  if (!value) return 'Non pianificato'
  return new Intl.DateTimeFormat('it-IT', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(value))
}

function initials(t: Tecnico) {
  return `${t.nome.charAt(0)}${t.cognome.charAt(0)}`.toUpperCase()
}

function makeTechIcon(t: Tecnico) {
  return L.divIcon({
    className: '',
    html: `<div style="width:30px;height:30px;border-radius:999px;background:#0f766e;color:white;border:2px solid white;box-shadow:0 2px 7px rgba(15,23,42,.28);display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700">${initials(t)}</div>`,
    iconSize: [30, 30],
    iconAnchor: [15, 15],
    popupAnchor: [0, -14],
  })
}

async function geocodeAddress(parts: Array<string | undefined | null>): Promise<{ lat: number; lng: number } | null> {
  const queries = [
    [parts[0], parts[1], parts[2], 'Italia'].filter(Boolean).join(', '),
    [parts[2], parts[3], 'Italia'].filter(Boolean).join(', '),
    [parts[1], 'Italia'].filter(Boolean).join(', '),
  ].filter(q => q.replace(/,\s*/g, '').trim().length > 0)

  for (const q of queries) {
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=1&countrycodes=it`,
        { headers: { 'Accept-Language': 'it' } }
      )
      const data = await res.json()
      if (data[0]) return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) }
    } catch { /* ignore */ }
  }
  return null
}

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms))

function resolveInterventiGeo(interventi: Intervento[]): { geo: GeoIntervento[]; senza: Intervento[] } {
  const cache = loadCache(GEO_INTERVENTI_KEY)
  const geo: GeoIntervento[] = []
  const senza: Intervento[] = []

  for (const i of interventi) {
    if (typeof i.lat === 'number' && typeof i.lng === 'number') {
      geo.push(i as GeoIntervento)
      saveCache(GEO_INTERVENTI_KEY, i.id, i.lat, i.lng)
      continue
    }

    const cached = cache[i.id]
    if (cached) {
      geo.push({ ...i, lat: cached.lat, lng: cached.lng })
      continue
    }

    if (i.citta || i.indirizzo || i.cap) senza.push(i)
  }

  return { geo, senza }
}

function resolveTecniciGeo(tecnici: Tecnico[]): { geo: GeoTecnico[]; senza: Tecnico[] } {
  const cache = loadCache(GEO_TECNICI_KEY)
  const geo: GeoTecnico[] = []
  const senza: Tecnico[] = []

  for (const t of tecnici) {
    const dbLat = t.sede_partenza?.lat
    const dbLng = t.sede_partenza?.lng
    if (typeof dbLat === 'number' && typeof dbLng === 'number') {
      geo.push({ ...t, lat: dbLat, lng: dbLng })
      saveCache(GEO_TECNICI_KEY, t.id, dbLat, dbLng)
      continue
    }

    const cached = cache[t.id]
    if (cached) {
      geo.push({ ...t, lat: cached.lat, lng: cached.lng })
      continue
    }

    const hasSede = t.sede_partenza?.citta || t.sede_partenza?.indirizzo || t.sede_partenza?.cap
    if (hasSede) senza.push(t)
  }

  return { geo, senza }
}

export default function MappaInterventi({ interventi, tecnici, isVisible }: Props) {
  const mapRef = useRef<HTMLDivElement>(null)
  const leafletMap = useRef<L.Map | null>(null)
  const markersRef = useRef<L.Marker[]>([])

  const { geo: interventiGiaGeo, senza: interventiDaCodificare } = resolveInterventiGeo(interventi)
  const { geo: tecniciGiaGeo, senza: tecniciDaCodificare } = resolveTecniciGeo(tecnici)

  const [extraInterventiGeo, setExtraInterventiGeo] = useState<GeoIntervento[]>([])
  const [extraTecniciGeo, setExtraTecniciGeo] = useState<GeoTecnico[]>([])
  const [loading, setLoading] = useState(false)
  const [progress, setProgress] = useState(0)

  const interventiGeo: GeoIntervento[] = [
    ...interventiGiaGeo,
    ...extraInterventiGeo.filter(e => !interventiGiaGeo.find(g => g.id === e.id)),
  ]

  const tecniciGeo: GeoTecnico[] = [
    ...tecniciGiaGeo,
    ...extraTecniciGeo.filter(e => !tecniciGiaGeo.find(g => g.id === e.id)),
  ]

  useEffect(() => {
    if (!isVisible) return
    if (!mapRef.current) return
    if (leafletMap.current) {
      setTimeout(() => leafletMap.current?.invalidateSize(), 50)
      addMarkers(interventiGeo, tecniciGeo)
      return
    }
    const init = () => {
      if (!mapRef.current) return
      const { offsetWidth, offsetHeight } = mapRef.current
      if (offsetWidth === 0 || offsetHeight === 0) { requestAnimationFrame(init); return }
      leafletMap.current = L.map(mapRef.current, { center: [45.5, 9.2], zoom: 8 })
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 19,
      }).addTo(leafletMap.current)
      if (interventiGeo.length > 0 || tecniciGeo.length > 0) {
        setTimeout(() => addMarkers(interventiGeo, tecniciGeo), 100)
      }
    }
    requestAnimationFrame(init)
    return () => { leafletMap.current?.remove(); leafletMap.current = null }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isVisible])

  useEffect(() => {
    if (leafletMap.current && (interventiGeo.length > 0 || tecniciGeo.length > 0)) {
      addMarkers(interventiGeo, tecniciGeo)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [interventiGeo.length, tecniciGeo.length])

  const addMarkers = (interventiList: GeoIntervento[], tecniciList: GeoTecnico[]) => {
    const map = leafletMap.current
    if (!map) return
    markersRef.current.forEach(m => m.remove())
    markersRef.current = []

    interventiList.forEach(i => {
      const popup = L.popup({ closeButton: false, minWidth: 220 }).setContent(`
        <div style="font-family:system-ui,sans-serif">
          <p style="font-weight:600;font-size:13px;margin:0 0 2px;color:#0f172a">${i.titolo}</p>
          <p style="font-size:11px;color:#64748b;margin:0 0 6px">${i.codice_intervento} · ${i.stato}</p>
          ${i.cliente_nome ? `<p style="font-size:12px;color:#475569;margin:0 0 4px">Cliente: ${i.cliente_nome}</p>` : ''}
          ${i.citta ? `<p style="font-size:12px;color:#475569;margin:0 0 4px">Localita: ${i.citta}${i.provincia ? ` (${i.provincia})` : ''}</p>` : ''}
          <p style="font-size:12px;color:#475569;margin:0">Scadenza: ${formatDate(i.data_pianificata)}</p>
        </div>
      `)
      const marker = L.marker([i.lat, i.lng]).addTo(map).bindPopup(popup)
      markersRef.current.push(marker)
    })

    tecniciList.forEach(t => {
      const sp = t.sede_partenza
      const popup = L.popup({ closeButton: false, minWidth: 200 }).setContent(`
        <div style="font-family:system-ui,sans-serif">
          <p style="font-weight:600;font-size:13px;margin:0 0 2px;color:#0f172a">${t.cognome} ${t.nome}</p>
          <p style="font-size:11px;color:#64748b;margin:0 0 6px">${t.codice_tecnico} · partenza tecnico</p>
          ${sp?.citta ? `<p style="font-size:12px;color:#475569;margin:0">Sede: ${sp.citta}${sp.provincia ? ` (${sp.provincia})` : ''}</p>` : ''}
        </div>
      `)
      const marker = L.marker([t.lat, t.lng], { icon: makeTechIcon(t) }).addTo(map).bindPopup(popup)
      markersRef.current.push(marker)
    })

    if (markersRef.current.length === 1) {
      const markerLatLng = markersRef.current[0].getLatLng()
      map.setView(markerLatLng, 13)
    } else if (markersRef.current.length > 1) {
      map.fitBounds(L.featureGroup(markersRef.current).getBounds().pad(0.15))
    }
  }

  const runGeocode = async () => {
    setLoading(true)
    setProgress(0)
    const nuoviInterventi: GeoIntervento[] = []
    const nuoviTecnici: GeoTecnico[] = []
    const total = interventiDaCodificare.length + tecniciDaCodificare.length
    let done = 0

    for (let i = 0; i < interventiDaCodificare.length; i++) {
      const intervento = interventiDaCodificare[i]
      const coords = await geocodeAddress([intervento.indirizzo, intervento.cap, intervento.citta, intervento.provincia])
      if (coords) {
        saveCache(GEO_INTERVENTI_KEY, intervento.id, coords.lat, coords.lng)
        interventiApi.saveGeo(intervento.id, coords.lat, coords.lng).catch(() => {})
        nuoviInterventi.push({ ...intervento, lat: coords.lat, lng: coords.lng })
      }
      done += 1
      setProgress(done)
      if (done < total) await sleep(1200)
    }

    for (let i = 0; i < tecniciDaCodificare.length; i++) {
      const tecnico = tecniciDaCodificare[i]
      const sp = tecnico.sede_partenza
      const coords = await geocodeAddress([sp?.indirizzo, sp?.cap, sp?.citta, sp?.provincia])
      if (coords) {
        saveCache(GEO_TECNICI_KEY, tecnico.id, coords.lat, coords.lng)
        tecniciApi.saveGeo(tecnico.id, coords.lat, coords.lng).catch(() => {})
        nuoviTecnici.push({ ...tecnico, lat: coords.lat, lng: coords.lng })
      }
      done += 1
      setProgress(done)
      if (done < total) await sleep(1200)
    }

    setExtraInterventiGeo(prev => [...prev, ...nuoviInterventi])
    setExtraTecniciGeo(prev => [...prev, ...nuoviTecnici])
    setLoading(false)
  }

  const totaleInterventiConIndirizzo = interventi.filter(i => i.citta || i.indirizzo || i.cap).length
  const totaleTecniciConSede = tecnici.filter(t => t.sede_partenza?.citta || t.sede_partenza?.indirizzo || t.sede_partenza?.cap).length
  const totaleDaCodificare = interventiDaCodificare.length + tecniciDaCodificare.length
  const totaleMappa = interventiGeo.length + tecniciGeo.length
  const totaleConIndirizzo = totaleInterventiConIndirizzo + totaleTecniciConSede

  return (
    <div className="flex flex-col" style={{ height: '100%' }}>
      <div className="px-6 py-2.5 border-b border-slate-100 bg-slate-50 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3 text-sm text-slate-500">
          <MapPin size={15} className="text-blue-500" />
          <span>
            {totaleMappa} marker sulla mappa
            <span className="ml-2 text-slate-400">
              {interventiGeo.length}/{totaleInterventiConIndirizzo} interventi · {tecniciGeo.length}/{totaleTecniciConSede} tecnici
            </span>
            {totaleDaCodificare > 0 && !loading && (
              <span className="ml-1 text-amber-600">· {totaleDaCodificare} senza coordinate</span>
            )}
          </span>
          {tecniciGeo.length > 0 && (
            <span className="hidden md:inline-flex items-center gap-1 text-xs text-slate-400">
              <span className="w-2.5 h-2.5 rounded-full bg-teal-700" />
              partenza tecnici
            </span>
          )}
        </div>

        {totaleDaCodificare > 0 && !loading && (
          <button
            onClick={runGeocode}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
          >
            <MapPin size={15} />
            Geocodifica {totaleDaCodificare} posizioni
          </button>
        )}

        {loading && (
          <div className="flex items-center gap-3 text-sm text-slate-500">
            <Loader2 size={15} className="animate-spin text-blue-500" />
            <span>Geocodifica {progress}/{totaleDaCodificare}...</span>
            <div className="w-36 h-1.5 bg-slate-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-500 rounded-full transition-all duration-300"
                style={{ width: `${totaleDaCodificare > 0 ? (progress / totaleDaCodificare) * 100 : 0}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {totaleConIndirizzo === 0 && (
        <div className="flex-1 flex flex-col items-center justify-center gap-3 text-slate-400">
          <AlertCircle size={36} />
          <p className="text-sm">Nessun intervento o tecnico ha un indirizzo configurato.</p>
        </div>
      )}

      <div ref={mapRef} style={{ flex: 1, minHeight: 0, width: '100%' }} />
    </div>
  )
}
