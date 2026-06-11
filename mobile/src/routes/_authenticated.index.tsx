import { createFileRoute } from '@tanstack/react-router'
import { useAuth } from '@/hooks/useAuth'

export const Route = createFileRoute('/_authenticated/')({
  component: DashboardPage,
})

function DashboardPage() {
  const auth = useAuth()
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <h1 className="text-xl font-bold">SafeShelf</h1>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">{auth.user?.email}</span>
            <button
              onClick={() => auth.signOut()}
              className="text-sm text-muted-foreground hover:text-foreground underline"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        <h2 className="text-2xl font-semibold mb-2">Dashboard</h2>
        <p className="text-muted-foreground mb-8">Welcome back, {auth.user?.email}</p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="rounded-lg border p-6">
            <h3 className="font-medium mb-2">My Items</h3>
            <p className="text-sm text-muted-foreground">Track and manage your stored items</p>
          </div>
          <div className="rounded-lg border p-6">
            <h3 className="font-medium mb-2">Categories</h3>
            <p className="text-sm text-muted-foreground">Organize by category</p>
          </div>
          <div className="rounded-lg border p-6">
            <h3 className="font-medium mb-2">Expiry Alerts</h3>
            <p className="text-sm text-muted-foreground">Items expiring soon</p>
          </div>
          <div className="rounded-lg border p-6">
            <h3 className="font-medium mb-2">Shopping List</h3>
            <p className="text-sm text-muted-foreground">Items to buy</p>
          </div>
          <div className="rounded-lg border p-6">
            <h3 className="font-medium mb-2">Recipes</h3>
            <p className="text-sm text-muted-foreground">Suggested recipes</p>
          </div>
          <div className="rounded-lg border p-6">
            <h3 className="font-medium mb-2">Analytics</h3>
            <p className="text-sm text-muted-foreground">Usage insights</p>
          </div>
        </div>
      </main>
    </div>
  )
}
