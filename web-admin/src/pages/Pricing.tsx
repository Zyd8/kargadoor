import { useEffect, useState } from 'react'
import { RefreshCw, AlertCircle, Pencil, X, Check } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { PricingConfig } from '@/types'
import { ALL_VEHICLE_TYPES, formatCurrency, formatDate } from '@/lib/utils'
import { PageHeader } from '@/components/PageHeader'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { useToast } from '@/components/ui/use-toast'
import { Skeleton } from '@/components/ui/skeleton'

interface EditState {
  vehicleType: string
  baseFare: string
  perKmRate: string
}

export default function Pricing() {
  const [configs, setConfigs] = useState<PricingConfig[]>([])
  const [loading, setLoading] = useState(true)
  const [hasTable, setHasTable] = useState(true)
  const [editing, setEditing] = useState<EditState | null>(null)
  const [saving, setSaving] = useState(false)
  const { toast } = useToast()

  useEffect(() => { fetchPricing() }, [])

  async function fetchPricing() {
    setLoading(true)
    const { data, error } = await supabase.from('PRICING_CONFIG').select('*').order('VEHICLE_TYPE')
    if (error) {
      setHasTable(false)
      setLoading(false)
      return
    }
    setHasTable(true)
    setConfigs(data ?? [])
    setLoading(false)
  }

  function startEdit(vehicleType: string, baseFare: number, perKmRate: number) {
    setEditing({ vehicleType, baseFare: baseFare.toString(), perKmRate: perKmRate.toString() })
  }

  function cancelEdit() { setEditing(null) }

  async function saveEdit() {
    if (!editing) return
    const base = parseFloat(editing.baseFare)
    const perKm = parseFloat(editing.perKmRate)
    if (isNaN(base) || isNaN(perKm) || base < 0 || perKm < 0) {
      toast({ variant: 'destructive', title: 'Invalid values', description: 'Fares must be positive numbers.' })
      return
    }
    setSaving(true)
    const { error } = await supabase
      .from('PRICING_CONFIG')
      .upsert({
        VEHICLE_TYPE: editing.vehicleType,
        BASE_FARE: base,
        PER_KM_RATE: perKm,
        UPDATED_AT: new Date().toISOString(),
      }, { onConflict: 'VEHICLE_TYPE' })

    if (error) {
      toast({ variant: 'destructive', title: 'Save failed', description: error.message })
      setSaving(false)
      return
    }
    toast({ title: '✅ Pricing updated', description: `${editing.vehicleType} rates saved.` })
    setConfigs(prev => {
      const exists = prev.find(c => c.VEHICLE_TYPE === editing.vehicleType)
      if (exists) {
        return prev.map(c => c.VEHICLE_TYPE === editing.vehicleType
          ? { ...c, BASE_FARE: base, PER_KM_RATE: perKm, UPDATED_AT: new Date().toISOString() }
          : c
        )
      }
      return [...prev, {
        ID: crypto.randomUUID(),
        VEHICLE_TYPE: editing.vehicleType,
        BASE_FARE: base,
        PER_KM_RATE: perKm,
        UPDATED_AT: new Date().toISOString(),
      }]
    })
    setEditing(null)
    setSaving(false)
  }

  // Merge DB configs with the full vehicle type list
  const rows = ALL_VEHICLE_TYPES.map(vt => {
    const config = configs.find(c => c.VEHICLE_TYPE === vt.type)
    return {
      ...vt,
      baseFare: config?.BASE_FARE ?? 0,
      perKmRate: config?.PER_KM_RATE ?? 0,
      updatedAt: config?.UPDATED_AT ?? null,
    }
  })

  return (
    <div>
      <PageHeader
        title="Pricing Configuration"
        description="Configure base fare and per-km rate for each vehicle type"
        action={
          <Button variant="outline" size="sm" onClick={fetchPricing} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        }
      />
      <div className="p-8 space-y-6">
        {/* Migration warning */}
        {!hasTable && (
          <Alert variant="warning">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>PRICING_CONFIG table not found</AlertTitle>
            <AlertDescription>
              Run the SQL in <code className="font-mono text-xs">migrations/MIGRATION_REQUIRED.sql</code> to create the pricing configuration table.
            </AlertDescription>
          </Alert>
        )}

        {/* Info card */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">How pricing works</CardTitle>
            <CardDescription>
              Total price = <strong>Base Fare</strong> + (<strong>Per-km Rate</strong> × distance in km).
              Distance is calculated using the Haversine formula between pickup and dropoff coordinates.
            </CardDescription>
          </CardHeader>
        </Card>

        {/* Pricing table */}
        <div className="rounded-lg border bg-card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/40">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Vehicle Type</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Base Fare (₱)</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Per Km (₱)</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Sample (5 km)</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Last Updated</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {loading && ALL_VEHICLE_TYPES.map((_, i) => (
                <tr key={i}>{Array.from({ length: 6 }).map((_, j) => <td key={j} className="px-4 py-3"><Skeleton className="h-5 w-full" /></td>)}</tr>
              ))}
              {!loading && rows.map(row => {
                const isEditing = editing?.vehicleType === row.type
                return (
                  <tr key={row.type} className="hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3">
                      <span className="text-base mr-2">{row.emoji}</span>
                      <span className="font-medium capitalize">{row.label}</span>
                    </td>
                    <td className="px-4 py-3">
                      {isEditing ? (
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          className="h-7 w-24 text-xs"
                          value={editing.baseFare}
                          onChange={e => setEditing(prev => prev ? { ...prev, baseFare: e.target.value } : prev)}
                        />
                      ) : (
                        <span className="font-mono">{formatCurrency(row.baseFare)}</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {isEditing ? (
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          className="h-7 w-24 text-xs"
                          value={editing.perKmRate}
                          onChange={e => setEditing(prev => prev ? { ...prev, perKmRate: e.target.value } : prev)}
                        />
                      ) : (
                        <span className="font-mono">{formatCurrency(row.perKmRate)}/km</span>
                      )}
                    </td>
                    <td className="px-4 py-3 font-mono text-muted-foreground">
                      {isEditing
                        ? formatCurrency(parseFloat(editing.baseFare || '0') + parseFloat(editing.perKmRate || '0') * 5)
                        : formatCurrency(row.baseFare + row.perKmRate * 5)
                      }
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {row.updatedAt ? formatDate(row.updatedAt) : '—'}
                    </td>
                    <td className="px-4 py-3">
                      {hasTable && (
                        isEditing ? (
                          <div className="flex gap-1">
                            <Button size="icon" variant="ghost" className="h-7 w-7 text-primary" onClick={saveEdit} disabled={saving}>
                              <Check className="h-3.5 w-3.5" />
                            </Button>
                            <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground" onClick={cancelEdit}>
                              <X className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        ) : (
                          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => startEdit(row.type, row.baseFare, row.perKmRate)}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                        )
                      )}
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
