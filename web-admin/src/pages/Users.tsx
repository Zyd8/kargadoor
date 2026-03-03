import { useEffect, useState } from 'react'
import { Search, RefreshCw } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { Profile, Role } from '@/types'
import { formatDate } from '@/lib/utils'
import { PageHeader } from '@/components/PageHeader'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useToast } from '@/components/ui/use-toast'
import { Skeleton } from '@/components/ui/skeleton'

const ROLE_COLORS: Record<string, string> = {
  USER: 'bg-blue-100 text-blue-800 border-0',
  DRIVER: 'bg-green-100 text-green-800 border-0',
  admin: 'bg-purple-100 text-purple-800 border-0',
}

export default function Users() {
  const [users, setUsers] = useState<Profile[]>([])
  const [filtered, setFiltered] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState<string>('all')
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
    const { error } = await supabase.from('PROFILE').update({ ROLE: newRole }).eq('ID', userId)
    if (error) { toast({ variant: 'destructive', title: 'Error', description: error.message }); return }
    toast({ variant: 'success' as any, title: 'Role updated' })
    setUsers(prev => prev.map(u => u.ID === userId ? { ...u, ROLE: newRole } : u))
  }

  return (
    <div>
      <PageHeader
        title="Users"
        description={`${users.length} total accounts`}
        action={
          <Button variant="outline" size="sm" onClick={fetchUsers} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        }
      />
      <div className="p-8 space-y-4">
        {/* Filters */}
        <div className="flex gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by name, email, phone…"
              className="pl-9"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <Select value={roleFilter} onValueChange={setRoleFilter}>
            <SelectTrigger className="w-36">
              <SelectValue placeholder="All roles" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All roles</SelectItem>
              <SelectItem value="USER">User</SelectItem>
              <SelectItem value="DRIVER">Driver</SelectItem>
              <SelectItem value="admin">Admin</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Table */}
        <div className="rounded-lg border bg-card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/40">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Name</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Email</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Phone</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Role</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Change Role</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {loading && Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}>
                  {Array.from({ length: 5 }).map((_, j) => (
                    <td key={j} className="px-4 py-3"><Skeleton className="h-5 w-full" /></td>
                  ))}
                </tr>
              ))}
              {!loading && filtered.length === 0 && (
                <tr><td colSpan={5} className="px-4 py-10 text-center text-muted-foreground">No users found</td></tr>
              )}
              {!loading && filtered.map(user => (
                <tr key={user.ID} className="hover:bg-muted/20 transition-colors">
                  <td className="px-4 py-3 font-medium">{user.FULL_NAME ?? '—'}</td>
                  <td className="px-4 py-3 text-muted-foreground">{user.EMAIL ?? '—'}</td>
                  <td className="px-4 py-3 text-muted-foreground">{user.PHONE_NUMBER ?? '—'}</td>
                  <td className="px-4 py-3">
                    <Badge variant="outline" className={ROLE_COLORS[user.ROLE ?? ''] ?? ''}>
                      {user.ROLE ?? '—'}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <Select
                      value={user.ROLE ?? ''}
                      onValueChange={(val) => changeRole(user.ID, val as Role)}
                    >
                      <SelectTrigger className="h-7 w-28 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="USER">User</SelectItem>
                        <SelectItem value="DRIVER">Driver</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                      </SelectContent>
                    </Select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
