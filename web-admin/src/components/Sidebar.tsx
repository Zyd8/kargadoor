import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard, Users, Package, Car, DollarSign, LogOut, ShieldCheck, Settings,
} from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'

const navItems = [
  { to: '/',         label: 'Dashboard',        icon: LayoutDashboard },
  { to: '/users',    label: 'Users',             icon: Users },
  { to: '/orders',   label: 'Orders',            icon: Package },
  { to: '/drivers',  label: 'Driver Approval',   icon: ShieldCheck },
  { to: '/vehicles', label: 'Vehicle Approval',  icon: Car },
  { to: '/pricing',  label: 'Pricing Config',    icon: DollarSign },
  { to: '/settings', label: 'Settings',          icon: Settings },
]

const NAV_GROUPS = [
  {
    label: 'Overview',
    items: navItems.slice(0, 1),
  },
  {
    label: 'Management',
    items: navItems.slice(1, 3),
  },
  {
    label: 'Approvals',
    items: navItems.slice(3, 5),
  },
  {
    label: 'Configuration',
    items: navItems.slice(5),
  },
]

export function Sidebar() {
  const { profile, signOut, isLocalAdmin } = useAuth()

  const initials = profile?.FULL_NAME
    ? profile.FULL_NAME.split(' ').map((w: string) => w[0]).slice(0, 2).join('').toUpperCase()
    : 'A'

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
        }

        /* ── Shell ── */
        .sidebar {
          display: flex;
          flex-direction: column;
          width: 232px;
          flex-shrink: 0;
          height: 100vh;
          background: var(--white);
          border-right: 1.5px solid var(--gray-200);
          font-family: 'DM Sans', sans-serif;
          position: sticky;
          top: 0;
          overflow: hidden;
        }

        /* ── Brand ── */
        .sidebar__brand {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 20px 18px 18px;
          border-bottom: 1.5px solid var(--gray-100);
          flex-shrink: 0;
        }
        .sidebar__logo {
          height: 32px;
          width: auto;
          object-fit: contain;
          flex-shrink: 0;
        }
        .sidebar__brand-text {}
        .sidebar__brand-name {
          font-family: 'Syne', sans-serif;
          font-size: 13.5px;
          font-weight: 800;
          color: var(--gray-900);
          letter-spacing: -0.01em;
          line-height: 1;
        }
        .sidebar__brand-sub {
          font-size: 10.5px;
          color: var(--gray-400);
          font-weight: 500;
          letter-spacing: 0.04em;
          text-transform: uppercase;
          margin-top: 2px;
        }

        /* ── Nav ── */
        .sidebar__nav {
          flex: 1;
          overflow-y: auto;
          padding: 14px 10px;
          display: flex;
          flex-direction: column;
          gap: 20px;
          scrollbar-width: none;
        }
        .sidebar__nav::-webkit-scrollbar { display: none; }

        .nav-group {}
        .nav-group__label {
          font-family: 'Syne', sans-serif;
          font-size: 9.5px;
          font-weight: 700;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: var(--gray-400);
          padding: 0 10px;
          margin-bottom: 4px;
          display: block;
        }

        /* ── Nav link ── */
        .nav-link {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 9px 10px;
          border-radius: 9px;
          text-decoration: none;
          font-size: 13.5px;
          font-weight: 500;
          color: var(--gray-500);
          transition: background 0.14s, color 0.14s;
          position: relative;
          overflow: hidden;
        }

        .nav-link:hover {
          background: var(--gray-50);
          color: var(--gray-900);
        }

        .nav-link--active {
          background: var(--orange-pale);
          color: var(--orange-dark);
          font-weight: 600;
        }

        /* Active left bar */
        .nav-link--active::before {
          content: '';
          position: absolute;
          left: 0; top: 20%; bottom: 20%;
          width: 3px;
          border-radius: 0 3px 3px 0;
          background: var(--orange);
        }

        .nav-link__icon {
          flex-shrink: 0;
          width: 30px;
          height: 30px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: transparent;
          color: inherit;
          transition: background 0.14s, color 0.14s;
        }

        .nav-link:hover .nav-link__icon {
          background: var(--gray-100);
          color: var(--gray-700);
        }

        .nav-link--active .nav-link__icon {
          background: var(--orange-pale2);
          color: var(--orange);
        }

        .nav-link__label {
          flex: 1;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        /* ── Divider ── */
        .sidebar__divider {
          height: 1.5px;
          background: var(--gray-100);
          margin: 0 10px;
        }

        /* ── User section ── */
        .sidebar__user {
          flex-shrink: 0;
          border-top: 1.5px solid var(--gray-100);
          padding: 12px 10px;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .user-card {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 9px 10px;
          border-radius: 10px;
          background: var(--gray-50);
          border: 1.5px solid var(--gray-100);
          margin-bottom: 2px;
        }
        .user-avatar {
          flex-shrink: 0;
          width: 34px;
          height: 34px;
          border-radius: 9px;
          background: var(--orange-pale);
          border: 1.5px solid var(--orange-pale2);
          color: var(--orange-dark);
          font-family: 'Syne', sans-serif;
          font-size: 11.5px;
          font-weight: 700;
          display: flex;
          align-items: center;
          justify-content: center;
          letter-spacing: 0.02em;
        }
        .user-info { flex: 1; min-width: 0; }
        .user-name-row {
          display: flex;
          align-items: center;
          gap: 5px;
        }
        .user-name {
          font-size: 12.5px;
          font-weight: 600;
          color: var(--gray-900);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          flex: 1;
          min-width: 0;
        }
        .user-local-badge {
          flex-shrink: 0;
          font-family: 'Syne', sans-serif;
          font-size: 9px;
          font-weight: 700;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          background: #FEF3C7;
          color: #D97706;
          border-radius: 4px;
          padding: 1px 5px;
        }
        .user-email {
          font-size: 11px;
          color: var(--gray-400);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          margin-top: 1px;
        }

        /* Sign out */
        .signout-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          width: 100%;
          padding: 8px 10px;
          border-radius: 8px;
          border: none;
          background: transparent;
          font-family: 'DM Sans', sans-serif;
          font-size: 13px;
          font-weight: 500;
          color: var(--gray-400);
          cursor: pointer;
          transition: background 0.14s, color 0.14s;
          text-align: left;
        }
        .signout-btn:hover {
          background: #FEF2F2;
          color: #DC2626;
        }
        .signout-btn:hover .signout-icon { color: #DC2626; }
        .signout-icon { flex-shrink: 0; transition: color 0.14s; }
      `}</style>

      <aside className="sidebar">
        {/* Brand */}
        <div className="sidebar__brand">
          <img src="/kargadoor_logo.png" alt="Kargadoor" className="sidebar__logo" />
          <div className="sidebar__brand-text">
            <div className="sidebar__brand-name">Kargadoor</div>
            <div className="sidebar__brand-sub">Admin Panel</div>
          </div>
        </div>

        {/* Nav */}
        <nav className="sidebar__nav">
          {NAV_GROUPS.map((group, gi) => (
            <div key={group.label} className="nav-group">
              <span className="nav-group__label">{group.label}</span>
              {group.items.map(({ to, label, icon: Icon }) => (
                <NavLink
                  key={to}
                  to={to}
                  end={to === '/'}
                  className={({ isActive }) =>
                    `nav-link${isActive ? ' nav-link--active' : ''}`
                  }
                >
                  <span className="nav-link__icon">
                    <Icon size={15} />
                  </span>
                  <span className="nav-link__label">{label}</span>
                </NavLink>
              ))}
            </div>
          ))}
        </nav>

        {/* User footer */}
        <div className="sidebar__user">
          <div className="user-card">
            <div className="user-avatar">{initials}</div>
            <div className="user-info">
              <div className="user-name-row">
                <span className="user-name">{profile?.FULL_NAME ?? 'Admin'}</span>
                {isLocalAdmin && <span className="user-local-badge">Local</span>}
              </div>
              <div className="user-email">{profile?.EMAIL ?? ''}</div>
            </div>
          </div>

          <button className="signout-btn" onClick={signOut}>
            <LogOut size={14} className="signout-icon" />
            Sign out
          </button>
        </div>
      </aside>
    </>
  )
}