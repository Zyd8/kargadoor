import { useEffect, useState } from 'react'
import {
  Users, Package, Truck, DollarSign, Clock, CheckCircle, XCircle, AlertCircle,
  ShieldAlert, CarFront, TrendingUp, ArrowUpRight,
} from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from 'recharts'
import { supabase } from '@/lib/supabase'
import { DashboardStats } from '@/types'
import { formatCurrency, formatDateShort } from '@/lib/utils'
import { PageHeader } from '@/components/PageHeader'

// ── Types ──────────────────────────────────────────────────────────────────────
interface RecentOrder {
  ID: string
  STATUS: string | null
  PRICE: number | null
  VEHICLE_TYPE: string | null
  CREATED_AT: string | null
  PICKUP_ADDRESS: string | null
  RECIPIENT_ADDRESS: string | null
}

// ── Status helpers ─────────────────────────────────────────────────────────────
const STATUS_META: Record<string, { label: string; color: string; bg: string; bar: string }> = {
  PENDING:     { label: 'Pending',     color: '#D97706', bg: '#FFFBEB', bar: '#F59E0B' },
  IN_PROGRESS: { label: 'In Progress', color: '#2563EB', bg: '#EFF6FF', bar: '#3B82F6' },
  COMPLETE:    { label: 'Completed',   color: '#059669', bg: '#F0FDF4', bar: '#10B981' },
  CANCELLED:   { label: 'Cancelled',   color: '#DC2626', bg: '#FEF2F2', bar: '#EF4444' },
}

// ── Sub-components ─────────────────────────────────────────────────────────────
function StatCard({
  title, value, subtitle, icon: Icon, accent, delay = 0,
}: {
  title: string; value: string | number; subtitle?: string
  icon: React.ElementType; accent: string; delay?: number
}) {
  const [visible, setVisible] = useState(false)
  useEffect(() => { const t = setTimeout(() => setVisible(true), delay); return () => clearTimeout(t) }, [delay])

  return (
    <div className={`stat-card${visible ? ' stat-card--visible' : ''}`} style={{ '--accent': accent } as any}>
      <div className="stat-card__icon-wrap">
        <Icon size={18} />
      </div>
      <div className="stat-card__body">
        <span className="stat-card__title">{title}</span>
        <span className="stat-card__value">{value}</span>
        {subtitle && <span className="stat-card__sub">{subtitle}</span>}
      </div>
      <div className="stat-card__bar" />
    </div>
  )
}

function StatusBadge({ status }: { status: string | null }) {
  const meta = STATUS_META[status ?? ''] ?? { label: status ?? '—', color: '#6B7280', bg: '#F3F4F6' }
  return (
    <span className="status-badge" style={{ color: meta.color, background: meta.bg }}>
      <span className="status-badge__dot" style={{ background: meta.color }} />
      {meta.label}
    </span>
  )
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="chart-tooltip">
      <span className="chart-tooltip__label">{label}</span>
      <span className="chart-tooltip__value">{payload[0].value} orders</span>
    </div>
  )
}

// ── Main Component ─────────────────────────────────────────────────────────────
export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { fetchDashboard() }, [])

  async function fetchDashboard() {
    setLoading(true)
    try {
      const [profilesRes, packagesRes, recentRes, vehiclesRes] = await Promise.all([
        supabase.from('PROFILE').select('ROLE'),
        supabase.from('PACKAGES').select('STATUS, PRICE'),
        supabase.from('PACKAGES').select('ID, STATUS, PRICE, VEHICLE_TYPE, CREATED_AT, PICKUP_ADDRESS, RECIPIENT_ADDRESS').order('CREATED_AT', { ascending: false }).limit(8),
        supabase.from('VEHICLE').select('IS_APPROVED, IS_ACTIVE'),
      ])
      const profiles  = profilesRes.data  ?? []
      const packages  = packagesRes.data  ?? []
      const vehicles  = vehiclesRes.data  ?? []
      const byStatus  = (s: string) => packages.filter(p => p.STATUS === s)
      const revenue   = byStatus('COMPLETE').reduce((sum, p) => sum + (p.PRICE ?? 0), 0)

      setStats({
        totalUsers:            profiles.filter(p => p.ROLE === 'USER').length,
        totalDrivers:          profiles.filter(p => p.ROLE === 'DRIVER').length,
        totalOrders:           packages.length,
        pendingOrders:         byStatus('PENDING').length,
        inProgressOrders:      byStatus('IN_PROGRESS').length,
        completedOrders:       byStatus('COMPLETE').length,
        cancelledOrders:       byStatus('CANCELLED').length,
        totalRevenue:          revenue,
        pendingDriverApprovals: profiles.filter((p: any) => p.ROLE === 'DRIVER' && p.IS_APPROVED === false).length,
        pendingVehicleApprovals: vehicles.filter((v: any) => v.IS_APPROVED === false).length,
      })
      setRecentOrders((recentRes.data ?? []) as RecentOrder[])
    } finally {
      setLoading(false)
    }
  }

  const chartData = stats ? [
    { name: 'Pending',     value: stats.pendingOrders,     color: '#F59E0B' },
    { name: 'In Progress', value: stats.inProgressOrders,  color: '#3B82F6' },
    { name: 'Completed',   value: stats.completedOrders,   color: '#10B981' },
    { name: 'Cancelled',   value: stats.cancelledOrders,   color: '#EF4444' },
  ] : []

  return (
    <>
      {/* ── Styles ─────────────────────────────────────────────────────────── */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600&display=swap');

        :root {
          --orange:       #F47920;
          --orange-dark:  #D9640A;
          --orange-pale:  #FFF4EB;
          --orange-pale2: #FDDCBB;
          --white:        #FFFFFF;
          --gray-50:      #F9FAFB;
          --gray-100:     #F3F4F6;
          --gray-200:     #E5E7EB;
          --gray-300:     #D1D5DB;
          --gray-400:     #9CA3AF;
          --gray-500:     #6B7280;
          --gray-700:     #374151;
          --gray-900:     #111827;
          --radius:       14px;
        }

        .dash-root {
          font-family: 'DM Sans', sans-serif;
          color: var(--gray-900);
          min-height: 100vh;
          background: var(--gray-50);
        }

        /* ── Page header ── */
        .dash-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 28px 36px 0;
          flex-wrap: wrap;
          gap: 12px;
        }
        .dash-header__left {}
        .dash-header__eyebrow {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-family: 'Syne', sans-serif;
          font-size: 10.5px;
          font-weight: 600;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: var(--orange);
          margin-bottom: 6px;
        }
        .dash-header__dot {
          width: 6px; height: 6px;
          border-radius: 50%;
          background: var(--orange);
          animation: blink 2s ease-in-out infinite;
        }
        @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0.3} }

        .dash-header__title {
          font-family: 'Syne', sans-serif;
          font-size: 26px;
          font-weight: 800;
          color: var(--gray-900);
          letter-spacing: -0.025em;
          line-height: 1.1;
        }
        .dash-header__sub {
          font-size: 13.5px;
          color: var(--gray-500);
          margin-top: 4px;
        }
        .dash-header__refresh {
          display: flex;
          align-items: center;
          gap: 7px;
          background: var(--white);
          border: 1.5px solid var(--gray-200);
          border-radius: 9px;
          padding: 9px 16px;
          font-family: 'Syne', sans-serif;
          font-size: 12px;
          font-weight: 600;
          letter-spacing: 0.04em;
          color: var(--gray-700);
          cursor: pointer;
          transition: border-color .18s, box-shadow .18s, color .18s;
        }
        .dash-header__refresh:hover {
          border-color: var(--orange);
          color: var(--orange);
          box-shadow: 0 0 0 3px rgba(244,121,32,0.08);
        }

        /* ── Main content ── */
        .dash-content { padding: 24px 36px 40px; display: flex; flex-direction: column; gap: 24px; }

        /* ── Alert banners ── */
        .alert-row { display: flex; gap: 12px; flex-wrap: wrap; }
        .alert-banner {
          display: flex;
          align-items: center;
          gap: 10px;
          background: #FFFBEB;
          border: 1.5px solid #FDE68A;
          border-radius: 10px;
          padding: 11px 16px;
          font-size: 13px;
          color: #92400E;
          animation: slideDown 0.35s cubic-bezier(0.22,1,0.36,1);
        }
        @keyframes slideDown { from{opacity:0;transform:translateY(-8px)} to{opacity:1;transform:translateY(0)} }
        .alert-banner strong { font-weight: 600; }
        .alert-banner__icon {
          flex-shrink: 0;
          width: 28px; height: 28px;
          background: #FEF3C7;
          border-radius: 7px;
          display: flex; align-items: center; justify-content: center;
          color: #D97706;
        }

        /* ── Stats grid ── */
        .stats-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 14px;
        }
        @media (min-width: 768px)  { .stats-grid { grid-template-columns: repeat(4, 1fr); } }

        /* ── Stat card ── */
        .stat-card {
          background: var(--white);
          border: 1.5px solid var(--gray-200);
          border-radius: var(--radius);
          padding: 20px;
          display: flex;
          align-items: flex-start;
          gap: 14px;
          position: relative;
          overflow: hidden;
          opacity: 0;
          transform: translateY(12px);
          transition: opacity 0.45s cubic-bezier(0.22,1,0.36,1), transform 0.45s cubic-bezier(0.22,1,0.36,1),
                      box-shadow 0.18s, border-color 0.18s;
        }
        .stat-card--visible {
          opacity: 1;
          transform: translateY(0);
        }
        .stat-card:hover {
          border-color: var(--accent, var(--orange));
          box-shadow: 0 4px 20px rgba(0,0,0,0.07);
        }

        /* Left accent bar */
        .stat-card__bar {
          position: absolute;
          left: 0; top: 16%; bottom: 16%;
          width: 3px;
          border-radius: 0 3px 3px 0;
          background: var(--accent, var(--orange));
          opacity: 0;
          transition: opacity 0.2s;
        }
        .stat-card:hover .stat-card__bar { opacity: 1; }

        .stat-card__icon-wrap {
          flex-shrink: 0;
          width: 38px; height: 38px;
          background: color-mix(in srgb, var(--accent, var(--orange)) 12%, white);
          border-radius: 10px;
          display: flex; align-items: center; justify-content: center;
          color: var(--accent, var(--orange));
        }
        .stat-card__body {
          display: flex;
          flex-direction: column;
          gap: 2px;
          min-width: 0;
        }
        .stat-card__title {
          font-size: 11.5px;
          font-weight: 500;
          color: var(--gray-500);
          text-transform: uppercase;
          letter-spacing: 0.06em;
          font-family: 'Syne', sans-serif;
        }
        .stat-card__value {
          font-family: 'Syne', sans-serif;
          font-size: 24px;
          font-weight: 800;
          color: var(--gray-900);
          letter-spacing: -0.02em;
          line-height: 1.1;
        }
        .stat-card__sub {
          font-size: 11px;
          color: var(--gray-400);
          margin-top: 1px;
        }

        /* ── Bottom grid: chart + recent orders ── */
        .bottom-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 20px;
        }
        @media (min-width: 1024px) { .bottom-grid { grid-template-columns: 1fr 1fr; } }

        /* ── Panel ── */
        .panel {
          background: var(--white);
          border: 1.5px solid var(--gray-200);
          border-radius: var(--radius);
          overflow: hidden;
          display: flex;
          flex-direction: column;
          opacity: 0;
          transform: translateY(14px);
          animation: fadeUp 0.55s cubic-bezier(0.22,1,0.36,1) 0.4s forwards;
        }
        @keyframes fadeUp { to { opacity:1; transform:translateY(0); } }

        .panel__header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 18px 22px 16px;
          border-bottom: 1px solid var(--gray-100);
        }
        .panel__title {
          font-family: 'Syne', sans-serif;
          font-size: 13.5px;
          font-weight: 700;
          color: var(--gray-900);
          letter-spacing: -0.01em;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .panel__title-icon {
          width: 26px; height: 26px;
          background: var(--orange-pale);
          border-radius: 7px;
          display: flex; align-items: center; justify-content: center;
          color: var(--orange);
        }
        .panel__body { padding: 20px 22px; flex: 1; }

        /* ── Chart tooltip ── */
        .chart-tooltip {
          background: var(--gray-900);
          border-radius: 8px;
          padding: 9px 14px;
          display: flex;
          flex-direction: column;
          gap: 3px;
          box-shadow: 0 4px 16px rgba(0,0,0,0.2);
        }
        .chart-tooltip__label {
          font-size: 11px;
          color: var(--gray-400);
          font-family: 'Syne', sans-serif;
          text-transform: uppercase;
          letter-spacing: 0.06em;
        }
        .chart-tooltip__value {
          font-size: 15px;
          font-weight: 700;
          color: var(--white);
          font-family: 'Syne', sans-serif;
        }

        /* ── Status badge ── */
        .status-badge {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          font-size: 11px;
          font-weight: 600;
          font-family: 'Syne', sans-serif;
          letter-spacing: 0.04em;
          padding: 3px 9px;
          border-radius: 100px;
          text-transform: uppercase;
          white-space: nowrap;
        }
        .status-badge__dot {
          width: 5px; height: 5px;
          border-radius: 50%;
          flex-shrink: 0;
        }

        /* ── Recent orders ── */
        .orders-list { display: flex; flex-direction: column; }
        .order-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          padding: 12px 22px;
          border-bottom: 1px solid var(--gray-100);
          transition: background 0.14s;
          cursor: default;
        }
        .order-row:last-child { border-bottom: none; }
        .order-row:hover { background: var(--gray-50); }

        .order-row__left { min-width: 0; flex: 1; }
        .order-row__addr {
          font-size: 13px;
          font-weight: 500;
          color: var(--gray-900);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .order-row__date {
          font-size: 11.5px;
          color: var(--gray-400);
          margin-top: 2px;
        }
        .order-row__right {
          display: flex;
          align-items: center;
          gap: 10px;
          flex-shrink: 0;
        }
        .order-row__price {
          font-family: 'Syne', sans-serif;
          font-size: 13.5px;
          font-weight: 700;
          color: var(--gray-900);
        }

        .orders-empty {
          padding: 48px 24px;
          text-align: center;
          font-size: 13.5px;
          color: var(--gray-400);
        }

        /* ── Skeleton ── */
        .skeleton-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 14px;
          padding: 24px 36px;
        }
        @media (min-width: 768px) { .skeleton-grid { grid-template-columns: repeat(4, 1fr); } }
        .skeleton {
          background: linear-gradient(90deg, var(--gray-100) 25%, var(--gray-50) 50%, var(--gray-100) 75%);
          background-size: 200% 100%;
          animation: shimmer 1.4s infinite;
          border-radius: var(--radius);
          height: 96px;
        }
        @keyframes shimmer { from{background-position:200% 0} to{background-position:-200% 0} }

        /* ── Divider ── */
        .section-divider {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: -8px;
        }
        .section-divider__label {
          font-family: 'Syne', sans-serif;
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: var(--gray-400);
          white-space: nowrap;
        }
        .section-divider__line { flex: 1; height: 1px; background: var(--gray-200); }
      `}</style>

      <div className="dash-root">
        {/* Header */}
        <div className="dash-header">
          <div className="dash-header__left">
            <div className="dash-header__eyebrow">
              <div className="dash-header__dot" />
              Kargadoor Admin
            </div>
            <div className="dash-header__title">Dashboard</div>
            <div className="dash-header__sub">Live overview of your logistics platform</div>
          </div>
          <button className="dash-header__refresh" onClick={fetchDashboard}>
            <TrendingUp size={13} />
            Refresh data
          </button>
        </div>

        {loading ? (
          <div className="skeleton-grid">
            {Array.from({ length: 8 }).map((_, i) => <div key={i} className="skeleton" />)}
          </div>
        ) : (
          <div className="dash-content">

            {/* Approval alerts */}
            {((stats?.pendingDriverApprovals ?? 0) > 0 || (stats?.pendingVehicleApprovals ?? 0) > 0) && (
              <div className="alert-row">
                {(stats?.pendingDriverApprovals ?? 0) > 0 && (
                  <div className="alert-banner">
                    <div className="alert-banner__icon"><ShieldAlert size={14} /></div>
                    <span><strong>{stats?.pendingDriverApprovals}</strong> driver{stats?.pendingDriverApprovals !== 1 ? 's' : ''} awaiting approval</span>
                  </div>
                )}
                {(stats?.pendingVehicleApprovals ?? 0) > 0 && (
                  <div className="alert-banner">
                    <div className="alert-banner__icon"><CarFront size={14} /></div>
                    <span><strong>{stats?.pendingVehicleApprovals}</strong> vehicle{stats?.pendingVehicleApprovals !== 1 ? 's' : ''} awaiting approval</span>
                  </div>
                )}
              </div>
            )}

            {/* Section label */}
            <div className="section-divider">
              <span className="section-divider__label">Key Metrics</span>
              <div className="section-divider__line" />
            </div>

            {/* Stats grid — 4 primary */}
            <div className="stats-grid">
              <StatCard delay={0}   title="Total Users"    value={stats?.totalUsers ?? 0}                  icon={Users}        accent="#3B82F6" />
              <StatCard delay={60}  title="Total Drivers"  value={stats?.totalDrivers ?? 0}                icon={Truck}        accent="#8B5CF6" />
              <StatCard delay={120} title="Total Orders"   value={stats?.totalOrders ?? 0}                 icon={Package}      accent={`var(--orange)`} />
              <StatCard delay={180} title="Total Revenue"  value={formatCurrency(stats?.totalRevenue ?? 0)} subtitle="Completed orders only" icon={DollarSign} accent="#10B981" />
            </div>

            {/* Section label */}
            <div className="section-divider">
              <span className="section-divider__label">Order Status</span>
              <div className="section-divider__line" />
            </div>

            {/* Stats grid — 4 status */}
            <div className="stats-grid">
              <StatCard delay={240} title="Pending"     value={stats?.pendingOrders ?? 0}     icon={Clock}         accent="#F59E0B" />
              <StatCard delay={300} title="In Progress" value={stats?.inProgressOrders ?? 0}  icon={AlertCircle}   accent="#3B82F6" />
              <StatCard delay={360} title="Completed"   value={stats?.completedOrders ?? 0}   icon={CheckCircle}   accent="#10B981" />
              <StatCard delay={420} title="Cancelled"   value={stats?.cancelledOrders ?? 0}   icon={XCircle}       accent="#EF4444" />
            </div>

            {/* Bottom row: chart + orders */}
            <div className="bottom-grid">

              {/* Orders by status chart */}
              <div className="panel">
                <div className="panel__header">
                  <div className="panel__title">
                    <div className="panel__title-icon"><TrendingUp size={13} /></div>
                    Orders by Status
                  </div>
                </div>
                <div className="panel__body">
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }} barSize={36}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
                      <XAxis
                        dataKey="name"
                        tick={{ fontSize: 11, fontFamily: 'Syne', fill: '#9CA3AF', fontWeight: 600 }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis
                        tick={{ fontSize: 11, fontFamily: 'Syne', fill: '#9CA3AF' }}
                        axisLine={false}
                        tickLine={false}
                        allowDecimals={false}
                      />
                      <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(0,0,0,0.03)', radius: 6 }} />
                      <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                        {chartData.map((entry, idx) => (
                          <Cell key={idx} fill={entry.color} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Recent orders */}
              <div className="panel">
                <div className="panel__header">
                  <div className="panel__title">
                    <div className="panel__title-icon"><Package size={13} /></div>
                    Recent Orders
                  </div>
                  <ArrowUpRight size={14} style={{ color: 'var(--gray-400)' }} />
                </div>

                <div className="orders-list">
                  {recentOrders.length === 0 ? (
                    <div className="orders-empty">No orders yet</div>
                  ) : (
                    recentOrders.map(order => (
                      <div key={order.ID} className="order-row">
                        <div className="order-row__left">
                          <div className="order-row__addr">{order.PICKUP_ADDRESS ?? '—'}</div>
                          <div className="order-row__date">{formatDateShort(order.CREATED_AT)}</div>
                        </div>
                        <div className="order-row__right">
                          <span className="order-row__price">{formatCurrency(order.PRICE)}</span>
                          <StatusBadge status={order.STATUS} />
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

            </div>
          </div>
        )}
      </div>
    </>
  )
}