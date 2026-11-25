import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { api, getAccessToken, getRefreshToken, clearTokens, login as apiLogin, logout as apiLogout } from './api'

export type AuthUser = {
  id: string
  username: string
  phone: string | null
  full_name: string
  role: string
}

type AuthContextType = {
  user: AuthUser | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (username: string, password: string) => Promise<void>
  logout: () => Promise<void>
  fetchProfile: () => Promise<void>
  hasRole: (role: string) => boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (getAccessToken() || getRefreshToken()) {
      fetchProfile()
    } else {
      setIsLoading(false)
    }
  }, [])

  async function fetchProfile() {
    try {
      const response = await api.get('/auth/me/')
      setUser(response.data)
    } catch {
      clearTokens()
      setUser(null)
    } finally {
      setIsLoading(false)
    }
  }

  async function login(username: string, password: string) {
    await apiLogin(username, password)
    await fetchProfile()
  }

  async function logout() {
    await apiLogout()
    setUser(null)
    setIsLoading(false)
  }

  function hasRole(role: string) {
    return user?.role === role
  }

  const value = {
    user,
    isAuthenticated: !!user,
    isLoading,
    login,
    logout,
    fetchProfile,
    hasRole,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}