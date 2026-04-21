import { useEffect, useState } from 'react'
import { Search, RefreshCw, Users as UsersIcon, ChevronDown } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { Profile, Role } from '@/types'
import { useToast } from '@/components/ui/use-toast'

// ── Role config ────────────────────────────────────────────────────────────────
const ROLE_META: Record<string, { label: string; color: string; bg: string }> = {
  USER:   { label: 'User',   color: '#2563EB', bg: '#EFF6FF' },
  DRIVER: { label: 'Driver', color: '#059669', bg: '#F0FDF4' },
  admin:  { label: 'Admin',  color: '#7C3AED', bg: '#F5F3FF' },
}

const ROLES: Role[] = ['USER', 'DRIVER', 'admin']

// ── Avatar initials ────────────────────────────────────────────────────────────
function Avatar({ name }: { name?: string | null }) {
  const initials = name
    ? name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
    : '?'
  return <div className="user-avatar">{initials}</div>
}

// ── Role badge ─────────────────────────────────────────────────────────────────
function RoleBadge({ role }: { role?: string | null }) {
  const meta = ROLE_META[role ?? ''] ?? { label: role ?? '—', color: '#6B7280', bg: '#F3F4F6' }
  return (
    <span className="role-badge" style={{ color: meta.color, background: meta.bg }}>
      <span className="role-badge__dot" style={{ background: meta.color }} />
      {meta.label}
    </span>
  )
}

// ── Role selector ──────────────────────────────────────────────────────────────
function RoleSelect({
  value, onChange, disabled,
}: { value: string; onChange: (v: Role) => void; disabled?: boolean }) {
  return (
    <div className="role-select-wrap">
      <select
        className="role-select"
        value={value}
        onChange={e => onChange(e.target.value as Role)}
        disabled={disabled}
      >
        {ROLES.map(r => (
          <option key={r} value={r}>{ROLE_META[r]?.label ?? r}</option>
        ))}
      </select>
      <ChevronDown size={12} className="role-select__chevron" />
    </div>
  )
}

// ── Main ───────────────────────────────────────────────────────────────────────
export default function Users() {
  const [users, setUsers]       = useState<Profile[]>([])
  const [filtered, setFiltered] = useState<Profile[]>([])
  const [loading, setLoading]   = useState(true)
  const [search, setSearch]     = useState('')
  const [roleFilter, setRoleFilter] = useState('all')
  const [updating, setUpdating] = useState<string | null>(null)
  const { toast } = useToast()

  useEffect(() => { fetchUsers() }, [])

  useEffect(() => {
    let list = users
    if (roleFilter !== 'all') list = list.filter(u => u.ROLE === roleFilter)
    if (search) {
      const q = search.toLowerCase()
      list = list.filter(u =>
        u.FULL_NAME?.toLowerCase().includes(q) ||
        u.EMAIL?.toLowerCase().includes(q) ||
        u.PHONE_NUMBER?.includes(q)
      )
    }
    setFiltered(list)
  }, [users, search, roleFilter])

  async function fetchUsers() {
    setLoading(true)
    const { data, error } = await supabase.from('PROFILE').select('*').order('FULL_NAME')
    if (error) { toast({ variant: 'destructive', title: 'Error', description: error.message }); setLoading(false); return }
    setUsers(data ?? [])
    setLoading(false)
  }

  async function changeRole(userId: string, newRole: Role) {
    setUpdating(userId)
    const { error } = await supabase.from('PROFILE').update({ ROLE: newRole }).eq('ID', userId)
    if (error) { toast({ variant: 'destructive', title: 'Error', description: error.message }) }
    else {
      toast({ title: 'Role updated' } as any)
      setUsers(prev => prev.map(u => u.ID === userId ? { ...u, ROLE: newRole } : u))
    }
    setUpdating(null)
  }

  // Counts for filter chips
  const counts = { all: users.length, USER: 0, DRIVER: 0, admin: 0 } as Record<string, number>
  users.forEach(u => { if (u.ROLE && counts[u.ROLE] !== undefined) counts[u.ROLE]++ })

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
          --radius:       14px;
        }

        .users-root {
          font-family: 'DM Sans', sans-serif;
          color: var(--gray-900);
          min-height: 100vh;
          background: var(--gray-50);
        }

        /* ── Header ── */
        .users-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          padding: 28px 36px 0;
          flex-wrap: wrap;
          gap: 14px;
        }
        .users-header__eyebrow {
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
        .users-header__dot {
          width: 6px; height: 6px;
          border-radius: 50%;
          background: var(--orange);
          animation: blink 2s ease-in-out infinite;
        }
        @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0.3} }
        .users-header__title {
          font-family: 'Syne', sans-serif;
          font-size: 26px;
          font-weight: 800;
          color: var(--gray-900);
          letter-spacing: -0.025em;
        }
        .users-header__sub {
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
          white-space: nowrap;
        }
        .refresh-btn:hover:not(:disabled) {
          border-color: var(--orange);
          color: var(--orange);
          box-shadow: 0 0 0 3px rgba(244,121,32,0.08);
        }
        .refresh-btn:disabled { opacity: 0.6; cursor: not-allowed; }
        .spin { animation: spin 0.8s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }

        /* ── Content ── */
        .users-content { padding: 22px 36px 40px; display: flex; flex-direction: column; gap: 18px; }

        /* ── Toolbar ── */
        .toolbar {
          display: flex;
          gap: 12px;
          flex-wrap: wrap;
          align-items: center;
        }

        /* Search */
        .search-wrap {
          position: relative;
          flex: 1;
          min-width: 200px;
          max-width: 340px;
        }
        .search-icon {
          position: absolute;
          left: 12px;
          top: 50%;
          transform: translateY(-50%);
          color: var(--gray-400);
          pointer-events: none;
          width: 15px; height: 15px;
        }
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
        .search-input:focus {
          border-color: var(--orange);
          box-shadow: 0 0 0 3px rgba(244,121,32,0.1);
        }

        /* Filter chips */
        .filter-chips { display: flex; gap: 6px; flex-wrap: wrap; }
        .chip {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          padding: 6px 13px;
          border-radius: 100px;
          border: 1.5px solid var(--gray-200);
          background: var(--white);
          font-family: 'Syne', sans-serif;
          font-size: 11.5px;
          font-weight: 600;
          letter-spacing: 0.04em;
          color: var(--gray-500);
          cursor: pointer;
          transition: all .15s;
        }
        .chip:hover { border-color: var(--orange); color: var(--orange); }
        .chip.active {
          background: var(--orange);
          border-color: var(--orange);
          color: var(--white);
        }
        .chip__count {
          font-size: 10px;
          background: rgba(0,0,0,0.12);
          border-radius: 100px;
          padding: 1px 6px;
          font-weight: 700;
        }
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

        .data-table thead tr {
          background: var(--gray-50);
          border-bottom: 1.5px solid var(--gray-200);
        }
        .data-table th {
          padding: 11px 18px;
          text-align: left;
          font-family: 'Syne', sans-serif;
          font-size: 10.5px;
          font-weight: 700;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: var(--gray-400);
          white-space: nowrap;
        }
        .data-table th:first-child { padding-left: 22px; }
        .data-table th:last-child  { padding-right: 22px; }

        /* Body rows */
        .data-table tbody tr {
          border-bottom: 1px solid var(--gray-100);
          transition: background 0.12s;
          opacity: 0;
          animation: rowIn 0.35s ease forwards;
        }
        .data-table tbody tr:last-child { border-bottom: none; }
        .data-table tbody tr:hover { background: var(--gray-50); }

        @keyframes rowIn { to { opacity: 1; } }

        .data-table td {
          padding: 13px 18px;
          font-size: 13.5px;
          color: var(--gray-700);
          vertical-align: middle;
        }
        .data-table td:first-child { padding-left: 22px; }
        .data-table td:last-child  { padding-right: 22px; }

        /* Name cell */
        .name-cell {
          display: flex;
          align-items: center;
          gap: 11px;
        }
        .user-avatar {
          flex-shrink: 0;
          width: 34px; height: 34px;
          border-radius: 9px;
          background: var(--orange-pale);
          color: var(--orange-dark);
          font-family: 'Syne', sans-serif;
          font-size: 11.5px;
          font-weight: 700;
          display: flex;
          align-items: center;
          justify-content: center;
          letter-spacing: 0.02em;
          border: 1.5px solid var(--orange-pale2);
        }
        .name-text {
          font-weight: 500;
          color: var(--gray-900);
          font-size: 13.5px;
        }

        /* Muted text */
        .muted { color: var(--gray-400); font-size: 13px; }

        /* Role badge */
        .role-badge {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          font-size: 11px;
          font-weight: 600;
          font-family: 'Syne', sans-serif;
          letter-spacing: 0.05em;
          text-transform: uppercase;
          padding: 3px 9px;
          border-radius: 100px;
          white-space: nowrap;
        }
        .role-badge__dot {
          width: 5px; height: 5px;
          border-radius: 50%;
          flex-shrink: 0;
        }

        /* Role select */
        .role-select-wrap {
          position: relative;
          display: inline-flex;
          align-items: center;
        }
        .role-select {
          appearance: none;
          background: var(--gray-50);
          border: 1.5px solid var(--gray-200);
          border-radius: 8px;
          padding: 6px 28px 6px 10px;
          font-family: 'Syne', sans-serif;
          font-size: 11.5px;
          font-weight: 600;
          color: var(--gray-700);
          cursor: pointer;
          outline: none;
          transition: border-color .15s, box-shadow .15s;
          letter-spacing: 0.02em;
        }
        .role-select:focus {
          border-color: var(--orange);
          box-shadow: 0 0 0 3px rgba(244,121,32,0.1);
        }
        .role-select:disabled { opacity: 0.5; cursor: not-allowed; }
        .role-select__chevron {
          position: absolute;
          right: 8px;
          color: var(--gray-400);
          pointer-events: none;
        }

        /* Empty / skeleton states */
        .empty-row td {
          padding: 52px 24px;
          text-align: center;
          color: var(--gray-400);
          font-size: 13.5px;
        }
        .empty-icon {
          width: 40px; height: 40px;
          background: var(--gray-100);
          border-radius: 10px;
          display: flex; align-items: center; justify-content: center;
          margin: 0 auto 10px;
          color: var(--gray-400);
        }

        .skel-row td { padding: 13px 18px; }
        .skel-row td:first-child { padding-left: 22px; }
        .skel {
          height: 14px;
          border-radius: 6px;
          background: linear-gradient(90deg, var(--gray-100) 25%, var(--gray-50) 50%, var(--gray-100) 75%);
          background-size: 200% 100%;
          animation: shimmer 1.4s infinite;
        }
        .skel--sm  { width: 60%; }
        .skel--md  { width: 80%; }
        .skel--lg  { width: 100%; }
        .skel--av  { width: 34px; height: 34px; border-radius: 9px; flex-shrink: 0; }
        @keyframes shimmer { from{background-position:200% 0} to{background-position:-200% 0} }

        /* Result count */
        .result-count {
          font-size: 12px;
          color: var(--gray-400);
          font-family: 'Syne', sans-serif;
          font-weight: 600;
          letter-spacing: 0.04em;
          padding: 14px 22px;
          border-top: 1px solid var(--gray-100);
          text-transform: uppercase;
        }
      `}</style>

      <div className="users-root">
        {/* Header */}
        <div className="users-header">
          <div>
            <div className="users-header__eyebrow">
              <div className="users-header__dot" />
              Kargadoor Admin
            </div>
            <div className="users-header__title">Users</div>
            <div className="users-header__sub">{users.length} total accounts registered</div>
          </div>
          <button className="refresh-btn" onClick={fetchUsers} disabled={loading}>
            <RefreshCw size={13} className={loading ? 'spin' : ''} />
            Refresh
          </button>
        </div>

        <div className="users-content">
          {/* Toolbar */}
          <div className="toolbar">
            {/* Search */}
            <div className="search-wrap">
              <Search className="search-icon" />
              <input
                className="search-input"
                placeholder="Search by name, email, phone…"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>

            {/* Role filter chips */}
            <div className="filter-chips">
              {[
                { value: 'all',    label: 'All' },
                { value: 'USER',   label: 'Users' },
                { value: 'DRIVER', label: 'Drivers' },
                { value: 'admin',  label: 'Admins' },
              ].map(f => (
                <button
                  key={f.value}
                  className={`chip${roleFilter === f.value ? ' active' : ''}`}
                  onClick={() => setRoleFilter(f.value)}
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
                  <th>Name</th>
                  <th>Email</th>
                  <th>Phone</th>
                  <th>Role</th>
                  <th>Change Role</th>
                </tr>
              </thead>
              <tbody>
                {/* Loading skeletons */}
                {loading && Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i} className="skel-row">
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
                        <div className="skel skel--av" />
                        <div className="skel skel--md" style={{ flex: 1 }} />
                      </div>
                    </td>
                    <td><div className="skel skel--lg" /></td>
                    <td><div className="skel skel--sm" /></td>
                    <td><div className="skel" style={{ width: 64, height: 22, borderRadius: 100 }} /></td>
                    <td><div className="skel" style={{ width: 90, height: 30, borderRadius: 8 }} /></td>
                  </tr>
                ))}

                {/* Empty state */}
                {!loading && filtered.length === 0 && (
                  <tr className="empty-row">
                    <td colSpan={5}>
                      <div className="empty-icon"><UsersIcon size={18} /></div>
                      No users found
                    </td>
                  </tr>
                )}

                {/* Rows */}
                {!loading && filtered.map((user, idx) => (
                  <tr key={user.ID} style={{ animationDelay: `${idx * 30}ms` }}>
                    <td>
                      <div className="name-cell">
                        <Avatar name={user.FULL_NAME} />
                        <span className="name-text">{user.FULL_NAME ?? '—'}</span>
                      </div>
                    </td>
                    <td><span className="muted">{user.EMAIL ?? '—'}</span></td>
                    <td><span className="muted">{user.PHONE_NUMBER ?? '—'}</span></td>
                    <td><RoleBadge role={user.ROLE} /></td>
                    <td>
                      <RoleSelect
                        value={user.ROLE ?? 'USER'}
                        onChange={(val) => changeRole(user.ID, val)}
                        disabled={updating === user.ID}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {!loading && filtered.length > 0 && (
              <div className="result-count">
                Showing {filtered.length} of {users.length} accounts
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}