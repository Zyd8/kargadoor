import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { formatCurrency, formatDate, VEHICLE_EMOJIS } from '@/lib/utils'
import { PageHeader } from '@/components/PageHeader'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { MapPin, Package as PackageIcon, Calendar, DollarSign, User, ArrowRight } from 'lucide-react'

const STATUS_BADGE: Record<string, string> = {
  PENDING: 'bg-amber-100 text-amber-800 border-0',
  IN_PROGRESS: 'bg-blue-100 text-blue-800 border-0',
  COMPLETE: 'bg-green-100 text-green-800 border-0',
  CANCELLED: 'bg-red-100 text-red-800 border-0',
}

interface TrackingOrder {
  ID: string | null
  SENDER_ID: string | null
  DRIVER_ID: string | null
  RECIPIENT_ADDRESS: string | null
  RECIPIENT_NAME: string | null
  RECIPIENT_NUMBER: string | null
  PICKUP_ADDRESS: string | null
  STATUS: string | null
  PRICE: number | null
  VEHICLE_TYPE: string | null
  PAYMENT_METHOD: string | null
  ITEM_TYPES: string | null
  NOTES: string | null
  CREATED_AT: string | null
  ACCEPTED_AT: string | null
  COMPLETED_AT: string | null
  PICKUP_LAT: number | null
  PICKUP_LNG: number | null
  DROPOFF_LAT: number | null
  DROPOFF_LNG: number | null
  sender?: {
    FULL_NAME: string | null
    PHONE_NUMBER: string | null
  } | null
}

export default function Tracking() {
  const { token } = useParams<{ token: string }>()
  const [order, setOrder] = useState<TrackingOrder | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (token) {
      fetchOrder(token)
    }
  }, [token])

  async function fetchOrder(trackingToken: string) {
    setLoading(true)
    setError(null)
    
    const { data, error: fetchError } = await supabase
      .from('PACKAGES')
      .select(`
        *,
        sender:SENDER_ID(ID, FULL_NAME, PHONE_NUMBER)
      `)
      .eq('TRACKING_TOKEN', trackingToken)
      .single()

    if (fetchError || !data) {
      setError('Order not found. Please check your tracking link.')
      setLoading(false)
      return
    }

    setOrder(data as TrackingOrder)
    setLoading(false)
  }

  // Build map URL for pickup and dropoff using OpenStreetMap
  function getMapUrl() {
    if (!order?.PICKUP_LAT || !order?.PICKUP_LNG || !order?.DROPOFF_LAT || !order?.DROPOFF_LNG) {
      return null
    }
    
    const pickup = `${order.PICKUP_LAT},${order.PICKUP_LNG}`
    const dropoff = `${order.DROPOFF_LAT},${order.DROPOFF_LNG}`
    
    // Use OpenStreetMap for directions
    return `https://www.openstreetmap.org/directions?engine=graphhopper_foot&route=${pickup}%3B${dropoff}`
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground">Loading tracking information...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <PackageIcon className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h2 className="text-xl font-semibold mb-2">Tracking Not Found</h2>
            <p className="text-muted-foreground mb-4">{error}</p>
            <Link 
              to="/" 
              className="text-primary hover:underline"
            >
              Go to Home
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  const mapUrl = getMapUrl()

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-primary text-primary-foreground py-8">
        <div className="container mx-auto px-4">
          <PageHeader 
            title="Track Your Delivery" 
            description="View the current status of your package"
          />
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto space-y-6">
          {/* Status Card */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Delivery Status</CardTitle>
                <Badge variant="outline" className={STATUS_BADGE[order?.STATUS ?? ''] ?? ''}>
                  {order?.STATUS ?? 'Unknown'}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${
                    order?.STATUS === 'COMPLETE' ? 'bg-green-500' :
                    order?.STATUS === 'IN_PROGRESS' ? 'bg-blue-500' :
                    order?.STATUS === 'CANCELLED' ? 'bg-red-500' :
                    'bg-amber-500'
                  }`} />
                  <span className="font-medium">
                    {order?.STATUS === 'COMPLETE' ? 'Delivered' :
                     order?.STATUS === 'IN_PROGRESS' ? 'In Transit' :
                     order?.STATUS === 'CANCELLED' ? 'Cancelled' :
                     'Pending'}
                  </span>
                </div>
                <div className="text-sm text-muted-foreground">
                  Order ID: {order?.ID?.slice(0, 8)}...
                </div>
              </div>

              {/* Progress Steps */}
              <div className="mt-6 flex items-center justify-between">
                <div className="flex flex-col items-center">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    order?.CREATED_AT ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'
                  }`}>
                    <PackageIcon className="w-5 h-5" />
                  </div>
                  <span className="text-xs mt-1">Order Placed</span>
                </div>
                <div className={`flex-1 h-1 mx-2 ${
                  order?.ACCEPTED_AT ? 'bg-green-500' : 'bg-gray-200'
                }`} />
                <div className="flex flex-col items-center">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    order?.ACCEPTED_AT ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-400'
                  }`}>
                    <User className="w-5 h-5" />
                  </div>
                  <span className="text-xs mt-1">Driver Assigned</span>
                </div>
                <div className={`flex-1 h-1 mx-2 ${
                  order?.COMPLETED_AT ? 'bg-green-500' : 'bg-gray-200'
                }`} />
                <div className="flex flex-col items-center">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    order?.COMPLETED_AT ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'
                  }`}>
                    <MapPin className="w-5 h-5" />
                  </div>
                  <span className="text-xs mt-1">Delivered</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Route Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Delivery Route</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Pickup Location */}
              <div className="flex gap-3">
                <div className="mt-1">
                  <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                    <MapPin className="w-4 h-4 text-green-600" />
                  </div>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Pickup Address</p>
                  <p className="font-medium">{order?.PICKUP_ADDRESS ?? 'Not specified'}</p>
                  {order?.sender && (
                    <p className="text-sm text-muted-foreground">
                      Sender: {order.sender.FULL_NAME}
                      {order.sender.PHONE_NUMBER && ` · ${order.sender.PHONE_NUMBER}`}
                    </p>
                  )}
                </div>
              </div>

              {/* Arrow */}
              <div className="flex justify-center">
                <ArrowRight className="w-5 h-5 text-muted-foreground rotate-90 md:rotate-0" />
              </div>

              {/* Dropoff Location */}
              <div className="flex gap-3">
                <div className="mt-1">
                  <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center">
                    <MapPin className="w-4 h-4 text-red-600" />
                  </div>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Delivery Address</p>
                  <p className="font-medium">{order?.RECIPIENT_ADDRESS ?? 'Not specified'}</p>
                  <p className="text-sm text-muted-foreground">
                    Recipient: {order?.RECIPIENT_NAME}
                    {order?.RECIPIENT_NUMBER && ` · ${order?.RECIPIENT_NUMBER}`}
                  </p>
                </div>
              </div>

              {/* Map Link - removed */}

            </CardContent>
          </Card>

          {/* Order Details Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Order Details</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground">Vehicle Type</p>
                  <p className="font-medium">
                    {VEHICLE_EMOJIS[order?.VEHICLE_TYPE ?? ''] ?? '🚚'} {order?.VEHICLE_TYPE ?? 'Not specified'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Price</p>
                  <p className="font-medium">{formatCurrency(order?.PRICE ?? 0)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Payment Method</p>
                  <p className="font-medium">{order?.PAYMENT_METHOD ?? 'Not specified'}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Order Date</p>
                  <p className="font-medium">{formatDate(order?.CREATED_AT ?? '')}</p>
                </div>
                {order?.ITEM_TYPES && (
                  <div className="col-span-2">
                    <p className="text-xs text-muted-foreground">Item Type</p>
                    <p className="font-medium">{order.ITEM_TYPES}</p>
                  </div>
                )}
                {order?.NOTES && (
                  <div className="col-span-2">
                    <p className="text-xs text-muted-foreground">Notes</p>
                    <p className="font-medium">{order.NOTES}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
