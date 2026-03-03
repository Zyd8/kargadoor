import { useEffect, useState } from 'react'
import {
  Users, Package, Truck, DollarSign, Clock, CheckCircle, XCircle, AlertCircle,
  ShieldAlert, CarFront,
} from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from 'recharts'
import { supabase } from '@/lib/supabase'
import { DashboardStats } from '@/types'
import { formatCurrency, formatDateShort } from '@/lib/utils'
import { StatsCard } from '@/components/StatsCard'
import { PageHeader } from '@/components/PageHeader'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'

const STATUS_COLORS_MAP: Record<string, string> = {
  PENDING: '#F59E0B',
  IN_PROGRESS: '#3B82F6',
  COMPLETE: '#10B981',
  CANCELLED: '#EF4444',
}

interface RecentOrder {
  ID: string
  STATUS: string | null
  PRICE: number | null
  VEHICLE_TYPE: string | null
  CREATED_AT: string | null
  PICKUP_ADDRESS: string | null
  RECIPIENT_ADDRESS: string | null
}

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchDashboard()
  }, [])

  async function fetchDashboard() {
    setLoading(true)
    try {
      const [profilesRes, packagesRes, recentRes, vehiclesRes] = await Promise.all([
        supabase.from('PROFILE').select('ROLE'),
        supabase.from('PACKAGES').select('STATUS, PRICE'),
        supabase.from('PACKAGES').select('ID, STATUS, PRICE, VEHICLE_TYPE, CREATED_AT, PICKUP_ADDRESS, RECIPIENT_ADDRESS').order('CREATED_AT', { ascending: false }).limit(8),
        supabase.from('VEHICLE').select('IS_APPROVED, IS_ACTIVE'),
      ])

      const profiles = profilesRes.data ?? []
      const packages = packagesRes.data ?? []
      const vehicles = vehiclesRes.data ?? []

      const totalUsers = profiles.filter(p => p.ROLE === 'USER').length
      const totalDrivers = profiles.filter(p => p.ROLE === 'DRIVER').length
      const byStatus = (s: string) => packages.filter(p => p.STATUS === s)
      const revenue = packages.filter(p => p.STATUS === 'COMPLETE').reduce((sum, p) => sum + (p.PRICE ?? 0), 0)

      // Check for IS_APPROVED column (may not exist yet)
      const pendingDriverApprovals = profiles.filter((p: any) => p.ROLE === 'DRIVER' && p.IS_APPROVED === false).length
      const pendingVehicleApprovals = vehicles.filter((v: any) => v.IS_APPROVED === false).length

      setStats({
        totalUsers,
        totalDrivers,
        totalOrders: packages.length,
        pendingOrders: byStatus('PENDING').length,
        inProgressOrders: byStatus('IN_PROGRESS').length,
        completedOrders: byStatus('COMPLETE').length,
        cancelledOrders: byStatus('CANCELLED').length,
        totalRevenue: revenue,
        pendingDriverApprovals,
        pendingVehicleApprovals,
      })
      setRecentOrders((recentRes.data ?? []) as RecentOrder[])
    } finally {
      setLoading(false)
    }
  }

  const chartData = stats
    ? [
        { name: 'Pending', value: stats.pendingOrders, color: '#F59E0B' },
        { name: 'In Progress', value: stats.inProgressOrders, color: '#3B82F6' },
        { name: 'Completed', value: stats.completedOrders, color: '#10B981' },
        { name: 'Cancelled', value: stats.cancelledOrders, color: '#EF4444' },
      ]
    : []

  if (loading) {
    return (
      <div>
        <PageHeader title="Dashboard" description="Overview of your logistics platform" />
        <div className="p-8 space-y-6">
          <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div>
      <PageHeader title="Dashboard" description="Overview of your logistics platform" />
      <div className="p-8 space-y-6">
        {/* Stats grid */}
        <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
          <StatsCard title="Total Users" value={stats?.totalUsers ?? 0} icon={Users} iconBg="bg-blue-100" iconColor="text-blue-600" />
          <StatsCard title="Total Drivers" value={stats?.totalDrivers ?? 0} icon={Truck} iconBg="bg-green-100" iconColor="text-green-600" />
          <StatsCard title="Total Orders" value={stats?.totalOrders ?? 0} icon={Package} iconBg="bg-purple-100" iconColor="text-purple-600" />
          <StatsCard title="Total Revenue" value={formatCurrency(stats?.totalRevenue ?? 0)} subtitle="Completed orders only" icon={DollarSign} iconBg="bg-emerald-100" iconColor="text-emerald-600" />
          <StatsCard title="Pending Orders" value={stats?.pendingOrders ?? 0} icon={Clock} iconBg="bg-amber-100" iconColor="text-amber-600" />
          <StatsCard title="In Progress" value={stats?.inProgressOrders ?? 0} icon={AlertCircle} iconBg="bg-blue-100" iconColor="text-blue-600" />
          <StatsCard title="Completed" value={stats?.completedOrders ?? 0} icon={CheckCircle} iconBg="bg-green-100" iconColor="text-green-600" />
          <StatsCard title="Cancelled" value={stats?.cancelledOrders ?? 0} icon={XCircle} iconBg="bg-red-100" iconColor="text-red-600" />
        </div>

        {/* Approvals alert */}
        {((stats?.pendingDriverApprovals ?? 0) > 0 || (stats?.pendingVehicleApprovals ?? 0) > 0) && (
          <div className="flex gap-3">
            {(stats?.pendingDriverApprovals ?? 0) > 0 && (
              <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                <ShieldAlert className="h-4 w-4 shrink-0" />
                <span><strong>{stats?.pendingDriverApprovals}</strong> driver(s) awaiting approval</span>
              </div>
            )}
            {(stats?.pendingVehicleApprovals ?? 0) > 0 && (
              <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                <CarFront className="h-4 w-4 shrink-0" />
                <span><strong>{stats?.pendingVehicleApprovals}</strong> vehicle(s) awaiting approval</span>
              </div>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Orders by Status</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                  <Tooltip formatter={(v) => [v, 'Orders']} />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                    {chartData.map((entry, idx) => (
                      <Cell key={idx} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Recent orders */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Recent Orders</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y">
                {recentOrders.length === 0 && (
                  <p className="px-6 py-8 text-center text-sm text-muted-foreground">No orders yet</p>
                )}
                {recentOrders.map(order => (
                  <div key={order.ID} className="flex items-center justify-between px-6 py-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{order.PICKUP_ADDRESS ?? '—'}</p>
                      <p className="truncate text-xs text-muted-foreground">{formatDateShort(order.CREATED_AT)}</p>
                    </div>
                    <div className="ml-4 flex items-center gap-2 shrink-0">
                      <span className="text-sm font-medium">{formatCurrency(order.PRICE)}</span>
                      <Badge
                        className={
                          order.STATUS === 'COMPLETE' ? 'bg-green-100 text-green-800 border-0' :
                          order.STATUS === 'PENDING' ? 'bg-amber-100 text-amber-800 border-0' :
                          order.STATUS === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-800 border-0' :
                          'bg-red-100 text-red-800 border-0'
                        }
                        variant="outline"
                      >
                        {order.STATUS}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
