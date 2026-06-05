import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { MapPin, Loader2, AlertCircle } from 'lucide-react'
import type { Cliente } from '../api/clienti'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

// Fix default icon paths broken by bundlers
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
}

async function geocodeCliente(c: Cliente): Promise<{ lat: number; lng: number } | null> {
  const sl = c.sede_legale
  if (!sl) return null
  const q = [sl.indirizzo, sl.cap, sl.citta, 'Italia'].filter(Boolean).join(', ')
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=1`,
      { headers: { 'Accept-Language': 'it' } }
    )
    const data = await res.json()
    if (data[0]) return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) }
  } catch { /* ignore */ }
  return null
}

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms))

export default function MappaClienti({ clienti }: Props) {
  const mapRef = useRef<HTMLDivElement>(null)
  const leafletMap = useRef<L.Map | null>(null)
  const markersRef = useRef<L.Marker[]>([])
  const navigate = useNavigate()

  const [geoClienti, setGeoClienti] = useState<GeoCliente[]>([])
  const [loading, setLoading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [geocoded, setGeocoded] = useState(false)

  const conSede = clienti.filter(c => c.sede_legale?.citta)

  useEffect(() => {
    if (!mapRef.current || leafletMap.current) return
    leafletMap.current = L.map(mapRef.current, { center: [45.65, 9.3], zoom: 9 })
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(leafletMap.current)
    return () => { leafletMap.current?.remove(); leafletMap.current = null }
  }, [])

  const runGeocode = async () => {
    setLoading(true)
    setProgress(0)
    const results: GeoCliente[] = []
    for (let i = 0; i < conSede.length; i++) {
      const coords = await geocodeCliente(conSede[i])
      if (coords) results.push({ ...conSede[i], ...coords })
      setProgress(i + 1)
      if (i < conSede.length - 1) await sleep(1100)
    }
    setGeoClienti(results)
    setLoading(false)
    setGeocoded(true)
  }

  useEffect(() => {
    const map = leafletMap.current
    if (!map) return
    markersRef.current.forEach(m => m.remove())
    markersRef.current = []

    geoClienti.forEach(c => {
      const popup = L.popup({ closeButton: false }).setContent(`
        <div style="min-width:180px">
          <p style="font-weight:600;font-size:13px;margin:0 0 2px">${c.ragione_sociale}</p>
          <p style="font-size:11px;color:#64748b;margin:0 0 6px">${c.codice_cliente}</p>
          ${c.sede_legale?.citta ? `<p style="font-size:12px;color:#475569;margin:0 0 8px">📍 ${c.sede_legale.citta}${c.sede_legale.provincia ? ` (${c.sede_legale.provincia})` : ''}</p>` : ''}
          <button id="btn-${c.id}" style="background:#2563eb;color:#fff;border:none;border-radius:6px;padding:4px 10px;font-size:12px;cursor:pointer;width:100%">
            Apri scheda →
          </button>
        </div>
      `)
      const marker = L.marker([c.lat, c.lng]).addTo(map).bindPopup(popup)
      marker.on('popupopen', () => {
        setTimeout(() => {
          document.getElementById(`btn-${c.id}`)?.addEventListener('click', () => navigate(`/clienti/${c.id}`))
        }, 50)
      })
      markersRef.current.push(marker)
    })

    if (geoClienti.length > 0) {
      const group = L.featureGroup(markersRef.current)
      map.fitBounds(group.getBounds().pad(0.1))
    }
  }, [geoClienti, navigate])

  return (
    <div className="flex flex-col h-full">
      <div className="px-6 py-2.5 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
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
            <div className="w-32 h-1.5 bg-slate-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-500 rounded-full transition-all"
                style={{ width: `${(progress / conSede.length) * 100}%` }}
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

      <div ref={mapRef} className="flex-1" style={{ minHeight: 0 }} />
    </div>
  )
}
