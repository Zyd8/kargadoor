import { useEffect, useState } from 'react'
import { Search, RefreshCw, CheckCircle, XCircle } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { Vehicle } from '@/types'
import { VEHICLE_EMOJIS } from '@/lib/utils'
import { PageHeader } from '@/components/PageHeader'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { useToast } from '@/components/ui/use-toast'
import { Skeleton } from '@/components/ui/skeleton'
import { AlertCircle } from 'lucide-react'

export default function Vehicles() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [filtered, setFiltered] = useState<Vehicle[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [hasApprovalColumn, setHasApprovalColumn] = useState(true)
  const { toast } = useToast()

  useEffect(() => { fetchVehicles() }, [])

  useEffect(() => {
    let list = vehicles
    if (search) {
      const q = search.toLowerCase()
      list = list.filter(v =>
        v.PLATE?.toLowerCase().includes(q) ||
        v.MODEL?.toLowerCase().includes(q) ||
        v.TYPE?.toLowerCase().includes(q) ||
        v.driver?.FULL_NAME?.toLowerCase().includes(q)
      )
    }
    setFiltered(list)
  }, [vehicles, search])

  async function fetchVehicles() {
    setLoading(true)
    const { data, error } = await supabase
      .from('VEHICLE')
      .select(`*, driver:DRIVER_ID(ID, FULL_NAME, EMAIL, PHONE_NUMBER, AVATAR_URL, ROLE, PUSH_TOKEN)`)
      .order('TYPE')
    if (error) { toast({ variant: 'destructive', title: 'Error', description: error.message }); setLoading(false); return }
    const list = (data ?? []) as Vehicle[]
    if (list.length > 0 && !('IS_APPROVED' in list[0])) setHasApprovalColumn(false)
    setVehicles(list)
    setLoading(false)
  }

  async function toggleApproval(vehicleId: string, current: boolean) {
    const newValue = !current
    const { error } = await supabase.from('VEHICLE').update({ IS_APPROVED: newValue }).eq('ID', vehicleId)
    if (error) { toast({ variant: 'destructive', title: 'Error', description: error.message }); return }
    toast({ title: newValue ? '✅ Vehicle approved' : '❌ Vehicle unapproved' })
    setVehicles(prev => prev.map(v => v.ID === vehicleId ? { ...v, IS_APPROVED: newValue } : v))
  }

  const pendingCount = vehicles.filter(v => v.IS_APPROVED === false).length

  return (
    <div>
      <PageHeader
        title="Vehicle Approval"
        description={`${vehicles.length} registered vehicles`}
        action={
          <Button variant="outline" size="sm" onClick={fetchVehicles} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        }
      />
      <div className="p-8 space-y-4">
        {/* Migration warning */}
        {!hasApprovalColumn && (
          <Alert variant="warning">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Database migration required</AlertTitle>
            <AlertDescription>
              The <code className="font-mono text-xs">IS_APPROVED</code> column does not exist on the <code className="font-mono text-xs">VEHICLE</code> table yet.
              Run the SQL in <code className="font-mono text-xs">MIGRATION_REQUIRED.sql</code> to enable vehicle approval.
            </AlertDescription>
          </Alert>
        )}

        {hasApprovalColumn && pendingCount > 0 && (
          <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span><strong>{pendingCount}</strong> vehicle(s) pending approval.</span>
          </div>
        )}

        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search by plate, model, driver…" className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
        </div>

        <div className="rounded-lg border bg-card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/40">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Vehicle</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Plate</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Model</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Driver</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Active</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Approval</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Approve</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {loading && Array.from({ length: 4 }).map((_, i) => (
                <tr key={i}>{Array.from({ length: 7 }).map((_, j) => <td key={j} className="px-4 py-3"><Skeleton className="h-5 w-full" /></td>)}</tr>
              ))}
              {!loading && filtered.length === 0 && (
                <tr><td colSpan={7} className="px-4 py-10 text-center text-muted-foreground">No vehicles found</td></tr>
              )}
              {!loading && filtered.map(vehicle => {
                const approved = vehicle.IS_APPROVED !== false
                return (
                  <tr key={vehicle.ID} className="hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3">
                      <span className="text-lg">{VEHICLE_EMOJIS[vehicle.TYPE ?? ''] ?? '🚗'}</span>
                      <span className="ml-2 capitalize font-medium">{vehicle.TYPE ?? '—'}</span>
                    </td>
                    <td className="px-4 py-3 font-mono font-medium">{vehicle.PLATE ?? '—'}</td>
                    <td className="px-4 py-3 text-muted-foreground">{vehicle.MODEL ?? '—'}</td>
                    <td className="px-4 py-3">
                      <p className="font-medium">{vehicle.driver?.FULL_NAME ?? '—'}</p>
                      <p className="text-xs text-muted-foreground">{vehicle.driver?.PHONE_NUMBER ?? ''}</p>
                    </td>
                    <td className="px-4 py-3">
                      {vehicle.IS_ACTIVE ? (
                        <Badge variant="outline" className="bg-green-100 text-green-800 border-0 gap-1"><CheckCircle className="h-3 w-3" />Active</Badge>
                      ) : (
                        <Badge variant="outline" className="bg-gray-100 text-gray-600 border-0 gap-1"><XCircle className="h-3 w-3" />Inactive</Badge>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {!hasApprovalColumn ? (
                        <Badge variant="outline" className="bg-gray-100 text-gray-600 border-0">N/A</Badge>
                      ) : approved ? (
                        <Badge variant="outline" className="bg-green-100 text-green-800 border-0">Approved</Badge>
                      ) : (
                        <Badge variant="outline" className="bg-amber-100 text-amber-800 border-0">Pending</Badge>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <Switch
                        checked={approved}
                        disabled={!hasApprovalColumn}
                        onCheckedChange={() => toggleApproval(vehicle.ID, approved)}
                      />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
