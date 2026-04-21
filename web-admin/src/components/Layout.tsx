import { Outlet } from 'react-router-dom'
import { Sidebar } from '@/components/Sidebar'
import { Toaster } from '@/components/ui/toaster'

export function Layout() {
  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>
      <Toaster />
    </div>
  )
}
