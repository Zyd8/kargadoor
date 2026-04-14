import { useEffect, useState } from 'react'
import { Search, RefreshCw, CheckCircle, XCircle, AlertCircle, Car, FileText } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { Vehicle } from '@/types'
import { VEHICLE_EMOJIS } from '@/lib/utils'
import { useToast } from '@/components/ui/use-toast'

// ── Main ───────────────────────────────────────────────────────────────────────
export default function Vehicles() {
  const [vehicles, setVehicles]   = useState<Vehicle[]>([])
  const [filtered, setFiltered]   = useState<Vehicle[]>([])
  const [loading, setLoading]     = useState(true)
  const [search, setSearch]       = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const [hasApprovalColumn, setHasApprovalColumn] = useState(true)
  const [toggling, setToggling]   = useState<string | null>(null)
  const { toast } = useToast()

  useEffect(() => { fetchVehicles() }, [])

  useEffect(() => {
    let list = vehicles
    if (typeFilter !== 'all') list = list.filter(v => v.TYPE === typeFilter)
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
  }, [vehicles, search, typeFilter])

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

  async function setApproval(vehicleId: string, approved: boolean) {
    setToggling(vehicleId)
    const { error } = await supabase.from('VEHICLE').update({ IS_APPROVED: approved }).eq('ID', vehicleId)
    if (error) { toast({ variant: 'destructive', title: 'Error', description: error.message }) }
    else {
      toast({ title: approved ? 'Vehicle accepted' : 'Vehicle rejected' } as any)
      setVehicles(prev => prev.map(v => v.ID === vehicleId ? { ...v, IS_APPROVED: approved } : v))
    }
    setToggling(null)
  }

  const pendingCount  = vehicles.filter(v => v.IS_APPROVED === false).length
  const approvedCount = vehicles.filter(v => v.IS_APPROVED === true).length
  const activeCount   = vehicles.filter(v => v.IS_ACTIVE === true).length

  // Unique vehicle types for filter chips
  const vehicleTypes = Array.from(new Set(vehicles.map(v => v.TYPE).filter(Boolean))) as string[]

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
          --gray-400:     #9CA3AF;
          --gray-500:     #6B7280;
          --gray-700:     #374151;
          --gray-900:     #111827;
          --green:        #059669;
          --green-bg:     #F0FDF4;
          --green-border: #A7F3D0;
          --amber:        #D97706;
          --amber-bg:     #FFFBEB;
          --amber-border: #FDE68A;
          --radius:       14px;
        }

        .vehicles-root {
          font-family: 'DM Sans', sans-serif;
          color: var(--gray-900);
          min-height: 100vh;
          background: var(--gray-50);
        }

        /* ── Header ── */
        .vehicles-header {
          display: flex; align-items: flex-start; justify-content: space-between;
          padding: 28px 36px 0; flex-wrap: wrap; gap: 14px;
        }
        .vehicles-header__eyebrow {
          display: inline-flex; align-items: center; gap: 6px;
          font-family: 'Syne', sans-serif; font-size: 10.5px; font-weight: 600;
          letter-spacing: 0.1em; text-transform: uppercase; color: var(--orange); margin-bottom: 6px;
        }
        .vehicles-header__dot {
          width: 6px; height: 6px; border-radius: 50%;
          background: var(--orange); animation: blink 2s ease-in-out infinite;
        }
        @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0.3} }
        .vehicles-header__title {
          font-family: 'Syne', sans-serif; font-size: 26px; font-weight: 800;
          color: var(--gray-900); letter-spacing: -0.025em;
        }
        .vehicles-header__sub { font-size: 13.5px; color: var(--gray-500); margin-top: 4px; }

        .refresh-btn {
          display: inline-flex; align-items: center; gap: 7px;
          background: var(--white); border: 1.5px solid var(--gray-200); border-radius: 9px;
          padding: 9px 16px; font-family: 'Syne', sans-serif; font-size: 12px; font-weight: 600;
          letter-spacing: 0.04em; color: var(--gray-700); cursor: pointer;
          transition: border-color .18s, box-shadow .18s, color .18s;
        }
        .refresh-btn:hover:not(:disabled) { border-color: var(--orange); color: var(--orange); box-shadow: 0 0 0 3px rgba(244,121,32,0.08); }
        .refresh-btn:disabled { opacity: 0.6; cursor: not-allowed; }
        .spin { animation: spin 0.8s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }

        /* ── Content ── */
        .vehicles-content { padding: 22px 36px 40px; display: flex; flex-direction: column; gap: 18px; }

        /* ── Stats row ── */
        .vehicle-stats {
          display: flex; gap: 12px; flex-wrap: wrap;
          opacity: 0; animation: fadeUp 0.5s cubic-bezier(0.22,1,0.36,1) 0.05s forwards;
        }
        @keyframes fadeUp { to { opacity:1; transform:translateY(0); } }

        .vehicle-stat {
          background: var(--white); border: 1.5px solid var(--gray-200); border-radius: 11px;
          padding: 14px 20px; display: flex; align-items: center; gap: 12px;
          min-width: 130px; flex: 1;
        }
        .vehicle-stat__icon {
          width: 34px; height: 34px; border-radius: 9px;
          display: flex; align-items: center; justify-content: center; flex-shrink: 0;
        }
        .vehicle-stat__num {
          font-family: 'Syne', sans-serif; font-size: 22px; font-weight: 800;
          color: var(--gray-900); letter-spacing: -0.02em; line-height: 1;
        }
        .vehicle-stat__lbl {
          font-size: 11px; color: var(--gray-400); font-family: 'Syne', sans-serif;
          font-weight: 600; text-transform: uppercase; letter-spacing: 0.07em; margin-top: 2px;
        }

        /* ── Alerts ── */
        .alert-banner {
          display: flex; align-items: flex-start; gap: 12px;
          border-radius: 11px; padding: 13px 16px;
          animation: slideDown 0.3s cubic-bezier(0.22,1,0.36,1);
        }
        .alert-banner--warning { background: var(--amber-bg); border: 1.5px solid var(--amber-border); }
        .alert-banner--info    { background: #EFF6FF; border: 1.5px solid #BFDBFE; }
        @keyframes slideDown { from{opacity:0;transform:translateY(-8px)} to{opacity:1;transform:translateY(0)} }
        .alert-banner__icon {
          flex-shrink: 0; width: 30px; height: 30px; border-radius: 8px;
          display: flex; align-items: center; justify-content: center;
        }
        .alert-banner--warning .alert-banner__icon { background: #FEF3C7; color: var(--amber); }
        .alert-banner--info    .alert-banner__icon { background: #DBEAFE; color: #2563EB; }
        .alert-banner__title {
          font-family: 'Syne', sans-serif; font-size: 13px; font-weight: 700; margin-bottom: 3px;
        }
        .alert-banner--warning .alert-banner__title { color: #92400E; }
        .alert-banner--info    .alert-banner__title { color: #1E40AF; }
        .alert-banner__desc { font-size: 13px; line-height: 1.55; }
        .alert-banner--warning .alert-banner__desc { color: #92400E; opacity: 0.85; }
        .alert-banner--info    .alert-banner__desc { color: #1E40AF; opacity: 0.85; }
        .alert-banner__desc code {
          background: rgba(0,0,0,0.07); border-radius: 4px;
          padding: 1px 5px; font-size: 11px; font-family: ui-monospace, monospace;
        }

        /* ── Toolbar ── */
        .toolbar { display: flex; gap: 12px; flex-wrap: wrap; align-items: center; }
        .search-wrap { position: relative; flex: 1; min-width: 200px; max-width: 300px; }
        .search-icon { position: absolute; left: 12px; top: 50%; transform: translateY(-50%); color: var(--gray-400); pointer-events: none; width: 15px; height: 15px; }
        .search-input {
          width: 100%; background: var(--white); border: 1.5px solid var(--gray-200); border-radius: 10px;
          padding: 10px 13px 10px 36px; font-family: 'DM Sans', sans-serif; font-size: 13.5px;
          color: var(--gray-900); outline: none; transition: border-color .18s, box-shadow .18s;
        }
        .search-input::placeholder { color: var(--gray-400); }
        .search-input:focus { border-color: var(--orange); box-shadow: 0 0 0 3px rgba(244,121,32,0.1); }

        .filter-chips { display: flex; gap: 6px; flex-wrap: wrap; }
        .chip {
          display: inline-flex; align-items: center; gap: 5px;
          padding: 6px 13px; border-radius: 100px;
          border: 1.5px solid var(--gray-200); background: var(--white);
          font-family: 'Syne', sans-serif; font-size: 11.5px; font-weight: 600;
          letter-spacing: 0.04em; color: var(--gray-500); cursor: pointer; transition: all .15s;
        }
        .chip:hover { border-color: var(--orange); color: var(--orange); }
        .chip.active { background: var(--orange); border-color: var(--orange); color: var(--white); }
        .chip__count { font-size: 10px; background: rgba(0,0,0,0.12); border-radius: 100px; padding: 1px 6px; font-weight: 700; }
        .chip.active .chip__count { background: rgba(255,255,255,0.25); }

        /* ── Table panel ── */
        .table-panel {
          background: var(--white); border: 1.5px solid var(--gray-200); border-radius: var(--radius);
          overflow: hidden; opacity: 0; transform: translateY(12px);
          animation: fadeUp 0.5s cubic-bezier(0.22,1,0.36,1) 0.15s forwards;
        }

        .data-table { width: 100%; border-collapse: collapse; }
        .data-table thead tr { background: var(--gray-50); border-bottom: 1.5px solid var(--gray-200); }
        .data-table th {
          padding: 11px 16px; text-align: left;
          font-family: 'Syne', sans-serif; font-size: 10.5px; font-weight: 700;
          letter-spacing: 0.1em; text-transform: uppercase; color: var(--gray-400); white-space: nowrap;
        }
        .data-table th:first-child { padding-left: 22px; }
        .data-table th:last-child  { padding-right: 22px; }

        .data-table tbody tr {
          border-bottom: 1px solid var(--gray-100); transition: background 0.12s;
          opacity: 0; animation: rowIn 0.35s ease forwards;
        }
        .data-table tbody tr:last-child { border-bottom: none; }
        .data-table tbody tr:hover { background: var(--gray-50); }
        @keyframes rowIn { to { opacity:1; } }

        .data-table td { padding: 13px 16px; font-size: 13.5px; color: var(--gray-700); vertical-align: middle; }
        .data-table td:first-child { padding-left: 22px; }
        .data-table td:last-child  { padding-right: 22px; }

        /* Vehicle type cell */
        .vehicle-type-cell { display: flex; align-items: center; gap: 10px; }
        .vehicle-emoji-wrap {
          width: 38px; height: 38px; border-radius: 10px;
          background: var(--orange-pale); border: 1.5px solid var(--orange-pale2);
          display: flex; align-items: center; justify-content: center;
          font-size: 18px; line-height: 1; flex-shrink: 0;
        }
        .vehicle-type-label { font-weight: 600; text-transform: capitalize; color: var(--gray-900); font-size: 13.5px; }

        /* Plate */
        .plate-chip {
          display: inline-block;
          font-family: ui-monospace, monospace; font-size: 12px; font-weight: 700;
          color: var(--gray-900); background: var(--gray-100);
          border: 1.5px solid var(--gray-200); border-radius: 6px;
          padding: 3px 9px; letter-spacing: 0.08em; text-transform: uppercase;
        }

        /* Driver cell */
        .driver-mini { display: flex; align-items: center; gap: 9px; }
        .driver-mini-avatar {
          width: 30px; height: 30px; border-radius: 8px;
          background: var(--gray-100); border: 1.5px solid var(--gray-200);
          display: flex; align-items: center; justify-content: center;
          font-family: 'Syne', sans-serif; font-size: 10px; font-weight: 700;
          color: var(--gray-500); flex-shrink: 0;
        }
        .driver-mini-name  { font-size: 13px; font-weight: 500; color: var(--gray-900); }
        .driver-mini-phone { font-size: 11.5px; color: var(--gray-400); margin-top: 1px; }

        /* Status badges */
        .status-badge {
          display: inline-flex; align-items: center; gap: 5px;
          font-size: 11px; font-weight: 600; font-family: 'Syne', sans-serif;
          letter-spacing: 0.04em; text-transform: uppercase;
          padding: 3px 9px; border-radius: 100px; white-space: nowrap;
        }
        .status-badge--active   { color: var(--green); background: var(--green-bg); }
        .status-badge--inactive { color: var(--gray-500); background: var(--gray-100); }
        .status-badge--approved { color: var(--green); background: var(--green-bg); }
        .status-badge--pending  { color: var(--amber); background: var(--amber-bg); }
        .status-badge--na       { color: var(--gray-500); background: var(--gray-100); }

        .docs-link {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-size: 12px;
          color: var(--orange-dark);
          text-decoration: none;
          font-weight: 600;
        }
        .docs-link:hover { text-decoration: underline; }
        .action-cell { display: flex; gap: 8px; align-items: center; }
        .action-btn {
          border: 1px solid var(--gray-200);
          border-radius: 8px;
          background: var(--white);
          font-size: 11px;
          font-family: 'Syne', sans-serif;
          letter-spacing: 0.05em;
          text-transform: uppercase;
          font-weight: 700;
          padding: 7px 10px;
          cursor: pointer;
        }
        .action-btn:disabled { opacity: 0.55; cursor: not-allowed; }
        .action-btn--accept { color: var(--green); border-color: #A7F3D0; background: #F0FDF4; }
        .action-btn--reject { color: #DC2626; border-color: #FECACA; background: #FEF2F2; }

        /* Empty / skeleton */
        .empty-row td { padding: 52px 24px; text-align: center; color: var(--gray-400); font-size: 13.5px; }
        .empty-icon {
          width: 40px; height: 40px; background: var(--gray-100); border-radius: 10px;
          display: flex; align-items: center; justify-content: center;
          margin: 0 auto 10px; color: var(--gray-400);
        }
        .skel {
          border-radius: 6px; display: block;
          background: linear-gradient(90deg, var(--gray-100) 25%, var(--gray-50) 50%, var(--gray-100) 75%);
          background-size: 200% 100%; animation: shimmer 1.4s infinite;
        }
        @keyframes shimmer { from{background-position:200% 0} to{background-position:-200% 0} }

        /* Result count */
        .result-count {
          font-size: 12px; color: var(--gray-400); font-family: 'Syne', sans-serif;
          font-weight: 600; letter-spacing: 0.04em; padding: 13px 22px;
          border-top: 1px solid var(--gray-100); text-transform: uppercase;
        }

        .muted { color: var(--gray-400); font-size: 13px; }
      `}</style>

      <div className="vehicles-root">
        {/* Header */}
        <div className="vehicles-header">
          <div>
            <div className="vehicles-header__eyebrow">
              <div className="vehicles-header__dot" />
              Kargadoor Admin
            </div>
            <div className="vehicles-header__title">Vehicle Approvals</div>
            <div className="vehicles-header__sub">{vehicles.length} registered vehicles</div>
          </div>
          <button className="refresh-btn" onClick={fetchVehicles} disabled={loading}>
            <RefreshCw size={13} className={loading ? 'spin' : ''} />
            Refresh
          </button>
        </div>

        <div className="vehicles-content">

          {/* Stats row */}
          {!loading && (
            <div className="vehicle-stats">
              <div className="vehicle-stat">
                <div className="vehicle-stat__icon" style={{ background: '#EFF6FF', color: '#2563EB' }}>
                  <Car size={16} />
                </div>
                <div>
                  <div className="vehicle-stat__num">{vehicles.length}</div>
                  <div className="vehicle-stat__lbl">Total</div>
                </div>
              </div>
              <div className="vehicle-stat">
                <div className="vehicle-stat__icon" style={{ background: 'var(--green-bg)', color: 'var(--green)' }}>
                  <CheckCircle size={16} />
                </div>
                <div>
                  <div className="vehicle-stat__num">{approvedCount}</div>
                  <div className="vehicle-stat__lbl">Approved</div>
                </div>
              </div>
              <div className="vehicle-stat">
                <div className="vehicle-stat__icon" style={{ background: 'var(--amber-bg)', color: 'var(--amber)' }}>
                  <AlertCircle size={16} />
                </div>
                <div>
                  <div className="vehicle-stat__num">{pendingCount}</div>
                  <div className="vehicle-stat__lbl">Pending</div>
                </div>
              </div>
              <div className="vehicle-stat">
                <div className="vehicle-stat__icon" style={{ background: 'var(--orange-pale)', color: 'var(--orange)' }}>
                  <CheckCircle size={16} />
                </div>
                <div>
                  <div className="vehicle-stat__num">{activeCount}</div>
                  <div className="vehicle-stat__lbl">Active</div>
                </div>
              </div>
            </div>
          )}

          {/* Alerts */}
          {!hasApprovalColumn && (
            <div className="alert-banner alert-banner--info">
              <div className="alert-banner__icon"><AlertCircle size={15} /></div>
              <div>
                <div className="alert-banner__title">Database migration required</div>
                <div className="alert-banner__desc">
                  The <code>IS_APPROVED</code> column does not exist on the <code>VEHICLE</code> table yet.
                  Run the SQL in <code>MIGRATION_REQUIRED.sql</code> to enable vehicle approval.
                </div>
              </div>
            </div>
          )}

          {hasApprovalColumn && pendingCount > 0 && (
            <div className="alert-banner alert-banner--warning">
              <div className="alert-banner__icon"><AlertCircle size={15} /></div>
              <div>
                <div className="alert-banner__title">{pendingCount} vehicle{pendingCount !== 1 ? 's' : ''} awaiting approval</div>
                <div className="alert-banner__desc">Pending vehicles are not eligible for active deliveries until approved.</div>
              </div>
            </div>
          )}

          {/* Toolbar */}
          <div className="toolbar">
            <div className="search-wrap">
              <Search className="search-icon" />
              <input
                className="search-input"
                placeholder="Search by plate, model, driver…"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>

            {vehicleTypes.length > 1 && (
              <div className="filter-chips">
                <button
                  className={`chip${typeFilter === 'all' ? ' active' : ''}`}
                  onClick={() => setTypeFilter('all')}
                >
                  All
                  <span className="chip__count">{vehicles.length}</span>
                </button>
                {vehicleTypes.map(type => (
                  <button
                    key={type}
                    className={`chip${typeFilter === type ? ' active' : ''}`}
                    onClick={() => setTypeFilter(type)}
                  >
                    {VEHICLE_EMOJIS[type] ?? ''} {type}
                    <span className="chip__count">{vehicles.filter(v => v.TYPE === type).length}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Table */}
          <div className="table-panel">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Vehicle</th>
                  <th>Plate</th>
                  <th>Model</th>
                  <th>Driver</th>
                  <th>Active</th>
                  <th>Approval</th>
                  <th>Document</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {loading && Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span className="skel" style={{ width: 38, height: 38, borderRadius: 10, flexShrink: 0 }} />
                        <span className="skel" style={{ height: 14, width: 80 }} />
                      </div>
                    </td>
                    {[60, 70, 90, 55, 64, 90, 42].map((w, j) => (
                      <td key={j}><span className="skel" style={{ height: 14, width: w }} /></td>
                    ))}
                  </tr>
                ))}

                {!loading && filtered.length === 0 && (
                  <tr className="empty-row">
                    <td colSpan={8}>
                      <div className="empty-icon"><Car size={18} /></div>
                      No vehicles found
                    </td>
                  </tr>
                )}

                {!loading && filtered.map((vehicle, idx) => {
                  const approved = vehicle.IS_APPROVED !== false
                  const driverInitials = vehicle.driver?.FULL_NAME
                    ? vehicle.driver.FULL_NAME.split(' ').map((w: string) => w[0]).slice(0, 2).join('').toUpperCase()
                    : '?'

                  return (
                    <tr key={vehicle.ID} style={{ animationDelay: `${idx * 25}ms` }}>
                      {/* Vehicle type */}
                      <td>
                        <div className="vehicle-type-cell">
                          <div className="vehicle-emoji-wrap">
                            {VEHICLE_EMOJIS[vehicle.TYPE ?? ''] ?? '🚗'}
                          </div>
                          <span className="vehicle-type-label">{vehicle.TYPE ?? '—'}</span>
                        </div>
                      </td>

                      {/* Plate */}
                      <td><span className="plate-chip">{vehicle.PLATE ?? '—'}</span></td>

                      {/* Model */}
                      <td><span className="muted">{vehicle.MODEL ?? '—'}</span></td>

                      {/* Driver */}
                      <td>
                        {vehicle.driver ? (
                          <div className="driver-mini">
                            <div className="driver-mini-avatar">{driverInitials}</div>
                            <div>
                              <div className="driver-mini-name">{vehicle.driver.FULL_NAME ?? '—'}</div>
                              <div className="driver-mini-phone">{vehicle.driver.PHONE_NUMBER ?? ''}</div>
                            </div>
                          </div>
                        ) : (
                          <span className="muted">—</span>
                        )}
                      </td>

                      {/* Active status */}
                      <td>
                        {vehicle.IS_ACTIVE ? (
                          <span className="status-badge status-badge--active">
                            <CheckCircle size={11} /> Active
                          </span>
                        ) : (
                          <span className="status-badge status-badge--inactive">
                            <XCircle size={11} /> Inactive
                          </span>
                        )}
                      </td>

                      {/* Approval status */}
                      <td>
                        {!hasApprovalColumn ? (
                          <span className="status-badge status-badge--na">N/A</span>
                        ) : approved ? (
                          <span className="status-badge status-badge--approved">
                            <CheckCircle size={11} /> Approved
                          </span>
                        ) : (
                          <span className="status-badge status-badge--pending">
                            <AlertCircle size={11} /> Pending
                          </span>
                        )}
                      </td>

                      {/* Toggle */}
                      <td>
                        {vehicle.REGISTRATION_DOC_URL ? (
                          <a className="docs-link" href={vehicle.REGISTRATION_DOC_URL} target="_blank" rel="noreferrer">
                            <FileText size={12} /> Open file
                          </a>
                        ) : (
                          <span className="muted">No file</span>
                        )}
                      </td>
                      <td>
                        <div className="action-cell">
                          <button
                            className="action-btn action-btn--accept"
                            disabled={!hasApprovalColumn || toggling === vehicle.ID || approved}
                            onClick={() => setApproval(vehicle.ID, true)}
                          >
                            Accept
                          </button>
                          <button
                            className="action-btn action-btn--reject"
                            disabled={!hasApprovalColumn || toggling === vehicle.ID || !approved}
                            onClick={() => setApproval(vehicle.ID, false)}
                          >
                            Reject
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>

            {!loading && filtered.length > 0 && (
              <div className="result-count">Showing {filtered.length} of {vehicles.length} vehicles</div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}