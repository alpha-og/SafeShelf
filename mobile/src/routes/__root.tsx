import { createRootRouteWithContext, Outlet } from '@tanstack/react-router'
import { TanStackRouterDevtools } from '@tanstack/router-devtools'
import { Toaster } from 'sonner'
import type { AuthState } from '@/providers/AuthProvider'
import type { ProfilesState } from '@/providers/ProfilesProvider'

interface RouterContext {
  auth: AuthState
  profiles: ProfilesState
}

export const Route = createRootRouteWithContext<RouterContext>()({
  component: () => (
    <div className="h-dvh overflow-hidden flex flex-col bg-background text-foreground antialiased font-sans selection:bg-primary/20 pt-[var(--sat)] pb-[var(--sab)] box-border">
      <Outlet />
      <Toaster theme="dark" position="top-center" richColors />
      {import.meta.env.DEV && <TanStackRouterDevtools />}
    </div>
  ),
})
