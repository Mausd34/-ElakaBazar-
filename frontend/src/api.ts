import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios'

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1'

/* ------------------------------------------------------------------ */
/*  Token storage (access in memory, refresh in localStorage fallback) */
/* ------------------------------------------------------------------ */
const TOKEN_KEY = 'elakabazar_refresh_token'
const ACCESS_TOKEN_KEY = 'elakabazar_access_token'

let accessToken: string | null = null

export function setAccessToken(token: string | null) {
  accessToken = token
  if (token) {
    try { localStorage.setItem(ACCESS_TOKEN_KEY, token) } catch { /* ignore */ }
  } else {
    try { localStorage.removeItem(ACCESS_TOKEN_KEY) } catch { /* ignore */ }
  }
}

export function getAccessToken(): string | null {
  if (accessToken) return accessToken
  try { return localStorage.getItem(ACCESS_TOKEN_KEY) } catch { return null }
}

export function setRefreshToken(token: string | null) {
  if (token) {
    try { localStorage.setItem(TOKEN_KEY, token) } catch { /* ignore */ }
  } else {
    try { localStorage.removeItem(TOKEN_KEY) } catch { /* ignore */ }
  }
}

export function getRefreshToken(): string | null {
  try { return localStorage.getItem(TOKEN_KEY) } catch { return null }
}

export function clearTokens() {
  setAccessToken(null)
  setRefreshToken(null)
}

/* ------------------------------------------------------------------ */
/*  XSS helpers                                                        */
/* ------------------------------------------------------------------ */
export function escapeHtml(unsafe: string): string {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

/* ------------------------------------------------------------------ */
/*  Axios instance                                                     */
/* ------------------------------------------------------------------ */
export const api = axios.create({ baseURL: BASE_URL })

let isRefreshing = false
let refreshSubscribers: ((token: string) => void)[] = []

function onTokenRefreshed(token: string) {
  refreshSubscribers.forEach(cb => cb(token))
  refreshSubscribers = []
}

function addRefreshSubscriber(cb: (token: string) => void) {
  refreshSubscribers.push(cb)
}

api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = getAccessToken()
  const path = new URL(config.url || '', config.baseURL).pathname.replace(/\/+$/, '')
  const method = config.method?.toLowerCase()
  const publicReadPaths = ['/areas', '/categories', '/shops', '/products']
  const publicAuthPaths = ['/auth/register', '/token', '/token/refresh']
  const isPublicRead = method === 'get' && publicReadPaths.includes(path)
  const isPublicAuth = publicAuthPaths.includes(path)
  if (token && !isPublicRead && !isPublicAuth) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

api.interceptors.response.use(
  response => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean }

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (!isRefreshing) {
        isRefreshing = true
        const refreshToken = getRefreshToken()
        try {
          const { data } = await axios.post(`${BASE_URL}/token/refresh/`, { refresh: refreshToken })
          setAccessToken(data.access)
          setRefreshToken(data.refresh || refreshToken)
          isRefreshing = false
          onTokenRefreshed(data.access)
        } catch {
          isRefreshing = false
          clearTokens()
          window.location.href = '/login'
          return Promise.reject(error)
        }
      }

      return new Promise(resolve => {
        addRefreshSubscriber((token: string) => {
          originalRequest.headers.Authorization = `Bearer ${token}`
          resolve(api(originalRequest))
        })
      })
    }

    if (error.response?.status === 401) {
      clearTokens()
      if (window.location.pathname !== '/login') {
        window.location.href = '/login'
      }
    }

    return Promise.reject(error)
  },
)

export async function login(username: string, password: string) {
  const { data } = await api.post('/token/', { username, password })
  setAccessToken(data.access)
  setRefreshToken(data.refresh)
  return data
}

export async function logout() {
  const refreshToken = getRefreshToken()
  if (refreshToken) {
    try {
      await api.post('/token/blacklist/', { refresh: refreshToken })
    } catch {
      /* ignore - blacklist endpoint may not exist on older backend */
    }
  }
  clearTokens()
}
