import { createRootRouteWithContext, Outlet } from '@tanstack/react-router'
import { TanStackRouterDevtools } from '@tanstack/router-devtools'
import { Toaster } from 'sonner'
import type { AuthState } from '@/providers/AuthProvider'

interface RouterContext {
  auth: AuthState
}

export const Route = createRootRouteWithContext<RouterContext>()({
  component: () => (
    <div className="h-dvh overflow-hidden flex flex-col bg-background text-foreground antialiased font-sans selection:bg-primary/20">
      <Outlet />
      <Toaster theme="dark" position="top-center" richColors />
      {import.meta.env.DEV && <TanStackRouterDevtools />}
    </div>
  ),
})
