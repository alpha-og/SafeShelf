import { api } from '@/lib/axios'

export interface SignUpResponse {
  id: number
  email: string
  created_at: string
  access_token: string
  token_type: string
}

export interface TokenResponse {
  access_token: string
  token_type: string
}

export interface UserResponse {
  id: number
  email: string
  created_at: string
}

export const authApi = {
  signUp(data: { email: string; password: string }) {
    return api.post<SignUpResponse>('/v1/auth/signup', data)
  },
  signIn(data: { email: string; password: string }) {
    return api.post<TokenResponse>('/v1/auth/signin', data)
  },
  signOut() {
    return api.post('/v1/auth/signout')
  },
  refresh() {
    return api.post<TokenResponse>('/v1/auth/refresh')
  },
  me() {
    return api.get<UserResponse>('/v1/auth/me')
  },
}
