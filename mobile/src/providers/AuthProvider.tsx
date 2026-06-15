import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react'
import { api, setAccessToken, restoreToken, setOnLogout, getAccessToken } from '@/lib/axios'
import { setToken } from '@/lib/storage'

interface User {
  id: number
  email: string
  created_at: string
}

interface AuthState {
  user: User | null
  accessToken: string | null
  isAuthenticated: boolean
  isLoading: boolean
  signUp: (email: string, password: string) => Promise<void>
  signIn: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
  restoreSession: (token: string, user: User) => void
}

const AuthContext = createContext<AuthState | undefined>(undefined)

function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [accessToken, setAccessTokenState] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const restoreSession = useCallback((token: string, user: User) => {
    setAccessToken(token)
    setAccessTokenState(token)
    setToken(token)
    setUser(user)
  }, [])

  const clearAuth = useCallback(() => {
    setUser(null)
    setAccessTokenState(null)
    setAccessToken(null)
    setToken(null)
  }, [])

  useEffect(() => {
    setOnLogout(() => {
      clearAuth()
    })
  }, [clearAuth])

  useEffect(() => {
    ;(async () => {
      const hasToken = await restoreToken()
      if (!hasToken) {
        setIsLoading(false)
        return
      }
      try {
        const { data } = await api.get<{ id: number; email: string; created_at: string }>('/v1/auth/me')
        setUser(data)
        setAccessTokenState(getAccessToken())
      } catch {
        await setToken(null)
        setAccessToken(null)
      } finally {
        setIsLoading(false)
      }
    })()
  }, [accessToken])

  const signUp = useCallback(async (email: string, password: string) => {
    const { data } = await api.post<{
      id: number
      email: string
      created_at: string
      access_token: string
    }>('/v1/auth/signup', { email, password })
    restoreSession(data.access_token, { id: data.id, email: data.email, created_at: data.created_at })
  }, [restoreSession])

  const signIn = useCallback(async (email: string, password: string) => {
    const { data } = await api.post<{ access_token: string }>('/v1/auth/signin', { email, password })
    setAccessToken(data.access_token)
    setAccessTokenState(data.access_token)
    setToken(data.access_token)
    const { data: userData } = await api.get<{ id: number; email: string; created_at: string }>('/v1/auth/me')
    setUser(userData)
  }, [])

  const signOut = useCallback(async () => {
    try {
      await api.post('/v1/auth/signout')
    } catch {
    } finally {
      clearAuth()
    }
  }, [clearAuth])

  return (
    <AuthContext.Provider
      value={{
        user,
        accessToken,
        isAuthenticated: !!user,
        isLoading,
        signUp,
        signIn,
        signOut,
        restoreSession,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

function useAuth(): AuthState {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}

export { AuthProvider, useAuth }
export type { AuthState, User }
