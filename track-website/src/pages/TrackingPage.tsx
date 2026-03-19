import { useEffect, useState, useRef } from 'react'
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet'
import L from 'leaflet'
import { supabase, TOMTOM_API_KEY } from '../lib/supabase'

// Types
interface Package {
  ID: string
  STATUS: string | null
  PICKUP_ADDRESS: string | null
  PICKUP_LAT: number | null
  PICKUP_LNG: number | null
  RECIPIENT_ADDRESS: string | null
  DROPOFF_LAT: number | null
  DROPOFF_LNG: number | null
  RECIPIENT_NAME: string | null
  RECIPIENT_NUMBER: string | null
  VEHICLE_TYPE: string | null
  DRIVER_NAME: string | null
  DRIVER_PHONE: string | null
  PRICE: number | null
  PAYMENT_METHOD: string | null
  ITEM_TYPES: string | null
  CREATED_AT: string | null
  ACCEPTED_AT: string | null
  COMPLETED_AT: string | null
  CURRENT_LAT: number | null
  CURRENT_LNG: number | null
}

// Status configurations
const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string }> = {
  PENDING: { label: 'Pending', bg: 'bg-amber-100', text: 'text-amber-800' },
  IN_PROGRESS: { label: 'In Transit', bg: 'bg-blue-100', text: 'text-blue-800' },
  COMPLETE: { label: 'Delivered', bg: 'bg-green-100', text: 'text-green-800' },
  CANCELLED: { label: 'Cancelled', bg: 'bg-red-100', text: 'text-red-800' },
}

// Custom marker icons
const createIcon = (color: string) => L.divIcon({
  className: 'custom-marker',
  html: `<div style="width:32px;height:32px;background:${color};border:3px solid white;border-radius:50%;box-shadow:0 2px 8px rgba(0,0,0,0.3);"></div>`,
  iconSize: [32, 32],
  iconAnchor: [16, 16],
})

const driverIcon = L.divIcon({
  className: 'custom-marker',
  html: `<div style="width:40px;height:40px;position:relative;">
    <div style="position:absolute;inset:0;background:#f0a92d;border-radius:50%;opacity:0.3;"></div>
    <div style="position:absolute;inset:2px;background:#f0a92d;border-radius:50%;display:flex;align-items:center;justify-content:center;color:white;font-weight:bold;font-size:18px;">🚚</div>
  </div>`,
  iconSize: [40, 40],
  iconAnchor: [20, 20],
})

const pickupIcon = createIcon('#22c55e')
const dropoffIcon = createIcon('#ef4444')

// Utility functions
const formatCurrency = (amount: number | null) => `₱${amount ? amount.toFixed(2) : '0.00'}`

const formatDate = (dateStr: string | null) => {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('en-PH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

const getInitials = (name: string | null) => {
  if (!name) return '?'
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
}

// Map bounds component
function MapBounds({ pickup, dropoff }: { pickup: [number, number]; dropoff: [number, number] }) {
  const map = useMap()
  
  useEffect(() => {
    const bounds = L.latLngBounds([pickup, dropoff])
    map.fitBounds(bounds, { padding: [30, 30] })
  }, [map, pickup, dropoff])
  
  return null
}

export default function TrackingPage() {
  // Get token from URL path - more reliable than useParams with Vercel rewrites
  const path = window.location.pathname
  const tokenMatch = path.match(/\/track\/([^/]+)/)
  const token = tokenMatch ? tokenMatch[1] : null
  const [order, setOrder] = useState<Package | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)

  // Fetch order
  useEffect(() => {
    let mounted = true
    
    async function fetchOrder() {
      if (!token) {
        setError('No tracking token provided')
        setLoading(false)
        return
      }

      // Only select columns that exist in the database
      let query = supabase
        .from('PACKAGES')
        .select(`
          ID,
          STATUS,
          PICKUP_ADDRESS,
          PICKUP_LAT,
          PICKUP_LNG,
          RECIPIENT_ADDRESS,
          DROPOFF_LAT,
          DROPOFF_LNG,
          RECIPIENT_NAME,
          RECIPIENT_NUMBER,
          VEHICLE_TYPE,
          PRICE,
          PAYMENT_METHOD,
          ITEM_TYPES,
          CREATED_AT,
          ACCEPTED_AT,
          COMPLETED_AT
        `)
        .eq('TRACKING_TOKEN', token)

      let { data, error: fetchError } = await query.single()

      // If TRACKING_TOKEN doesn't work, try ID
      if (fetchError || !data) {
        const idQuery = supabase
          .from('PACKAGES')
          .select(`
            ID,
            STATUS,
            PICKUP_ADDRESS,
            PICKUP_LAT,
            PICKUP_LNG,
            RECIPIENT_ADDRESS,
            DROPOFF_LAT,
            DROPOFF_LNG,
            RECIPIENT_NAME,
            RECIPIENT_NUMBER,
            VEHICLE_TYPE,
            DRIVER_NAME,
            DRIVER_PHONE,
            PRICE,
            PAYMENT_METHOD,
            ITEM_TYPES,
            CREATED_AT,
            ACCEPTED_AT,
            COMPLETED_AT,
            CURRENT_LAT,
            CURRENT_LNG
          `)
          .eq('ID', token)

        const result = await idQuery.single()
        data = result.data
        fetchError = result.error
      }

      if (!mounted) return

      if (fetchError || !data) {
        setError('Order not found. Please check your tracking link.')
        setLoading(false)
        return
      }

      setOrder(data as Package)
      setLoading(false)
    }

    fetchOrder()

    return () => {
      mounted = false
    }
  }, [token])

  // Subscribe to real-time updates
  useEffect(() => {
    if (!order?.ID || order.STATUS !== 'IN_PROGRESS') return

    const channel = supabase
      .channel(`tracking-${order.ID}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'PACKAGES',
          filter: `ID=eq.${order.ID}`,
        },
        (payload) => {
          const newData = payload.new as Package
          setOrder(prev => prev ? { ...prev, ...newData } : null)
        }
      )
      .subscribe()

    channelRef.current = channel

    return () => {
      supabase.removeChannel(channel)
    }
  }, [order?.ID, order?.STATUS])

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-gray-500">Loading tracking information...</p>
        </div>
      </div>
    )
  }

  // Error state
  if (error || !order) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl p-8 text-center max-w-md shadow-sm">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold mb-2">Order Not Found</h2>
          <p className="text-gray-500">{error || 'Unable to load order'}</p>
        </div>
      </div>
    )
  }

  const statusConfig = STATUS_CONFIG[order.STATUS || ''] || STATUS_CONFIG.PENDING

  // Calculate map center
  const hasCoords = order.PICKUP_LAT && order.PICKUP_LNG && order.DROPOFF_LAT && order.DROPOFF_LNG

  const center: [number, number] = hasCoords
    ? [(order.PICKUP_LAT! + order.DROPOFF_LAT!) / 2, (order.PICKUP_LNG! + order.DROPOFF_LNG!) / 2]
    : [14.5995, 120.9842] // Manila default

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-gradient-to-r from-primary to-primary-dark py-6 px-4 text-center">
        <h1 className="text-white text-xl font-bold">📦 Kargadoor</h1>
        <p className="text-white/90 text-sm mt-1">Track Your Delivery</p>
      </header>

      <div className="max-w-xl mx-auto p-4 space-y-4">
        {/* Map */}
        {hasCoords && (
          <div className="bg-white rounded-xl overflow-hidden shadow-sm">
            <div className="h-72">
              <MapContainer center={center} zoom={13} style={{ height: '100%', width: '100%' }}>
                <TileLayer
                  attribution='&copy; <a href="https://www.tomtom.com/maps/">TomTom</a>'
                  url={`https://{s}.api.tomtom.com/map/1/tile/basic/main/{z}/{x}/{y}.png?key=${TOMTOM_API_KEY}`}
                />
                <Marker position={[order.PICKUP_LAT!, order.PICKUP_LNG!]} icon={pickupIcon}>
                  <Popup>Pickup Location</Popup>
                </Marker>
                <Marker position={[order.DROPOFF_LAT!, order.DROPOFF_LNG!]} icon={dropoffIcon}>
                  <Popup>Delivery Location</Popup>
                </Marker>
                {order.CURRENT_LAT && order.CURRENT_LNG && (
                  <Marker position={[order.CURRENT_LAT, order.CURRENT_LNG]} icon={driverIcon}>
                    <Popup>Driver Location</Popup>
                  </Marker>
                )}
                <Polyline
                  positions={[
                    [order.PICKUP_LAT!, order.PICKUP_LNG!],
                    [order.DROPOFF_LAT!, order.DROPOFF_LNG!],
                  ]}
                  color="#f0a92d"
                  weight={4}
                  opacity={0.7}
                  dashArray="10, 10"
                />
                <MapBounds
                  pickup={[order.PICKUP_LAT!, order.PICKUP_LNG!]}
                  dropoff={[order.DROPOFF_LAT!, order.DROPOFF_LNG!]}
                />
              </MapContainer>
            </div>
          </div>
        )}

        {/* Status Card */}
        <div className="bg-white rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900">Delivery Status</h2>
            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${statusConfig.bg} ${statusConfig.text}`}>
              {statusConfig.label}
            </span>
          </div>

          {/* Progress Steps */}
          <div className="flex items-center justify-between mt-6">
            <div className="flex flex-col items-center">
              <div className={`w-9 h-9 rounded-full flex items-center justify-center ${order.CREATED_AT ? 'bg-green-500 text-white' : 'bg-gray-100 text-gray-400'}`}>
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
              </div>
              <span className="text-xs mt-1 text-gray-500">Order Placed</span>
            </div>
            <div className={`flex-1 h-1 mx-2 ${order.ACCEPTED_AT || order.STATUS === 'IN_PROGRESS' || order.STATUS === 'COMPLETE' ? 'bg-green-500' : 'bg-gray-200'}`} />
            <div className="flex flex-col items-center">
              <div className={`w-9 h-9 rounded-full flex items-center justify-center ${order.ACCEPTED_AT || order.STATUS === 'IN_PROGRESS' || order.STATUS === 'COMPLETE' ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-400'}`}>
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <span className="text-xs mt-1 text-gray-500">Driver Assigned</span>
            </div>
            <div className={`flex-1 h-1 mx-2 ${order.COMPLETED_AT || order.STATUS === 'COMPLETE' ? 'bg-green-500' : 'bg-gray-200'}`} />
            <div className="flex flex-col items-center">
              <div className={`w-9 h-9 rounded-full flex items-center justify-center ${order.COMPLETED_AT || order.STATUS === 'COMPLETE' ? 'bg-green-500 text-white' : 'bg-gray-100 text-gray-400'}`}>
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <span className="text-xs mt-1 text-gray-500">Delivered</span>
            </div>
          </div>
        </div>

        {/* Route Card */}
        <div className="bg-white rounded-xl p-5 shadow-sm">
          <h2 className="font-semibold text-gray-900 mb-4">Delivery Route</h2>
          
          <div className="space-y-3">
            {/* Pickup */}
            <div className="flex gap-3">
              <div className="mt-1">
                <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                  <svg className="w-4 h-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
              </div>
              <div>
                <p className="text-xs text-gray-500">Pickup Address</p>
                <p className="font-medium">{order.PICKUP_ADDRESS || 'Not specified'}</p>
              </div>
            </div>

            <div className="flex justify-center">
              <svg className="w-5 h-5 text-gray-400 rotate-90" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
              </svg>
            </div>

            {/* Dropoff */}
            <div className="flex gap-3">
              <div className="mt-1">
                <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center">
                  <svg className="w-4 h-4 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
              </div>
              <div>
                <p className="text-xs text-gray-500">Delivery Address</p>
                <p className="font-medium">{order.RECIPIENT_ADDRESS || 'Not specified'}</p>
              </div>
            </div>
          </div>

          {/* Driver Info */}
          {order.DRIVER_NAME && (
            <div className="mt-4 p-3 bg-gray-50 rounded-lg flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-white font-semibold">
                {getInitials(order.DRIVER_NAME)}
              </div>
              <div>
                <p className="font-medium">{order.DRIVER_NAME}</p>
                <p className="text-sm text-gray-500">{order.DRIVER_PHONE || 'No phone'}</p>
              </div>
            </div>
          )}
        </div>

        {/* Order Details */}
        <div className="bg-white rounded-xl p-5 shadow-sm">
          <h2 className="font-semibold text-gray-900 mb-4">Order Details</h2>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-gray-500">Vehicle Type</p>
              <p className="font-medium">{order.VEHICLE_TYPE || '—'}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Price</p>
              <p className="font-bold text-primary text-lg">{formatCurrency(order.PRICE)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Payment Method</p>
              <p className="font-medium">{order.PAYMENT_METHOD || '—'}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Order Date</p>
              <p className="font-medium">{formatDate(order.CREATED_AT)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Recipient</p>
              <p className="font-medium">{order.RECIPIENT_NAME || '—'}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Item Type</p>
              <p className="font-medium">{order.ITEM_TYPES || '—'}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="text-center py-6 text-gray-400 text-sm">
        <p>Powered by Kargadoor Logistics</p>
      </footer>
    </div>
  )
}
