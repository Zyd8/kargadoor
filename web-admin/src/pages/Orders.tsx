import { useEffect, useState } from 'react'
import { Search, RefreshCw, Eye } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { Package } from '@/types'
import { formatCurrency, formatDate, VEHICLE_EMOJIS } from '@/lib/utils'
import { PageHeader } from '@/components/PageHeader'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useToast } from '@/components/ui/use-toast'
import { Skeleton } from '@/components/ui/skeleton'

const STATUS_BADGE: Record<string, string> = {
  PENDING: 'bg-amber-100 text-amber-800 border-0',
  IN_PROGRESS: 'bg-blue-100 text-blue-800 border-0',
  COMPLETE: 'bg-green-100 text-green-800 border-0',
  CANCELLED: 'bg-red-100 text-red-800 border-0',
}

export default function Orders() {
  const [orders, setOrders] = useState<Package[]>([])
  const [filtered, setFiltered] = useState<Package[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [selected, setSelected] = useState<Package | null>(null)
  const { toast } = useToast()

  useEffect(() => { fetchOrders() }, [])

  useEffect(() => {
    let list = orders
    if (statusFilter !== 'all') list = list.filter(o => o.STATUS === statusFilter)
    if (search) {
      const q = search.toLowerCase()
      list = list.filter(o =>
        o.PICKUP_ADDRESS?.toLowerCase().includes(q) ||
        o.RECIPIENT_ADDRESS?.toLowerCase().includes(q) ||
        o.RECIPIENT_NAME?.toLowerCase().includes(q) ||
        o.VEHICLE_TYPE?.toLowerCase().includes(q)
      )
    }
    setFiltered(list)
  }, [orders, search, statusFilter])

  async function fetchOrders() {
    setLoading(true)
    const { data, error } = await supabase
      .from('PACKAGES')
      .select(`
        *,
        sender:SENDER_ID(ID, FULL_NAME, EMAIL, PHONE_NUMBER, AVATAR_URL, ROLE, PUSH_TOKEN),
        driver:DRIVER_ID(ID, FULL_NAME, EMAIL, PHONE_NUMBER, AVATAR_URL, ROLE, PUSH_TOKEN)
      `)
      .order('CREATED_AT', { ascending: false })
    if (error) { toast({ variant: 'destructive', title: 'Error', description: error.message }); setLoading(false); return }
    setOrders((data ?? []) as Package[])
    setLoading(false)
  }

  return (
    <div>
      <PageHeader
        title="Orders"
        description={`${orders.length} total orders`}
        action={
          <Button variant="outline" size="sm" onClick={fetchOrders} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        }
      />
      <div className="p-8 space-y-4">
        {/* Filters */}
        <div className="flex gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by address, recipient…"
              className="pl-9"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="PENDING">Pending</SelectItem>
              <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
              <SelectItem value="COMPLETE">Complete</SelectItem>
              <SelectItem value="CANCELLED">Cancelled</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Table */}
        <div className="rounded-lg border bg-card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/40">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Pickup</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Dropoff</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Recipient</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Vehicle</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Price</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Date</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {loading && Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}>{Array.from({ length: 8 }).map((_, j) => <td key={j} className="px-4 py-3"><Skeleton className="h-5 w-full" /></td>)}</tr>
              ))}
              {!loading && filtered.length === 0 && (
                <tr><td colSpan={8} className="px-4 py-10 text-center text-muted-foreground">No orders found</td></tr>
              )}
              {!loading && filtered.map(order => (
                <tr key={order.ID} className="hover:bg-muted/20 transition-colors">
                  <td className="px-4 py-3 max-w-[160px]">
                    <p className="truncate text-xs">{order.PICKUP_ADDRESS ?? '—'}</p>
                  </td>
                  <td className="px-4 py-3 max-w-[160px]">
                    <p className="truncate text-xs">{order.RECIPIENT_ADDRESS ?? '—'}</p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-medium">{order.RECIPIENT_NAME ?? '—'}</p>
                    <p className="text-xs text-muted-foreground">{order.RECIPIENT_NUMBER ?? ''}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span>{VEHICLE_EMOJIS[order.VEHICLE_TYPE ?? ''] ?? '🚚'}</span>
                    <span className="ml-1 text-xs capitalize">{order.VEHICLE_TYPE ?? '—'}</span>
                  </td>
                  <td className="px-4 py-3 font-medium">{formatCurrency(order.PRICE)}</td>
                  <td className="px-4 py-3">
                    <Badge variant="outline" className={STATUS_BADGE[order.STATUS ?? ''] ?? ''}>
                      {order.STATUS ?? '—'}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">{formatDate(order.CREATED_AT)}</td>
                  <td className="px-4 py-3">
                    <Button variant="ghost" size="icon" onClick={() => setSelected(order)}>
                      <Eye className="h-4 w-4" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Order detail dialog */}
      <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Order Details</DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Status</p>
                  <Badge variant="outline" className={STATUS_BADGE[selected.STATUS ?? ''] ?? ''}>
                    {selected.STATUS}
                  </Badge>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Price</p>
                  <p className="font-bold text-base">{formatCurrency(selected.PRICE)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Vehicle</p>
                  <p>{VEHICLE_EMOJIS[selected.VEHICLE_TYPE ?? ''] ?? ''} <span className="capitalize">{selected.VEHICLE_TYPE}</span></p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Payment</p>
                  <p>{selected.PAYMENT_METHOD ?? '—'}</p>
                </div>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Pickup Address</p>
                <p>{selected.PICKUP_ADDRESS ?? '—'}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Dropoff Address</p>
                <p>{selected.RECIPIENT_ADDRESS ?? '—'}</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Recipient</p>
                  <p>{selected.RECIPIENT_NAME ?? '—'}</p>
                  <p className="text-muted-foreground">{selected.RECIPIENT_NUMBER ?? ''}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Sender</p>
                  <p>{selected.sender?.FULL_NAME ?? '—'}</p>
                  <p className="text-muted-foreground">{selected.sender?.EMAIL ?? ''}</p>
                </div>
              </div>
              {selected.driver && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Driver</p>
                  <p>{selected.driver.FULL_NAME ?? '—'} · {selected.driver.PHONE_NUMBER ?? '—'}</p>
                </div>
              )}
              {selected.TRACKING_TOKEN && selected.STATUS === 'IN_PROGRESS' && (
                <div className="border-t pt-3 mt-3">
                  <p className="text-xs text-muted-foreground mb-1">Tracking Token</p>
                  <div className="flex items-center gap-2">
                    <p className="text-xs font-mono bg-muted px-2 py-1 rounded flex-1 truncate">
                      {selected.TRACKING_TOKEN}
                    </p>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => {
                        navigator.clipboard.writeText(selected.TRACKING_TOKEN || '')
                        toast({ title: 'Copied!', description: 'Tracking token copied to clipboard' })
                      }}
                    >
                      Copy
                    </Button>
                  </div>
                </div>
              )}
              <div className="grid grid-cols-2 gap-3 border-t pt-3">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Item Type</p>
                  <p>{selected.ITEM_TYPES ?? '—'}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Notes</p>
                  <p>{selected.NOTES ?? '—'}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Created</p>
                  <p>{formatDate(selected.CREATED_AT)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Completed</p>
                  <p>{formatDate(selected.COMPLETED_AT)}</p>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
