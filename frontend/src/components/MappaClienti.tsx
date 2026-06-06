import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { MapPin, Loader2, AlertCircle } from 'lucide-react'
import type { Cliente } from '../api/clienti'
import { clientiApi } from '../api/clienti'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

import iconUrl from 'leaflet/dist/images/marker-icon.png'
import iconRetinaUrl from 'leaflet/dist/images/marker-icon-2x.png'
import shadowUrl from 'leaflet/dist/images/marker-shadow.png'

delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl
L.Icon.Default.mergeOptions({ iconUrl, iconRetinaUrl, shadowUrl })

interface GeoCliente extends Cliente {
  lat: number
  lng: number
}

interface Props {
  clienti: Cliente[]
  isVisible: boolean
}

async function geocodeCliente(c: Cliente): Promise<{ lat: number; lng: number } | null> {
  const sl = c.sede_legale
  if (!sl) return null
  const queries = [
    [sl.indirizzo, sl.cap, sl.citta, 'Italia'].filter(Boolean).join(', '),
    [sl.citta, sl.provincia, 'Italia'].filter(Boolean).join(', '),
    [sl.cap, 'Italia'].filter(Boolean).join(', '),
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

export default function MappaClienti({ clienti, isVisible }: Props) {
  const mapRef = useRef<HTMLDivElement>(null)
  const leafletMap = useRef<L.Map | null>(null)
  const markersRef = useRef<L.Marker[]>([])
  const navigate = useNavigate()

  // Clienti con indirizzo sufficiente per geocoding
  const conSede = clienti.filter(c =>
    c.sede_legale?.citta || c.sede_legale?.indirizzo || c.sede_legale?.cap
  )

  // Clienti già geocodificati (lat/lng salvati in DB)
  const giaSalvati: GeoCliente[] = conSede.filter(
    (c): c is GeoCliente => typeof c.lat === 'number' && typeof c.lng === 'number'
  )

  // Clienti che mancano ancora di coordinate
  const daCodificare = conSede.filter(c => typeof c.lat !== 'number' || typeof c.lng !== 'number')

  const [loading, setLoading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [geoNuovi, setGeoNuovi] = useState<GeoCliente[]>([])

  const tuttiGeo: GeoCliente[] = [...giaSalvati, ...geoNuovi]

  // Init mappa
  useEffect(() => {
    if (!isVisible) return
    if (!mapRef.current) return
    if (leafletMap.current) {
      setTimeout(() => leafletMap.current?.invalidateSize(), 50)
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
      if (giaSalvati.length > 0) addMarkers(giaSalvati)
    }
    requestAnimationFrame(init)
    return () => { leafletMap.current?.remove(); leafletMap.current = null }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isVisible])

  // Aggiunge marker ogni volta che arrivano nuovi geocodificati
  useEffect(() => {
    if (tuttiGeo.length > 0) setTimeout(() => addMarkers(tuttiGeo), 50)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [geoNuovi, giaSalvati.length])

  const addMarkers = (list: GeoCliente[]) => {
    const map = leafletMap.current
    if (!map) return
    markersRef.current.forEach(m => m.remove())
    markersRef.current = []
    list.forEach(c => {
      const sl = c.sede_legale
      const popup = L.popup({ closeButton: false, minWidth: 190 }).setContent(`
        <div style="font-family:system-ui,sans-serif">
          <p style="font-weight:600;font-size:13px;margin:0 0 2px;color:#0f172a">${c.ragione_sociale}</p>
          <p style="font-size:11px;color:#64748b;margin:0 0 6px">${c.codice_cliente}</p>
          ${sl?.citta ? `<p style="font-size:12px;color:#475569;margin:0 0 8px">📍 ${sl.citta}${sl.provincia ? ` (${sl.provincia})` : ''}</p>` : ''}
          <button id="go-${c.id}" style="background:#2563eb;color:#fff;border:none;border-radius:6px;padding:5px 12px;font-size:12px;cursor:pointer;width:100%;font-weight:500">
            Apri scheda →
          </button>
        </div>
      `)
      const marker = L.marker([c.lat, c.lng]).addTo(map).bindPopup(popup)
      marker.on('popupopen', () => {
        setTimeout(() => {
          document.getElementById(`go-${c.id}`)?.addEventListener('click', () => navigate(`/clienti/${c.id}`))
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
    const nuovi: GeoCliente[] = []
    for (let i = 0; i < daCodificare.length; i++) {
      const c = daCodificare[i]
      const coords = await geocodeCliente(c)
      if (coords) {
        const geo = { ...c, ...coords }
        nuovi.push(geo)
        clientiApi.saveGeo(c.id, coords.lat, coords.lng).catch(() => {})
      }
      setProgress(i + 1)
      if (i < daCodificare.length - 1) await sleep(1200)
    }
    setGeoNuovi(nuovi)
    setLoading(false)
  }

  return (
    <div className="flex flex-col" style={{ height: '100%' }}>
      {/* Toolbar */}
      <div className="px-6 py-2.5 border-b border-slate-100 bg-slate-50 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <MapPin size={15} className="text-blue-500" />
          <span>
            {tuttiGeo.length} di {conSede.length} clienti sulla mappa
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
            Geocodifica {daCodificare.length} clienti
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

      {conSede.length === 0 && (
        <div className="flex-1 flex flex-col items-center justify-center gap-3 text-slate-400">
          <AlertCircle size={36} />
          <p className="text-sm">Nessun cliente ha un indirizzo configurato.</p>
        </div>
      )}

      <div ref={mapRef} style={{ flex: 1, minHeight: 0, width: '100%' }} />
    </div>
  )
}
