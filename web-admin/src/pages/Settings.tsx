import { useEffect, useState } from 'react'
import { MapPin, RefreshCw, AlertCircle, Save } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { PageHeader } from '@/components/PageHeader'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { useToast } from '@/components/ui/use-toast'
import { Skeleton } from '@/components/ui/skeleton'

const RADIUS_KEY = 'delivery_radius_meters'
const RADIUS_DEFAULT = 100

interface AppConfig {
  KEY: string
  VALUE: string
  DESCRIPTION: string | null
  UPDATED_AT: string | null
}

export default function Settings() {
  const [config, setConfig] = useState<AppConfig | null>(null)
  const [radius, setRadius] = useState(RADIUS_DEFAULT.toString())
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [hasTable, setHasTable] = useState(true)
  const { toast } = useToast()

  useEffect(() => { fetchConfig() }, [])

  async function fetchConfig() {
    setLoading(true)
    const { data, error } = await supabase
      .from('APP_CONFIG')
      .select('*')
      .eq('KEY', RADIUS_KEY)
      .single()

    if (error) {
      setHasTable(false)
      setLoading(false)
      return
    }

    setHasTable(true)
    setConfig(data)
    setRadius(data?.VALUE ?? RADIUS_DEFAULT.toString())
    setLoading(false)
  }

  async function save() {
    const val = parseInt(radius, 10)
    if (isNaN(val) || val < 10 || val > 10000) {
      toast({ variant: 'destructive', title: 'Invalid radius', description: 'Must be between 10 and 10,000 meters.' })
      return
    }
    setSaving(true)
    const { error } = await supabase
      .from('APP_CONFIG')
      .upsert({ KEY: RADIUS_KEY, VALUE: val.toString(), UPDATED_AT: new Date().toISOString() })
    if (error) {
      toast({ variant: 'destructive', title: 'Save failed', description: error.message })
      setSaving(false)
      return
    }
    toast({ title: '✅ Settings saved', description: `Delivery radius set to ${val} m.` })
    await fetchConfig()
    setSaving(false)
  }

  const radiusNum = parseInt(radius, 10)
  const isValid = !isNaN(radiusNum) && radiusNum >= 10 && radiusNum <= 10000

  // Visual scale: map radiusNum (10–10000) to a circle size (20–140 px)
  const circleSize = Math.max(20, Math.min(140, (radiusNum / 10000) * 140 + 20))

  return (
    <div>
      <PageHeader
        title="Settings"
        description="App-wide configuration for the logistics platform"
        action={
          <Button variant="outline" size="sm" onClick={fetchConfig} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        }
      />
      <div className="p-8 space-y-6 max-w-2xl">

        {!hasTable && (
          <Alert variant="warning">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>APP_CONFIG table not found</AlertTitle>
            <AlertDescription>
              Run the SQL in <code className="font-mono text-xs">migrations/MIGRATION_REQUIRED.sql</code> to create the app configuration table.
            </AlertDescription>
          </Alert>
        )}

        {/* Delivery radius card */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100">
                <MapPin className="h-4 w-4 text-blue-600" />
              </div>
              <div>
                <CardTitle className="text-base">Delivery Radius</CardTitle>
                <CardDescription>
                  How close (in meters) a driver must be to the dropoff location before they can mark the order as delivered.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {loading ? (
              <Skeleton className="h-9 w-48" />
            ) : (
              <>
                <div className="flex items-end gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="radius">Radius (meters)</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        id="radius"
                        type="number"
                        min={10}
                        max={10000}
                        step={10}
                        value={radius}
                        onChange={e => setRadius(e.target.value)}
                        className="w-36"
                        disabled={!hasTable}
                      />
                      <span className="text-sm text-muted-foreground">m</span>
                    </div>
                    <p className="text-xs text-muted-foreground">Min 10 m · Max 10,000 m</p>
                  </div>

                  {/* Visual circle preview */}
                  <div className="flex flex-1 items-center justify-center pb-1">
                    <div className="relative flex items-center justify-center">
                      <div
                        className="rounded-full border-2 border-dashed border-blue-400 bg-blue-50 transition-all duration-300"
                        style={{ width: circleSize, height: circleSize }}
                      />
                      <MapPin className="absolute h-4 w-4 text-blue-600" />
                      {isValid && (
                        <span className="absolute -bottom-5 text-xs text-muted-foreground whitespace-nowrap">
                          {radiusNum} m radius
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Presets */}
                <div className="flex flex-wrap gap-2">
                  <p className="w-full text-xs text-muted-foreground">Quick presets:</p>
                  {[50, 100, 150, 200, 500].map(v => (
                    <button
                      key={v}
                      onClick={() => setRadius(v.toString())}
                      className={`rounded-md border px-3 py-1 text-xs font-medium transition-colors ${
                        radiusNum === v
                          ? 'border-primary bg-primary text-primary-foreground'
                          : 'border-input bg-background hover:bg-accent'
                      }`}
                      disabled={!hasTable}
                    >
                      {v} m
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-3 border-t pt-4">
                  <Button onClick={save} disabled={saving || !hasTable || !isValid} className="gap-2">
                    <Save className="h-4 w-4" />
                    {saving ? 'Saving…' : 'Save Changes'}
                  </Button>
                  {config?.UPDATED_AT && (
                    <p className="text-xs text-muted-foreground">
                      Last updated: {new Date(config.UPDATED_AT).toLocaleString()}
                    </p>
                  )}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Integration note */}
        {hasTable && (
          <Alert variant="info">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Mobile app integration</AlertTitle>
            <AlertDescription className="space-y-1">
              <p>The mobile app should fetch this value from the <code className="font-mono text-xs">APP_CONFIG</code> table at startup:</p>
              <pre className="mt-1 rounded bg-muted px-2 py-1.5 text-xs font-mono overflow-x-auto">
{`supabase.from('APP_CONFIG')
  .select('VALUE')
  .eq('KEY', 'delivery_radius_meters')
  .single()`}
              </pre>
              <p className="pt-1">Use the returned value (in meters) to check if the driver's GPS location is within range of the dropoff coordinates before enabling the "Mark as Delivered" button.</p>
            </AlertDescription>
          </Alert>
        )}
      </div>
    </div>
  )
}
