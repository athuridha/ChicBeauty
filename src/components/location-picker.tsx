import { useEffect, useRef, useState } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { MapPin, Navigation, Check, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

// Fix Leaflet default icon paths in bundlers (Vite)
delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
})

interface LocationPickerProps {
  address: string
  onChangeAddress: (newAddress: string) => void
}

const DEFAULT_CENTER: [number, number] = [-7.250445, 112.750812] // Default: Surabaya / Indonesia

export default function LocationPicker({ onChangeAddress }: LocationPickerProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<L.Map | null>(null)
  const markerRef = useRef<L.Marker | null>(null)

  const [loadingGps, setLoadingGps] = useState(false)
  const [geocoding, setGeocoding] = useState(false)
  const [coords, setCoords] = useState<[number, number] | null>(null)
  const [showMap, setShowMap] = useState(false)
  const [streetNotes, setStreetNotes] = useState('')

  // 1. Initialize Leaflet Map when showMap becomes true
  useEffect(() => {
    if (!showMap || !mapContainerRef.current) return

    const initialPos = coords || DEFAULT_CENTER

    if (!mapRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: initialPos,
        zoom: 16,
        zoomControl: true,
      })

      // Add OpenStreetMap tiles
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; OpenStreetMap contributors',
      }).addTo(map)

      // Add Draggable Marker
      const marker = L.marker(initialPos, { draggable: true }).addTo(map)

      // Handle marker dragend
      marker.on('dragend', () => {
        const position = marker.getLatLng()
        const newCoords: [number, number] = [position.lat, position.lng]
        setCoords(newCoords)
        updateAddressWithCoords(newCoords)
      })

      // Handle map click (move marker to click position)
      map.on('click', (e: L.LeafletMouseEvent) => {
        const newCoords: [number, number] = [e.latlng.lat, e.latlng.lng]
        marker.setLatLng(e.latlng)
        setCoords(newCoords)
        updateAddressWithCoords(newCoords)
      })

      mapRef.current = map
      markerRef.current = marker

      // Trigger map resize fix
      setTimeout(() => {
        map.invalidateSize()
      }, 200)
    } else {
      mapRef.current.setView(initialPos, 16)
      if (markerRef.current) {
        markerRef.current.setLatLng(initialPos)
      }
    }
  }, [showMap])

  // Update reverse geocode when coordinates change
  async function updateAddressWithCoords(targetCoords: [number, number]) {
    const [lat, lng] = targetCoords
    const mapsLink = `https://maps.google.com/?q=${lat.toFixed(6)},${lng.toFixed(6)}`

    setGeocoding(true)
    let fetchedAddressName = ''

    try {
      // Reverse Geocoding via Nominatim API
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`,
        {
          headers: {
            'Accept-Language': 'id-ID,id;q=0.9',
          },
        }
      )
      const data = await res.json()
      if (data && data.display_name) {
        fetchedAddressName = data.display_name
      }
    } catch (e) {
      console.warn('[Geocoding error]', e)
    } finally {
      setGeocoding(false)
    }

    // Combine street notes, resolved address, and Maps Pin link
    const notesText = streetNotes.trim()
    const addressDetails = [
      notesText ? `Patokan / Catatan: ${notesText}` : '',
      fetchedAddressName ? `Alamat Presisi: ${fetchedAddressName}` : '',
      `📍 Pin Maps: ${mapsLink}`,
    ]
      .filter(Boolean)
      .join('\n')

    onChangeAddress(addressDetails)
  }

  // Handle manual street notes typing
  function handleStreetNotesChange(val: string) {
    setStreetNotes(val)
    if (coords) {
      const [lat, lng] = coords
      const mapsLink = `https://maps.google.com/?q=${lat.toFixed(6)},${lng.toFixed(6)}`
      const addressDetails = [
        val.trim() ? `Patokan / Catatan: ${val.trim()}` : '',
        `📍 Pin Maps: ${mapsLink}`,
      ]
        .filter(Boolean)
        .join('\n')

      onChangeAddress(addressDetails)
    } else {
      onChangeAddress(val)
    }
  }

  // 2. Handle GPS Location Button Click
  function handleGetGps() {
    setShowMap(true)
    if (!navigator.geolocation) {
      toast.error('Browser Anda tidak mendukung GPS')
      return
    }

    setLoadingGps(true)

    // Use high accuracy false first for fast, reliable response
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const newCoords: [number, number] = [pos.coords.latitude, pos.coords.longitude]
        setCoords(newCoords)
        setLoadingGps(false)
        toast.success('Lokasi GPS berhasil didapatkan! Silakan geser pin jika ingin mempresisikan.')

        if (mapRef.current && markerRef.current) {
          mapRef.current.setView(newCoords, 17)
          markerRef.current.setLatLng(newCoords)
        }
        updateAddressWithCoords(newCoords)
      },
      (err) => {
        console.warn('[GPS warning]', err)
        setLoadingGps(false)
        // Fallback to IP / default center without blocking the user
        const fallbackCoords = coords || DEFAULT_CENTER
        setCoords(fallbackCoords)
        toast.warning('GPS lambat/ditolak. Silakan geser pin merah pada peta di bawah.')
        if (mapRef.current && markerRef.current) {
          mapRef.current.setView(fallbackCoords, 15)
          markerRef.current.setLatLng(fallbackCoords)
        }
        updateAddressWithCoords(fallbackCoords)
      },
      {
        enableHighAccuracy: false,
        timeout: 8000,
        maximumAge: 30000,
      }
    )
  }

  return (
    <div className="space-y-4 animate-in fade-in duration-300">
      <div className="flex items-center justify-between">
        <label className="text-[10px] font-semibold tracking-salon text-salon-charcoal uppercase">
          ALAMAT LENGKAP & LOKASI PRESISI
        </label>
      </div>

      {/* Button: AMBIL LOKASI in ChicBeauty Theme Colors */}
      <button
        type="button"
        onClick={handleGetGps}
        disabled={loadingGps}
        className="w-full bg-salon-charcoal hover:bg-salon-brown text-salon-cream py-3.5 px-4 text-xs font-semibold tracking-salon transition-all duration-300 flex items-center justify-center gap-2 shadow-sm rounded-none border border-salon-charcoal"
      >
        {loadingGps ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin text-salon-sand" />
            <span>MENGAMBIL LOKASI…</span>
          </>
        ) : (
          <>
            <Navigation className="h-4 w-4 text-salon-sand" />
            <span>AMBIL LOKASI</span>
          </>
        )}
      </button>

      {/* Interactive Map Section */}
      {showMap && (
        <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="flex items-center justify-between text-[11px] text-salon-taupe">
            <span className="flex items-center gap-1 font-medium text-salon-charcoal">
              <MapPin className="h-3.5 w-3.5 text-salon-brown" />
              Geser pin merah ke titik rumah / lokasi Anda:
            </span>
            {geocoding && (
              <span className="text-salon-taupe flex items-center gap-1">
                <Loader2 className="h-3 w-3 animate-spin" /> Mencari alamat…
              </span>
            )}
          </div>

          {/* Leaflet Map Canvas Container */}
          <div
            ref={mapContainerRef}
            className="w-full h-64 border border-salon-sand/60 shadow-inner z-0 relative rounded-none overflow-hidden"
          />

          {coords && (
            <div className="flex items-center justify-between bg-salon-cream p-2.5 text-xs border border-salon-sand/40">
              <span className="font-mono text-[10px] text-salon-charcoal">
                📍 Pin: https://maps.google.com/?q={coords[0].toFixed(6)},{coords[1].toFixed(6)}
              </span>
              <span className="text-[10px] text-green-700 font-semibold flex items-center gap-1">
                <Check className="h-3 w-3" /> Tersimpan
              </span>
            </div>
          )}
        </div>
      )}

      {/* Textarea for Street & Landmark Notes */}
      <div className="space-y-1">
        <textarea
          className="w-full min-h-[80px] border-0 border-b border-salon-sand bg-transparent px-0 py-2 text-salon-charcoal placeholder-salon-taupe/40 focus:ring-0 focus:border-salon-charcoal transition-colors resize-none text-sm leading-relaxed"
          placeholder="Nomor rumah, lantai/unit, patokan (misal: depan masjid/pagar hitam)..."
          value={streetNotes}
          onChange={(e) => handleStreetNotesChange(e.target.value)}
        />
      </div>
    </div>
  )
}
