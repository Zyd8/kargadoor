import { useEffect, useState } from 'react'
import { Search, RefreshCw, ShieldCheck, ShieldX, ShieldAlert } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { Profile } from '@/types'
import { PageHeader } from '@/components/PageHeader'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { useToast } from '@/components/ui/use-toast'
import { Skeleton } from '@/components/ui/skeleton'
import { AlertCircle } from 'lucide-react'

export default function Drivers() {
  const [drivers, setDrivers] = useState<Profile[]>([])
  const [filtered, setFiltered] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [hasApprovalColumn, setHasApprovalColumn] = useState(true)
  const { toast } = useToast()

  useEffect(() => { fetchDrivers() }, [])

  useEffect(() => {
    let list = drivers
    if (search) {
      const q = search.toLowerCase()
      list = list.filter(d => d.FULL_NAME?.toLowerCase().includes(q) || d.EMAIL?.toLowerCase().includes(q) || d.PHONE_NUMBER?.includes(q))
    }
    setFiltered(list)
  }, [drivers, search])

  async function fetchDrivers() {
    setLoading(true)
    const { data, error } = await supabase
      .from('PROFILE')
      .select('*')
      .eq('ROLE', 'DRIVER')
      .order('FULL_NAME')
    if (error) { toast({ variant: 'destructive', title: 'Error', description: error.message }); setLoading(false); return }
    const list = (data ?? []) as Profile[]
    // Detect if IS_APPROVED column exists
    if (list.length > 0 && !('IS_APPROVED' in list[0])) setHasApprovalColumn(false)
    setDrivers(list)
    setLoading(false)
  }

  async function toggleApproval(driverId: string, currentValue: boolean) {
    const newValue = !currentValue
    const { error } = await supabase
      .from('PROFILE')
      .update({ IS_APPROVED: newValue })
      .eq('ID', driverId)
    if (error) { toast({ variant: 'destructive', title: 'Error', description: error.message }); return }
    toast({ title: newValue ? '✅ Driver approved' : '❌ Driver unapproved' })
    setDrivers(prev => prev.map(d => d.ID === driverId ? { ...d, IS_APPROVED: newValue } : d))
  }

  const pendingCount = drivers.filter(d => d.IS_APPROVED === false).length

  return (
    <div>
      <PageHeader
        title="Driver Approval"
        description={`${drivers.length} registered drivers`}
        action={
          <Button variant="outline" size="sm" onClick={fetchDrivers} disabled={loading}>
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
              The <code className="font-mono text-xs">IS_APPROVED</code> column does not exist on the <code className="font-mono text-xs">PROFILE</code> table yet.
              Run the SQL in <code className="font-mono text-xs">MIGRATION_REQUIRED.sql</code> to enable driver approval.
            </AlertDescription>
          </Alert>
        )}

        {/* Pending badge */}
        {hasApprovalColumn && pendingCount > 0 && (
          <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            <ShieldAlert className="h-4 w-4 shrink-0" />
            <span><strong>{pendingCount}</strong> driver(s) pending approval — they cannot accept orders until approved.</span>
          </div>
        )}

        {/* Search */}
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search drivers…" className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
        </div>

        {/* Table */}
        <div className="rounded-lg border bg-card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/40">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Driver</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Email</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Phone</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Approval Status</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Approve</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {loading && Array.from({ length: 4 }).map((_, i) => (
                <tr key={i}>{Array.from({ length: 5 }).map((_, j) => <td key={j} className="px-4 py-3"><Skeleton className="h-5 w-full" /></td>)}</tr>
              ))}
              {!loading && filtered.length === 0 && (
                <tr><td colSpan={5} className="px-4 py-10 text-center text-muted-foreground">No drivers found</td></tr>
              )}
              {!loading && filtered.map(driver => {
                const approved = driver.IS_APPROVED !== false // treat null/undefined as approved (legacy)
                return (
                  <tr key={driver.ID} className="hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary shrink-0">
                          {driver.FULL_NAME?.[0]?.toUpperCase() ?? 'D'}
                        </div>
                        <span className="font-medium">{driver.FULL_NAME ?? '—'}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{driver.EMAIL ?? '—'}</td>
                    <td className="px-4 py-3 text-muted-foreground">{driver.PHONE_NUMBER ?? '—'}</td>
                    <td className="px-4 py-3">
                      {!hasApprovalColumn ? (
                        <Badge variant="outline" className="bg-gray-100 text-gray-600 border-0">N/A</Badge>
                      ) : approved ? (
                        <Badge variant="outline" className="bg-green-100 text-green-800 border-0 gap-1">
                          <ShieldCheck className="h-3 w-3" /> Approved
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="bg-amber-100 text-amber-800 border-0 gap-1">
                          <ShieldX className="h-3 w-3" /> Pending
                        </Badge>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <Switch
                        checked={approved}
                        disabled={!hasApprovalColumn}
                        onCheckedChange={() => toggleApproval(driver.ID, approved)}
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
