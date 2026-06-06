import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { MapPin, Loader2, AlertCircle } from 'lucide-react'
import type { Tecnico } from '../api/tecnici'
import { tecniciApi } from '../api/tecnici'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

import iconUrl from 'leaflet/dist/images/marker-icon.png'
import iconRetinaUrl from 'leaflet/dist/images/marker-icon-2x.png'
import shadowUrl from 'leaflet/dist/images/marker-shadow.png'

delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl
L.Icon.Default.mergeOptions({ iconUrl, iconRetinaUrl, shadowUrl })

interface GeoTecnico extends Tecnico {
  lat: number
  lng: number
}

interface Props {
  tecnici: Tecnico[]
  isVisible: boolean
}

const GEO_KEY = 'td_geo_tecnici_cache'

function loadCache(): Record<string, { lat: number; lng: number }> {
  try { return JSON.parse(localStorage.getItem(GEO_KEY) || '{}') } catch { return {} }
}

function saveCache(id: string, lat: number, lng: number) {
  const cache = loadCache()
  cache[id] = { lat, lng }
  localStorage.setItem(GEO_KEY, JSON.stringify(cache))
}

async function geocodeTecnico(t: Tecnico): Promise<{ lat: number; lng: number } | null> {
  const sp = t.sede_partenza
  if (!sp) return null
  const queries = [
    [sp.indirizzo, sp.cap, sp.citta, 'Italia'].filter(Boolean).join(', '),
    [sp.citta, sp.provincia, 'Italia'].filter(Boolean).join(', '),
    [sp.cap, 'Italia'].filter(Boolean).join(', '),
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

function resolveGeo(tecnici: Tecnico[]): { geo: GeoTecnico[]; senza: Tecnico[] } {
  const cache = loadCache()
  const geo: GeoTecnico[] = []
  const senza: Tecnico[] = []

  for (const t of tecnici) {
    const dbLat = t.sede_partenza?.lat
    const dbLng = t.sede_partenza?.lng
    if (typeof dbLat === 'number' && typeof dbLng === 'number') {
      geo.push({ ...t, lat: dbLat, lng: dbLng })
      saveCache(t.id, dbLat, dbLng)
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

export default function MappaTecnici({ tecnici, isVisible }: Props) {
  const mapRef = useRef<HTMLDivElement>(null)
  const leafletMap = useRef<L.Map | null>(null)
  const markersRef = useRef<L.Marker[]>([])
  const navigate = useNavigate()

  const { geo: giaGeo, senza: daCodificare } = resolveGeo(tecnici)

  const [extraGeo, setExtraGeo] = useState<GeoTecnico[]>([])
  const [loading, setLoading] = useState(false)
  const [progress, setProgress] = useState(0)

  const tuttiGeo: GeoTecnico[] = [
    ...giaGeo,
    ...extraGeo.filter(e => !giaGeo.find(g => g.id === e.id)),
  ]

  useEffect(() => {
    if (!isVisible) return
    if (!mapRef.current) return
    if (leafletMap.current) {
      setTimeout(() => leafletMap.current?.invalidateSize(), 50)
      addMarkers(tuttiGeo)
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
      if (tuttiGeo.length > 0) setTimeout(() => addMarkers(tuttiGeo), 100)
    }
    requestAnimationFrame(init)
    return () => { leafletMap.current?.remove(); leafletMap.current = null }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isVisible])

  useEffect(() => {
    if (leafletMap.current && tuttiGeo.length > 0) addMarkers(tuttiGeo)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tuttiGeo.length])

  const addMarkers = (list: GeoTecnico[]) => {
    const map = leafletMap.current
    if (!map) return
    markersRef.current.forEach(m => m.remove())
    markersRef.current = []
    list.forEach(t => {
      const sp = t.sede_partenza
      const popup = L.popup({ closeButton: false, minWidth: 190 }).setContent(`
        <div style="font-family:system-ui,sans-serif">
          <p style="font-weight:600;font-size:13px;margin:0 0 2px;color:#0f172a">${t.cognome} ${t.nome}</p>
          <p style="font-size:11px;color:#64748b;margin:0 0 6px">${t.codice_tecnico}</p>
          ${sp?.citta ? `<p style="font-size:12px;color:#475569;margin:0 0 8px">📍 ${sp.citta}${sp.provincia ? ` (${sp.provincia})` : ''}</p>` : ''}
          <button id="go-${t.id}" style="background:#2563eb;color:#fff;border:none;border-radius:6px;padding:5px 12px;font-size:12px;cursor:pointer;width:100%;font-weight:500">
            Apri scheda →
          </button>
        </div>
      `)
      const marker = L.marker([t.lat, t.lng]).addTo(map).bindPopup(popup)
      marker.on('popupopen', () => {
        setTimeout(() => {
          document.getElementById(`go-${t.id}`)?.addEventListener('click', () => navigate(`/tecnici/${t.id}`))
        }, 30)
      })
      markersRef.current.push(marker)
    })
    if (list.length === 1) {
      map.setView([list[0].lat, list[0].lng], 13)
    } else if (list.length > 1) {
      map.fitBounds(L.featureGroup(markersRef.current).getBounds().pad(0.15))
    }
  }

  const runGeocode = async () => {
    setLoading(true)
    setProgress(0)
    const nuovi: GeoTecnico[] = []
    for (let i = 0; i < daCodificare.length; i++) {
      const t = daCodificare[i]
      const coords = await geocodeTecnico(t)
      if (coords) {
        saveCache(t.id, coords.lat, coords.lng)
        tecniciApi.saveGeo(t.id, coords.lat, coords.lng).catch(() => {})
        nuovi.push({ ...t, lat: coords.lat, lng: coords.lng })
      }
      setProgress(i + 1)
      if (i < daCodificare.length - 1) await sleep(1200)
    }
    setExtraGeo(prev => [...prev, ...nuovi])
    setLoading(false)
  }

  const totaleConSede = tecnici.filter(
    t => t.sede_partenza?.citta || t.sede_partenza?.indirizzo || t.sede_partenza?.cap
  ).length

  return (
    <div className="flex flex-col" style={{ height: '100%' }}>
      <div className="px-6 py-2.5 border-b border-slate-100 bg-slate-50 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <MapPin size={15} className="text-blue-500" />
          <span>
            {tuttiGeo.length} di {totaleConSede} tecnici sulla mappa
            {daCodificare.length > 0 && !loading && (
              <span className="ml-1 text-amber-600">· {daCodificare.length} senza coordinate</span>
            )}
          </span>
        </div>

        {daCodificare.length > 0 && !loading && (
          <button
            onClick={runGeocode}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
          >
            <MapPin size={15} />
            Geocodifica {daCodificare.length} tecnici
          </button>
        )}

        {loading && (
          <div className="flex items-center gap-3 text-sm text-slate-500">
            <Loader2 size={15} className="animate-spin text-blue-500" />
            <span>Geocodifica {progress}/{daCodificare.length}...</span>
            <div className="w-36 h-1.5 bg-slate-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-500 rounded-full transition-all duration-300"
                style={{ width: `${daCodificare.length > 0 ? (progress / daCodificare.length) * 100 : 0}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {totaleConSede === 0 && (
        <div className="flex-1 flex flex-col items-center justify-center gap-3 text-slate-400">
          <AlertCircle size={36} />
          <p className="text-sm">Nessun tecnico ha un indirizzo configurato.</p>
        </div>
      )}

      <div ref={mapRef} style={{ flex: 1, minHeight: 0, width: '100%' }} />
    </div>
  )
}
