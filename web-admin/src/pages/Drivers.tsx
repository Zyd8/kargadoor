import { useEffect, useState } from 'react'
import { Search, RefreshCw, ShieldCheck, ShieldX, ShieldAlert, AlertCircle, Truck } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { Profile } from '@/types'
import { useToast } from '@/components/ui/use-toast'

// ── Avatar ─────────────────────────────────────────────────────────────────────
function Avatar({ name }: { name?: string | null }) {
  const initials = name
    ? name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
    : 'D'
  return <div className="driver-avatar">{initials}</div>
}

// ── Approval toggle ────────────────────────────────────────────────────────────
function ApprovalToggle({
  approved, disabled, onChange,
}: { approved: boolean; disabled?: boolean; onChange: () => void }) {
  return (
    <button
      className={`approval-toggle${approved ? ' approval-toggle--on' : ''}`}
      disabled={disabled}
      onClick={onChange}
      role="switch"
      aria-checked={approved}
    >
      <span className="approval-toggle__thumb" />
    </button>
  )
}

// ── Main ───────────────────────────────────────────────────────────────────────
export default function Drivers() {
  const [drivers, setDrivers]   = useState<Profile[]>([])
  const [filtered, setFiltered] = useState<Profile[]>([])
  const [loading, setLoading]   = useState(true)
  const [search, setSearch]     = useState('')
  const [hasApprovalColumn, setHasApprovalColumn] = useState(true)
  const [toggling, setToggling] = useState<string | null>(null)
  const { toast } = useToast()

  useEffect(() => { fetchDrivers() }, [])

  useEffect(() => {
    let list = drivers
    if (search) {
      const q = search.toLowerCase()
      list = list.filter(d =>
        d.FULL_NAME?.toLowerCase().includes(q) ||
        d.EMAIL?.toLowerCase().includes(q) ||
        d.PHONE_NUMBER?.includes(q)
      )
    }
    setFiltered(list)
  }, [drivers, search])

  async function fetchDrivers() {
    setLoading(true)
    const { data, error } = await supabase
      .from('PROFILE').select('*').eq('ROLE', 'DRIVER').order('FULL_NAME')
    if (error) { toast({ variant: 'destructive', title: 'Error', description: error.message }); setLoading(false); return }
    const list = (data ?? []) as Profile[]
    if (list.length > 0 && !('IS_APPROVED' in list[0])) setHasApprovalColumn(false)
    setDrivers(list)
    setLoading(false)
  }

  async function toggleApproval(driverId: string, currentValue: boolean) {
    setToggling(driverId)
    const newValue = !currentValue
    const { error } = await supabase.from('PROFILE').update({ IS_APPROVED: newValue }).eq('ID', driverId)
    if (error) { toast({ variant: 'destructive', title: 'Error', description: error.message }) }
    else {
      toast({ title: newValue ? 'Driver approved' : 'Driver unapproved' } as any)
      setDrivers(prev => prev.map(d => d.ID === driverId ? { ...d, IS_APPROVED: newValue } : d))
    }
    setToggling(null)
  }

  const pendingCount  = drivers.filter(d => d.IS_APPROVED === false).length
  const approvedCount = drivers.filter(d => d.IS_APPROVED === true).length

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
          --green:        #059669;
          --green-bg:     #F0FDF4;
          --amber:        #D97706;
          --amber-bg:     #FFFBEB;
          --amber-border: #FDE68A;
          --red:          #DC2626;
          --red-bg:       #FEF2F2;
          --radius:       14px;
        }

        .drivers-root {
          font-family: 'DM Sans', sans-serif;
          color: var(--gray-900);
          min-height: 100vh;
          background: var(--gray-50);
        }

        /* ── Header ── */
        .drivers-header {
          display: flex; align-items: flex-start; justify-content: space-between;
          padding: 28px 36px 0; flex-wrap: wrap; gap: 14px;
        }
        .drivers-header__eyebrow {
          display: inline-flex; align-items: center; gap: 6px;
          font-family: 'Syne', sans-serif; font-size: 10.5px; font-weight: 600;
          letter-spacing: 0.1em; text-transform: uppercase; color: var(--orange); margin-bottom: 6px;
        }
        .drivers-header__dot {
          width: 6px; height: 6px; border-radius: 50%;
          background: var(--orange); animation: blink 2s ease-in-out infinite;
        }
        @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0.3} }
        .drivers-header__title {
          font-family: 'Syne', sans-serif; font-size: 26px; font-weight: 800;
          color: var(--gray-900); letter-spacing: -0.025em;
        }
        .drivers-header__sub { font-size: 13.5px; color: var(--gray-500); margin-top: 4px; }

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
        .drivers-content { padding: 22px 36px 40px; display: flex; flex-direction: column; gap: 18px; }

        /* ── Stats row ── */
        .driver-stats {
          display: flex; gap: 12px; flex-wrap: wrap;
          opacity: 0; animation: fadeUp 0.5s cubic-bezier(0.22,1,0.36,1) 0.05s forwards;
        }
        @keyframes fadeUp { to { opacity:1; transform:translateY(0); } }

        .driver-stat {
          background: var(--white); border: 1.5px solid var(--gray-200); border-radius: 11px;
          padding: 14px 20px; display: flex; align-items: center; gap: 12px;
          min-width: 140px; flex: 1;
        }
        .driver-stat__icon {
          width: 34px; height: 34px; border-radius: 9px;
          display: flex; align-items: center; justify-content: center; flex-shrink: 0;
        }
        .driver-stat__num {
          font-family: 'Syne', sans-serif; font-size: 22px; font-weight: 800;
          color: var(--gray-900); letter-spacing: -0.02em; line-height: 1;
        }
        .driver-stat__lbl {
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
          font-family: 'Syne', sans-serif; font-size: 13px; font-weight: 700; color: var(--gray-900); margin-bottom: 3px;
        }
        .alert-banner--warning .alert-banner__title { color: #92400E; }
        .alert-banner--info    .alert-banner__title { color: #1E40AF; }

        .alert-banner__desc { font-size: 13px; color: var(--gray-500); line-height: 1.55; }
        .alert-banner--warning .alert-banner__desc { color: #92400E; opacity: 0.8; }
        .alert-banner--info    .alert-banner__desc { color: #1E40AF; opacity: 0.8; }
        .alert-banner__desc code {
          background: rgba(0,0,0,0.07); border-radius: 4px;
          padding: 1px 5px; font-size: 11px; font-family: ui-monospace, monospace;
        }

        /* ── Toolbar ── */
        .toolbar { display: flex; gap: 12px; flex-wrap: wrap; align-items: center; }
        .search-wrap { position: relative; flex: 1; min-width: 200px; max-width: 320px; }
        .search-icon { position: absolute; left: 12px; top: 50%; transform: translateY(-50%); color: var(--gray-400); pointer-events: none; width: 15px; height: 15px; }
        .search-input {
          width: 100%; background: var(--white); border: 1.5px solid var(--gray-200); border-radius: 10px;
          padding: 10px 13px 10px 36px; font-family: 'DM Sans', sans-serif; font-size: 13.5px;
          color: var(--gray-900); outline: none; transition: border-color .18s, box-shadow .18s;
        }
        .search-input::placeholder { color: var(--gray-400); }
        .search-input:focus { border-color: var(--orange); box-shadow: 0 0 0 3px rgba(244,121,32,0.1); }

        /* ── Table panel ── */
        .table-panel {
          background: var(--white); border: 1.5px solid var(--gray-200); border-radius: var(--radius);
          overflow: hidden; opacity: 0; transform: translateY(12px);
          animation: fadeUp 0.5s cubic-bezier(0.22,1,0.36,1) 0.15s forwards;
        }

        .data-table { width: 100%; border-collapse: collapse; }
        .data-table thead tr { background: var(--gray-50); border-bottom: 1.5px solid var(--gray-200); }
        .data-table th {
          padding: 11px 18px; text-align: left;
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

        .data-table td { padding: 13px 18px; font-size: 13.5px; color: var(--gray-700); vertical-align: middle; }
        .data-table td:first-child { padding-left: 22px; }
        .data-table td:last-child  { padding-right: 22px; }

        /* Driver name cell */
        .driver-cell { display: flex; align-items: center; gap: 11px; }
        .driver-avatar {
          flex-shrink: 0; width: 36px; height: 36px; border-radius: 10px;
          background: var(--orange-pale); color: var(--orange-dark);
          font-family: 'Syne', sans-serif; font-size: 12px; font-weight: 700;
          display: flex; align-items: center; justify-content: center;
          border: 1.5px solid var(--orange-pale2); letter-spacing: 0.02em;
        }
        .driver-name { font-weight: 500; color: var(--gray-900); font-size: 13.5px; }

        .muted { color: var(--gray-400); font-size: 13px; }

        /* Approval status badge */
        .appr-badge {
          display: inline-flex; align-items: center; gap: 6px;
          font-size: 11.5px; font-weight: 600; font-family: 'Syne', sans-serif;
          letter-spacing: 0.04em; text-transform: uppercase;
          padding: 4px 10px; border-radius: 100px;
        }
        .appr-badge--approved { color: var(--green); background: var(--green-bg); }
        .appr-badge--pending  { color: var(--amber); background: var(--amber-bg); }
        .appr-badge--na       { color: var(--gray-500); background: var(--gray-100); }

        /* Toggle switch */
        .approval-toggle {
          position: relative; width: 42px; height: 24px;
          background: var(--gray-200); border: none; border-radius: 100px;
          cursor: pointer; transition: background 0.2s;
          flex-shrink: 0;
        }
        .approval-toggle--on { background: var(--green); }
        .approval-toggle:disabled { opacity: 0.45; cursor: not-allowed; }

        .approval-toggle__thumb {
          position: absolute; top: 3px; left: 3px;
          width: 18px; height: 18px; border-radius: 50%;
          background: var(--white);
          box-shadow: 0 1px 4px rgba(0,0,0,0.2);
          transition: transform 0.2s cubic-bezier(0.34,1.56,0.64,1);
        }
        .approval-toggle--on .approval-toggle__thumb { transform: translateX(18px); }

        /* Toggle label */
        .toggle-cell { display: flex; align-items: center; gap: 9px; }
        .toggle-label {
          font-size: 12px; font-weight: 600; font-family: 'Syne', sans-serif;
          letter-spacing: 0.03em; color: var(--gray-500);
          transition: color 0.2s;
        }
        .toggle-label--on { color: var(--green); }

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
      `}</style>

      <div className="drivers-root">
        {/* Header */}
        <div className="drivers-header">
          <div>
            <div className="drivers-header__eyebrow">
              <div className="drivers-header__dot" />
              Kargadoor Admin
            </div>
            <div className="drivers-header__title">Driver Approvals</div>
            <div className="drivers-header__sub">{drivers.length} registered drivers</div>
          </div>
          <button className="refresh-btn" onClick={fetchDrivers} disabled={loading}>
            <RefreshCw size={13} className={loading ? 'spin' : ''} />
            Refresh
          </button>
        </div>

        <div className="drivers-content">

          {/* Stats row */}
          {!loading && (
            <div className="driver-stats">
              <div className="driver-stat">
                <div className="driver-stat__icon" style={{ background: '#EFF6FF', color: '#2563EB' }}>
                  <Truck size={16} />
                </div>
                <div>
                  <div className="driver-stat__num">{drivers.length}</div>
                  <div className="driver-stat__lbl">Total Drivers</div>
                </div>
              </div>
              <div className="driver-stat">
                <div className="driver-stat__icon" style={{ background: '#F0FDF4', color: '#059669' }}>
                  <ShieldCheck size={16} />
                </div>
                <div>
                  <div className="driver-stat__num">{approvedCount}</div>
                  <div className="driver-stat__lbl">Approved</div>
                </div>
              </div>
              <div className="driver-stat">
                <div className="driver-stat__icon" style={{ background: '#FFFBEB', color: '#D97706' }}>
                  <ShieldAlert size={16} />
                </div>
                <div>
                  <div className="driver-stat__num">{pendingCount}</div>
                  <div className="driver-stat__lbl">Pending</div>
                </div>
              </div>
            </div>
          )}

          {/* Migration warning */}
          {!hasApprovalColumn && (
            <div className="alert-banner alert-banner--info">
              <div className="alert-banner__icon"><AlertCircle size={15} /></div>
              <div>
                <div className="alert-banner__title">Database migration required</div>
                <div className="alert-banner__desc">
                  The <code>IS_APPROVED</code> column does not exist on the <code>PROFILE</code> table yet.
                  Run the SQL in <code>MIGRATION_REQUIRED.sql</code> to enable driver approval.
                </div>
              </div>
            </div>
          )}

          {/* Pending alert */}
          {hasApprovalColumn && pendingCount > 0 && (
            <div className="alert-banner alert-banner--warning">
              <div className="alert-banner__icon"><ShieldAlert size={15} /></div>
              <div>
                <div className="alert-banner__title">{pendingCount} driver{pendingCount !== 1 ? 's' : ''} awaiting approval</div>
                <div className="alert-banner__desc">Pending drivers cannot accept orders until approved.</div>
              </div>
            </div>
          )}

          {/* Search */}
          <div className="toolbar">
            <div className="search-wrap">
              <Search className="search-icon" />
              <input
                className="search-input"
                placeholder="Search by name, email, phone…"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
          </div>

          {/* Table */}
          <div className="table-panel">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Driver</th>
                  <th>Email</th>
                  <th>Phone</th>
                  <th>Status</th>
                  <th>Approve</th>
                </tr>
              </thead>
              <tbody>
                {loading && Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
                        <span className="skel" style={{ width: 36, height: 36, borderRadius: 10, flexShrink: 0 }} />
                        <span className="skel" style={{ height: 14, width: '70%' }} />
                      </div>
                    </td>
                    {[80, 60, 70, 42].map((w, j) => (
                      <td key={j}><span className="skel" style={{ height: 14, width: `${w}%` }} /></td>
                    ))}
                  </tr>
                ))}

                {!loading && filtered.length === 0 && (
                  <tr className="empty-row">
                    <td colSpan={5}>
                      <div className="empty-icon"><Truck size={18} /></div>
                      No drivers found
                    </td>
                  </tr>
                )}

                {!loading && filtered.map((driver, idx) => {
                  const approved = driver.IS_APPROVED !== false
                  return (
                    <tr key={driver.ID} style={{ animationDelay: `${idx * 30}ms` }}>
                      <td>
                        <div className="driver-cell">
                          <Avatar name={driver.FULL_NAME} />
                          <span className="driver-name">{driver.FULL_NAME ?? '—'}</span>
                        </div>
                      </td>
                      <td><span className="muted">{driver.EMAIL ?? '—'}</span></td>
                      <td><span className="muted">{driver.PHONE_NUMBER ?? '—'}</span></td>
                      <td>
                        {!hasApprovalColumn ? (
                          <span className="appr-badge appr-badge--na">N/A</span>
                        ) : approved ? (
                          <span className="appr-badge appr-badge--approved">
                            <ShieldCheck size={12} /> Approved
                          </span>
                        ) : (
                          <span className="appr-badge appr-badge--pending">
                            <ShieldX size={12} /> Pending
                          </span>
                        )}
                      </td>
                      <td>
                        <div className="toggle-cell">
                          <ApprovalToggle
                            approved={approved}
                            disabled={!hasApprovalColumn || toggling === driver.ID}
                            onChange={() => toggleApproval(driver.ID, approved)}
                          />
                          <span className={`toggle-label${approved ? ' toggle-label--on' : ''}`}>
                            {approved ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>

            {!loading && filtered.length > 0 && (
              <div className="result-count">Showing {filtered.length} of {drivers.length} drivers</div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}