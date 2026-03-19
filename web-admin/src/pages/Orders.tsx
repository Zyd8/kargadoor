import { useEffect, useState } from 'react'
import { Search, RefreshCw, Eye, Package as PackageIcon, X, Copy, Check, MapPin, User, Truck } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { Package } from '@/types'
import { formatCurrency, formatDate, VEHICLE_EMOJIS } from '@/lib/utils'
import { useToast } from '@/components/ui/use-toast'

// ── Status config ──────────────────────────────────────────────────────────────
const STATUS_META: Record<string, { label: string; color: string; bg: string }> = {
  PENDING:     { label: 'Pending',     color: '#D97706', bg: '#FFFBEB' },
  IN_PROGRESS: { label: 'In Progress', color: '#2563EB', bg: '#EFF6FF' },
  COMPLETE:    { label: 'Completed',   color: '#059669', bg: '#F0FDF4' },
  CANCELLED:   { label: 'Cancelled',   color: '#DC2626', bg: '#FEF2F2' },
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

// ── Detail drawer ──────────────────────────────────────────────────────────────
function OrderDrawer({ order, onClose, onCopy }: { order: Package; onClose: () => void; onCopy: (text: string) => void }) {
  const [copied, setCopied] = useState(false)
  const TRACKING_WEBSITE_URL = 'https://kargadoorshare.vercel.app'
  const trackUrl = order.TRACKING_TOKEN ? `${TRACKING_WEBSITE_URL}/track/${order.TRACKING_TOKEN}` : null

  function handleCopy() {
    if (!trackUrl) return
    onCopy(trackUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="drawer-overlay" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="drawer">
        {/* Drawer header */}
        <div className="drawer__header">
          <div>
            <div className="drawer__eyebrow">Order Details</div>
            <div className="drawer__id">#{order.ID?.slice(0, 8).toUpperCase()}</div>
          </div>
          <button className="drawer__close" onClick={onClose}><X size={16} /></button>
        </div>

        <div className="drawer__body">
          {/* Status + Price hero */}
          <div className="drawer__hero">
            <div className="drawer__hero-status">
              <StatusBadge status={order.STATUS} />
            </div>
            <div className="drawer__hero-price">{formatCurrency(order.PRICE)}</div>
          </div>

          {/* Route */}
          <div className="detail-section">
            <div className="detail-section__label">
              <MapPin size={12} /> Route
            </div>
            <div className="route-card">
              <div className="route-card__row">
                <div className="route-card__dot route-card__dot--pickup" />
                <div>
                  <div className="route-card__tag">Pickup</div>
                  <div className="route-card__addr">{order.PICKUP_ADDRESS ?? '—'}</div>
                </div>
              </div>
              <div className="route-card__line" />
              <div className="route-card__row">
                <div className="route-card__dot route-card__dot--drop" />
                <div>
                  <div className="route-card__tag">Dropoff</div>
                  <div className="route-card__addr">{order.RECIPIENT_ADDRESS ?? '—'}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Info grid */}
          <div className="detail-section">
            <div className="detail-section__label">
              <PackageIcon size={12} /> Package Info
            </div>
            <div className="info-grid">
              <div className="info-cell">
                <div className="info-cell__label">Vehicle</div>
                <div className="info-cell__value">
                  {VEHICLE_EMOJIS[order.VEHICLE_TYPE ?? ''] ?? '🚚'} <span style={{ textTransform: 'capitalize' }}>{order.VEHICLE_TYPE ?? '—'}</span>
                </div>
              </div>
              <div className="info-cell">
                <div className="info-cell__label">Payment</div>
                <div className="info-cell__value">{order.PAYMENT_METHOD ?? '—'}</div>
              </div>
              <div className="info-cell">
                <div className="info-cell__label">Item Type</div>
                <div className="info-cell__value">{order.ITEM_TYPES ?? '—'}</div>
              </div>
              <div className="info-cell">
                <div className="info-cell__label">Notes</div>
                <div className="info-cell__value">{order.NOTES ?? '—'}</div>
              </div>
              <div className="info-cell">
                <div className="info-cell__label">Created</div>
                <div className="info-cell__value">{formatDate(order.CREATED_AT)}</div>
              </div>
              <div className="info-cell">
                <div className="info-cell__label">Completed</div>
                <div className="info-cell__value">{formatDate(order.COMPLETED_AT)}</div>
              </div>
            </div>
          </div>

          {/* People */}
          <div className="detail-section">
            <div className="detail-section__label">
              <User size={12} /> People
            </div>
            <div className="people-grid">
              <div className="person-card">
                <div className="person-card__role">Recipient</div>
                <div className="person-card__name">{order.RECIPIENT_NAME ?? '—'}</div>
                <div className="person-card__sub">{order.RECIPIENT_NUMBER ?? '—'}</div>
              </div>
              <div className="person-card">
                <div className="person-card__role">Sender</div>
                <div className="person-card__name">{(order as any).sender?.FULL_NAME ?? '—'}</div>
                <div className="person-card__sub">{(order as any).sender?.EMAIL ?? '—'}</div>
              </div>
              {(order as any).driver && (
                <div className="person-card person-card--driver">
                  <div className="person-card__role">
                    <Truck size={10} style={{ display: 'inline', marginRight: 4 }} />
                    Driver
                  </div>
                  <div className="person-card__name">{(order as any).driver.FULL_NAME ?? '—'}</div>
                  <div className="person-card__sub">{(order as any).driver.PHONE_NUMBER ?? '—'}</div>
                </div>
              )}
            </div>
          </div>

          {/* Tracking */}
          {trackUrl && order.STATUS === 'IN_PROGRESS' && (
            <div className="detail-section">
              <div className="detail-section__label">Tracking URL</div>
              <div className="tracking-box">
                <code className="tracking-box__url">{trackUrl}</code>
                <button className="tracking-box__copy" onClick={handleCopy}>
                  {copied ? <Check size={13} /> : <Copy size={13} />}
                  {copied ? 'Copied!' : 'Copy'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Main ───────────────────────────────────────────────────────────────────────
export default function Orders() {
  const [orders, setOrders]     = useState<Package[]>([])
  const [filtered, setFiltered] = useState<Package[]>([])
  const [loading, setLoading]   = useState(true)
  const [search, setSearch]     = useState('')
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
      .select(`*, sender:SENDER_ID(ID,FULL_NAME,EMAIL,PHONE_NUMBER,AVATAR_URL,ROLE,PUSH_TOKEN), driver:DRIVER_ID(ID,FULL_NAME,EMAIL,PHONE_NUMBER,AVATAR_URL,ROLE,PUSH_TOKEN)`)
      .order('CREATED_AT', { ascending: false })
    if (error) { toast({ variant: 'destructive', title: 'Error', description: error.message }); setLoading(false); return }
    setOrders((data ?? []) as Package[])
    setLoading(false)
  }

  // Counts per status for chips
  const counts: Record<string, number> = { all: orders.length }
  Object.keys(STATUS_META).forEach(s => { counts[s] = orders.filter(o => o.STATUS === s).length })

  return (
    <>
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

        .orders-root {
          font-family: 'DM Sans', sans-serif;
          color: var(--gray-900);
          min-height: 100vh;
          background: var(--gray-50);
        }

        /* ── Header ── */
        .orders-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          padding: 28px 36px 0;
          flex-wrap: wrap;
          gap: 14px;
        }
        .orders-header__eyebrow {
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
        .orders-header__dot {
          width: 6px; height: 6px;
          border-radius: 50%;
          background: var(--orange);
          animation: blink 2s ease-in-out infinite;
        }
        @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0.3} }
        .orders-header__title {
          font-family: 'Syne', sans-serif;
          font-size: 26px;
          font-weight: 800;
          color: var(--gray-900);
          letter-spacing: -0.025em;
        }
        .orders-header__sub {
          font-size: 13.5px;
          color: var(--gray-500);
          margin-top: 4px;
        }
        .refresh-btn {
          display: inline-flex;
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
        .refresh-btn:hover:not(:disabled) { border-color: var(--orange); color: var(--orange); box-shadow: 0 0 0 3px rgba(244,121,32,0.08); }
        .refresh-btn:disabled { opacity: 0.6; cursor: not-allowed; }
        .spin { animation: spin 0.8s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }

        /* ── Content ── */
        .orders-content { padding: 22px 36px 40px; display: flex; flex-direction: column; gap: 18px; }

        /* ── Toolbar ── */
        .toolbar { display: flex; gap: 12px; flex-wrap: wrap; align-items: center; }

        .search-wrap { position: relative; flex: 1; min-width: 200px; max-width: 340px; }
        .search-icon { position: absolute; left: 12px; top: 50%; transform: translateY(-50%); color: var(--gray-400); pointer-events: none; width: 15px; height: 15px; }
        .search-input {
          width: 100%;
          background: var(--white);
          border: 1.5px solid var(--gray-200);
          border-radius: 10px;
          padding: 10px 13px 10px 36px;
          font-family: 'DM Sans', sans-serif;
          font-size: 13.5px;
          color: var(--gray-900);
          outline: none;
          transition: border-color .18s, box-shadow .18s;
        }
        .search-input::placeholder { color: var(--gray-400); }
        .search-input:focus { border-color: var(--orange); box-shadow: 0 0 0 3px rgba(244,121,32,0.1); }

        .filter-chips { display: flex; gap: 6px; flex-wrap: wrap; }
        .chip {
          display: inline-flex; align-items: center; gap: 5px;
          padding: 6px 13px;
          border-radius: 100px;
          border: 1.5px solid var(--gray-200);
          background: var(--white);
          font-family: 'Syne', sans-serif;
          font-size: 11.5px; font-weight: 600; letter-spacing: 0.04em;
          color: var(--gray-500);
          cursor: pointer;
          transition: all .15s;
        }
        .chip:hover { border-color: var(--orange); color: var(--orange); }
        .chip.active { background: var(--orange); border-color: var(--orange); color: var(--white); }
        .chip__count { font-size: 10px; background: rgba(0,0,0,0.12); border-radius: 100px; padding: 1px 6px; font-weight: 700; }
        .chip.active .chip__count { background: rgba(255,255,255,0.25); }

        /* ── Table panel ── */
        .table-panel {
          background: var(--white);
          border: 1.5px solid var(--gray-200);
          border-radius: var(--radius);
          overflow: hidden;
          opacity: 0;
          transform: translateY(12px);
          animation: fadeUp 0.5s cubic-bezier(0.22,1,0.36,1) 0.1s forwards;
        }
        @keyframes fadeUp { to { opacity:1; transform:translateY(0); } }

        .data-table { width: 100%; border-collapse: collapse; }
        .data-table thead tr { background: var(--gray-50); border-bottom: 1.5px solid var(--gray-200); }
        .data-table th {
          padding: 11px 16px;
          text-align: left;
          font-family: 'Syne', sans-serif;
          font-size: 10.5px; font-weight: 700;
          letter-spacing: 0.1em; text-transform: uppercase;
          color: var(--gray-400); white-space: nowrap;
        }
        .data-table th:first-child { padding-left: 22px; }
        .data-table th:last-child  { padding-right: 22px; text-align: right; }

        .data-table tbody tr {
          border-bottom: 1px solid var(--gray-100);
          transition: background 0.12s;
          opacity: 0;
          animation: rowIn 0.35s ease forwards;
        }
        .data-table tbody tr:last-child { border-bottom: none; }
        .data-table tbody tr:hover { background: var(--gray-50); }
        @keyframes rowIn { to { opacity:1; } }

        .data-table td { padding: 13px 16px; font-size: 13px; color: var(--gray-700); vertical-align: middle; }
        .data-table td:first-child { padding-left: 22px; }
        .data-table td:last-child  { padding-right: 22px; }

        /* Address cell */
        .addr-cell { max-width: 150px; }
        .addr-text { display: block; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-size: 12.5px; color: var(--gray-700); }

        /* Recipient cell */
        .recipient-name { font-weight: 500; color: var(--gray-900); font-size: 13px; }
        .recipient-phone { font-size: 11.5px; color: var(--gray-400); margin-top: 1px; }

        /* Vehicle cell */
        .vehicle-cell { display: flex; align-items: center; gap: 6px; font-size: 12.5px; }
        .vehicle-emoji { font-size: 16px; line-height: 1; }
        .vehicle-label { text-transform: capitalize; color: var(--gray-600); }

        /* Price */
        .price-val { font-family: 'Syne', sans-serif; font-weight: 700; font-size: 13px; color: var(--gray-900); }

        /* Date */
        .date-val { font-size: 12px; color: var(--gray-400); white-space: nowrap; }

        /* Status badge */
        .status-badge {
          display: inline-flex; align-items: center; gap: 5px;
          font-size: 11px; font-weight: 600;
          font-family: 'Syne', sans-serif;
          letter-spacing: 0.04em; text-transform: uppercase;
          padding: 3px 9px; border-radius: 100px;
          white-space: nowrap;
        }
        .status-badge__dot { width: 5px; height: 5px; border-radius: 50%; flex-shrink: 0; }

        /* View btn */
        .view-btn {
          display: inline-flex; align-items: center; justify-content: center;
          width: 32px; height: 32px;
          border: 1.5px solid var(--gray-200);
          border-radius: 8px;
          background: var(--white);
          color: var(--gray-500);
          cursor: pointer;
          transition: all .15s;
          float: right;
        }
        .view-btn:hover { border-color: var(--orange); color: var(--orange); background: var(--orange-pale); }

        /* Empty */
        .empty-row td { padding: 52px 24px; text-align: center; color: var(--gray-400); font-size: 13.5px; }
        .empty-icon {
          width: 40px; height: 40px; background: var(--gray-100); border-radius: 10px;
          display: flex; align-items: center; justify-content: center;
          margin: 0 auto 10px; color: var(--gray-400);
        }

        /* Skeleton */
        .skel {
          border-radius: 6px;
          background: linear-gradient(90deg, var(--gray-100) 25%, var(--gray-50) 50%, var(--gray-100) 75%);
          background-size: 200% 100%;
          animation: shimmer 1.4s infinite;
          display: block;
        }
        @keyframes shimmer { from{background-position:200% 0} to{background-position:-200% 0} }

        /* Result count */
        .result-count {
          font-size: 12px; color: var(--gray-400);
          font-family: 'Syne', sans-serif; font-weight: 600; letter-spacing: 0.04em;
          padding: 13px 22px; border-top: 1px solid var(--gray-100);
          text-transform: uppercase;
        }

        /* ── Drawer ── */
        .drawer-overlay {
          position: fixed; inset: 0; z-index: 50;
          background: rgba(17,24,39,0.35);
          backdrop-filter: blur(3px);
          display: flex; align-items: stretch; justify-content: flex-end;
          animation: overlayIn 0.2s ease;
        }
        @keyframes overlayIn { from{opacity:0} to{opacity:1} }

        .drawer {
          width: 100%; max-width: 420px;
          background: var(--white);
          height: 100%;
          overflow-y: auto;
          display: flex; flex-direction: column;
          box-shadow: -8px 0 40px rgba(0,0,0,0.12);
          animation: drawerIn 0.3s cubic-bezier(0.22,1,0.36,1);
        }
        @keyframes drawerIn { from{transform:translateX(100%)} to{transform:translateX(0)} }

        .drawer__header {
          display: flex; align-items: flex-start; justify-content: space-between;
          padding: 24px 24px 20px;
          border-bottom: 1.5px solid var(--gray-100);
          position: sticky; top: 0; background: var(--white); z-index: 1;
        }
        .drawer__eyebrow {
          font-family: 'Syne', sans-serif;
          font-size: 10px; font-weight: 700;
          letter-spacing: 0.12em; text-transform: uppercase;
          color: var(--orange); margin-bottom: 3px;
        }
        .drawer__id {
          font-family: 'Syne', sans-serif;
          font-size: 17px; font-weight: 800;
          color: var(--gray-900); letter-spacing: -0.01em;
        }
        .drawer__close {
          width: 32px; height: 32px;
          border: 1.5px solid var(--gray-200);
          border-radius: 8px; background: var(--white);
          display: flex; align-items: center; justify-content: center;
          color: var(--gray-500); cursor: pointer;
          transition: all .15s; flex-shrink: 0;
        }
        .drawer__close:hover { border-color: var(--gray-400); color: var(--gray-900); }

        .drawer__body { padding: 20px 24px 32px; display: flex; flex-direction: column; gap: 22px; }

        /* Hero */
        .drawer__hero {
          display: flex; align-items: center; justify-content: space-between;
          background: var(--gray-50); border: 1.5px solid var(--gray-200);
          border-radius: 12px; padding: 14px 18px;
        }
        .drawer__hero-price {
          font-family: 'Syne', sans-serif; font-size: 20px; font-weight: 800;
          color: var(--gray-900); letter-spacing: -0.02em;
        }

        /* Section */
        .detail-section { display: flex; flex-direction: column; gap: 10px; }
        .detail-section__label {
          display: flex; align-items: center; gap: 5px;
          font-family: 'Syne', sans-serif;
          font-size: 10.5px; font-weight: 700;
          letter-spacing: 0.1em; text-transform: uppercase;
          color: var(--gray-400);
        }

        /* Route card */
        .route-card {
          background: var(--gray-50); border: 1.5px solid var(--gray-200);
          border-radius: 11px; padding: 14px 16px; display: flex; flex-direction: column; gap: 0;
        }
        .route-card__row { display: flex; align-items: flex-start; gap: 12px; }
        .route-card__dot {
          flex-shrink: 0; width: 10px; height: 10px;
          border-radius: 50%; border: 2.5px solid;
          margin-top: 5px;
        }
        .route-card__dot--pickup { border-color: var(--orange); background: var(--orange-pale); }
        .route-card__dot--drop   { border-color: #10B981; background: #F0FDF4; }
        .route-card__line {
          width: 1.5px; height: 20px;
          background: var(--gray-200); margin: 5px 0 5px 4px;
        }
        .route-card__tag { font-size: 10.5px; color: var(--gray-400); font-weight: 600; font-family: 'Syne', sans-serif; text-transform: uppercase; letter-spacing: 0.07em; }
        .route-card__addr { font-size: 13px; color: var(--gray-800); margin-top: 2px; line-height: 1.45; }

        /* Info grid */
        .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
        .info-cell {
          background: var(--gray-50); border: 1.5px solid var(--gray-100);
          border-radius: 10px; padding: 11px 13px;
        }
        .info-cell__label { font-size: 10.5px; color: var(--gray-400); font-family: 'Syne', sans-serif; font-weight: 600; text-transform: uppercase; letter-spacing: 0.07em; margin-bottom: 4px; }
        .info-cell__value { font-size: 13px; color: var(--gray-900); font-weight: 500; }

        /* People */
        .people-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
        .person-card {
          background: var(--gray-50); border: 1.5px solid var(--gray-100);
          border-radius: 10px; padding: 12px 13px;
        }
        .person-card--driver { grid-column: 1 / -1; background: var(--orange-pale); border-color: var(--orange-pale2); }
        .person-card__role { font-size: 10.5px; color: var(--gray-400); font-family: 'Syne', sans-serif; font-weight: 700; text-transform: uppercase; letter-spacing: 0.07em; margin-bottom: 4px; }
        .person-card--driver .person-card__role { color: var(--orange-dark); }
        .person-card__name { font-size: 13.5px; font-weight: 600; color: var(--gray-900); }
        .person-card__sub  { font-size: 12px; color: var(--gray-500); margin-top: 2px; }

        /* Tracking */
        .tracking-box {
          background: var(--gray-50); border: 1.5px solid var(--gray-200);
          border-radius: 10px; padding: 12px 14px;
          display: flex; align-items: center; justify-content: space-between; gap: 10px;
        }
        .tracking-box__url {
          font-size: 11px; color: var(--gray-600);
          word-break: break-all; flex: 1;
          font-family: ui-monospace, monospace;
        }
        .tracking-box__copy {
          display: inline-flex; align-items: center; gap: 5px;
          flex-shrink: 0;
          background: var(--orange); color: var(--white);
          border: none; border-radius: 7px;
          padding: 7px 12px;
          font-family: 'Syne', sans-serif; font-size: 11.5px; font-weight: 600;
          cursor: pointer; transition: background .15s;
        }
        .tracking-box__copy:hover { background: var(--orange-dark); }
      `}</style>

      <div className="orders-root">
        {/* Header */}
        <div className="orders-header">
          <div>
            <div className="orders-header__eyebrow">
              <div className="orders-header__dot" />
              Kargadoor Admin
            </div>
            <div className="orders-header__title">Orders</div>
            <div className="orders-header__sub">{orders.length} total orders in the system</div>
          </div>
          <button className="refresh-btn" onClick={fetchOrders} disabled={loading}>
            <RefreshCw size={13} className={loading ? 'spin' : ''} />
            Refresh
          </button>
        </div>

        <div className="orders-content">
          {/* Toolbar */}
          <div className="toolbar">
            <div className="search-wrap">
              <Search className="search-icon" />
              <input
                className="search-input"
                placeholder="Search by address, recipient…"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>

            <div className="filter-chips">
              {[
                { value: 'all',         label: 'All' },
                { value: 'PENDING',     label: 'Pending' },
                { value: 'IN_PROGRESS', label: 'In Progress' },
                { value: 'COMPLETE',    label: 'Completed' },
                { value: 'CANCELLED',   label: 'Cancelled' },
              ].map(f => (
                <button
                  key={f.value}
                  className={`chip${statusFilter === f.value ? ' active' : ''}`}
                  onClick={() => setStatusFilter(f.value)}
                >
                  {f.label}
                  <span className="chip__count">{counts[f.value] ?? 0}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Table */}
          <div className="table-panel">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Pickup</th>
                  <th>Dropoff</th>
                  <th>Recipient</th>
                  <th>Vehicle</th>
                  <th>Price</th>
                  <th>Status</th>
                  <th>Date</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {loading && Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 8 }).map((_, j) => (
                      <td key={j}><span className="skel" style={{ height: 14, width: j === 7 ? 32 : '80%' }} /></td>
                    ))}
                  </tr>
                ))}

                {!loading && filtered.length === 0 && (
                  <tr className="empty-row">
                    <td colSpan={8}>
                      <div className="empty-icon"><PackageIcon size={18} /></div>
                      No orders found
                    </td>
                  </tr>
                )}

                {!loading && filtered.map((order, idx) => (
                  <tr key={order.ID} style={{ animationDelay: `${idx * 25}ms` }}>
                    <td className="addr-cell"><span className="addr-text">{order.PICKUP_ADDRESS ?? '—'}</span></td>
                    <td className="addr-cell"><span className="addr-text">{order.RECIPIENT_ADDRESS ?? '—'}</span></td>
                    <td>
                      <div className="recipient-name">{order.RECIPIENT_NAME ?? '—'}</div>
                      <div className="recipient-phone">{order.RECIPIENT_NUMBER ?? ''}</div>
                    </td>
                    <td>
                      <div className="vehicle-cell">
                        <span className="vehicle-emoji">{VEHICLE_EMOJIS[order.VEHICLE_TYPE ?? ''] ?? '🚚'}</span>
                        <span className="vehicle-label">{order.VEHICLE_TYPE ?? '—'}</span>
                      </div>
                    </td>
                    <td><span className="price-val">{formatCurrency(order.PRICE)}</span></td>
                    <td><StatusBadge status={order.STATUS} /></td>
                    <td><span className="date-val">{formatDate(order.CREATED_AT)}</span></td>
                    <td>
                      <button className="view-btn" onClick={() => setSelected(order)}>
                        <Eye size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {!loading && filtered.length > 0 && (
              <div className="result-count">Showing {filtered.length} of {orders.length} orders</div>
            )}
          </div>
        </div>
      </div>

      {/* Slide-in detail drawer */}
      {selected && (
        <OrderDrawer
          order={selected}
          onClose={() => setSelected(null)}
          onCopy={(text) => {
            navigator.clipboard.writeText(text)
            toast({ title: 'Copied!', description: 'Tracking URL copied to clipboard' } as any)
          }}
        />
      )}
    </>
  )
}