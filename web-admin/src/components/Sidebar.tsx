import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard, Users, Package, Car, DollarSign, LogOut, ShieldCheck, Settings,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/button'

const navItems = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/users', label: 'Users', icon: Users },
  { to: '/orders', label: 'Orders', icon: Package },
  { to: '/drivers', label: 'Driver Approval', icon: ShieldCheck },
  { to: '/vehicles', label: 'Vehicle Approval', icon: Car },
  { to: '/pricing', label: 'Pricing Config', icon: DollarSign },
  { to: '/settings', label: 'Settings', icon: Settings },
]

export function Sidebar() {
  const { profile, signOut, isLocalAdmin } = useAuth()

  return (
    <aside className="flex h-screen w-60 flex-col border-r bg-card">
      {/* Brand */}
      <div className="flex items-center gap-2 border-b px-6 py-5">
        <img src="/kargadoor_logo.png" alt="Kargadoor" className="h-8 w-auto max-w-[32px] object-contain" />
        <div>
          <p className="text-sm font-bold leading-none">Logistics</p>
          <p className="text-xs text-muted-foreground">Admin Panel</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-1 overflow-y-auto p-3">
        {navItems.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
              )
            }
          >
            <Icon className="h-4 w-4 shrink-0" />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* User */}
      <div className="border-t p-3">
        <div className="mb-2 flex items-center gap-2 px-3 py-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
            {profile?.FULL_NAME?.[0]?.toUpperCase() ?? 'A'}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <p className="truncate text-xs font-medium">{profile?.FULL_NAME ?? 'Admin'}</p>
              {isLocalAdmin && (
                <span className="shrink-0 rounded bg-amber-100 px-1 py-0.5 text-[10px] font-semibold text-amber-700">LOCAL</span>
              )}
            </div>
            <p className="truncate text-xs text-muted-foreground">{profile?.EMAIL ?? ''}</p>
          </div>
        </div>
        <Button variant="ghost" size="sm" className="w-full justify-start gap-2 text-muted-foreground hover:text-destructive" onClick={signOut}>
          <LogOut className="h-4 w-4" />
          Sign out
        </Button>
      </div>
    </aside>
  )
}
