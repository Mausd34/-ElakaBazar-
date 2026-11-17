import axios from 'axios'
export const api = axios.create({ baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1' })
api.interceptors.request.use(config => {
  const token = localStorage.getItem('access')
  const path = new URL(config.url || '', config.baseURL).pathname.replace(/\/+$/, '')
  const method = config.method?.toLowerCase()
  const publicReadPaths = ['/areas', '/categories', '/shops', '/products']
  const publicAuthPaths = ['/register', '/token', '/token/refresh']
  const isPublicRead = method === 'get' && publicReadPaths.includes(path)
  const isPublicAuth = publicAuthPaths.includes(path)
  if (token && !isPublicRead && !isPublicAuth) config.headers.Authorization = `Bearer ${token}`
  return config
})
api.interceptors.response.use(
  response => response,
  error => {
    if (error.response?.status === 401) {
      localStorage.removeItem('access')
      localStorage.removeItem('refresh')
    }
    return Promise.reject(error)
  },
)
export async function login(username: string, password: string) {
  const { data } = await api.post('/token/', { username, password })
  localStorage.setItem('access', data.access)
  localStorage.setItem('refresh', data.refresh)
  return data
}
