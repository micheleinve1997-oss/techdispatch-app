import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { MapPin, Loader2, AlertCircle } from 'lucide-react'
import type { Cliente } from '../api/clienti'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

// Fix icone rotte dal bundler
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
  // Prova prima con indirizzo completo, poi fallback solo città
  const queries = [
    [sl.indirizzo, sl.cap, sl.citta, 'Italia'].filter(Boolean).join(', '),
    [sl.citta, sl.provincia, 'Italia'].filter(Boolean).join(', '),
  ]
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
  const wrapRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<HTMLDivElement>(null)
  const leafletMap = useRef<L.Map | null>(null)
  const markersRef = useRef<L.Marker[]>([])
  const navigate = useNavigate()

  const [geoClienti, setGeoClienti] = useState<GeoCliente[]>([])
  const [loading, setLoading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [geocoded, setGeocoded] = useState(false)

  const conSede = clienti.filter(c => c.sede_legale?.citta)

  // Inizializza la mappa solo quando il div è visibile e ha dimensioni reali
  useEffect(() => {
    if (!isVisible) return
    if (!mapRef.current) return
    if (leafletMap.current) {
      // Tab tornato visibile: forza il ricalcolo della dimensione
      setTimeout(() => leafletMap.current?.invalidateSize(), 50)
      return
    }

    // Prima creazione: aspetta che il DOM abbia dimensioni reali
    const init = () => {
      if (!mapRef.current) return
      const { offsetWidth, offsetHeight } = mapRef.current
      if (offsetWidth === 0 || offsetHeight === 0) {
        requestAnimationFrame(init)
        return
      }
      leafletMap.current = L.map(mapRef.current, {
        center: [45.5, 9.2],
        zoom: 8,
        zoomControl: true,
      })
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 19,
      }).addTo(leafletMap.current)

      // Ridisegna i marker già geocodificati se ci sono
      if (geoClienti.length > 0) addMarkers(geoClienti)
    }
    requestAnimationFrame(init)

    return () => {
      leafletMap.current?.remove()
      leafletMap.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isVisible])

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
          document.getElementById(`go-${c.id}`)?.addEventListener('click', () => {
            navigate(`/clienti/${c.id}`)
          })
        }, 30)
      })
      markersRef.current.push(marker)
    })

    if (list.length === 1) {
      map.setView([list[0].lat, list[0].lng], 13)
    } else if (list.length > 1) {
      const group = L.featureGroup(markersRef.current)
      map.fitBounds(group.getBounds().pad(0.15))
    }
  }

  const runGeocode = async () => {
    setLoading(true)
    setProgress(0)
    const results: GeoCliente[] = []
    for (let i = 0; i < conSede.length; i++) {
      const coords = await geocodeCliente(conSede[i])
      if (coords) results.push({ ...conSede[i], ...coords })
      setProgress(i + 1)
      if (i < conSede.length - 1) await sleep(1200)
    }
    setGeoClienti(results)
    setLoading(false)
    setGeocoded(true)
    // Aggiungi marker dopo che lo state si è aggiornato
    setTimeout(() => addMarkers(results), 100)
  }

  return (
    <div ref={wrapRef} className="flex flex-col" style={{ height: '100%' }}>
      {/* Toolbar */}
      <div className="px-6 py-2.5 border-b border-slate-100 bg-slate-50 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <MapPin size={15} className="text-blue-500" />
          {geocoded
            ? `${geoClienti.length} di ${conSede.length} clienti posizionati`
            : `${conSede.length} clienti con indirizzo`}
        </div>

        {!geocoded && !loading && (
          <button
            onClick={runGeocode}
            disabled={conSede.length === 0}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
          >
            <MapPin size={15} />
            Carica posizioni
          </button>
        )}

        {loading && (
          <div className="flex items-center gap-3 text-sm text-slate-500">
            <Loader2 size={15} className="animate-spin text-blue-500" />
            <span>Geocodifica {progress}/{conSede.length}...</span>
            <div className="w-36 h-1.5 bg-slate-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-500 rounded-full transition-all duration-300"
                style={{ width: `${conSede.length > 0 ? (progress / conSede.length) * 100 : 0}%` }}
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

      {/* Contenitore mappa — dimensione esplicita, non flex-1 */}
      <div
        ref={mapRef}
        style={{ flex: 1, minHeight: 0, width: '100%' }}
      />
    </div>
  )
}
