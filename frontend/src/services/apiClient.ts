/// <reference types="vite/client" />
import axios from 'axios'

// En dev sans VITE_API_URL : passe par le proxy Vite (/api → localhost:3000/api), pas de CORS.
// En prod (frontend et backend sur des domaines différents) : VITE_API_URL doit pointer
// vers l'URL complète du backend, ex. https://api.pharmaconnect.cm/api
const API_BASE_URL = import.meta.env.VITE_API_URL || '/api'

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Add token to requests
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('authToken')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Handle errors
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      const onLoginPage = window.location.pathname === '/login' || window.location.pathname === '/register'
      if (!onLoginPage) {
        localStorage.removeItem('authToken')
        window.location.href = '/login'
      }
    }
    return Promise.reject(error)
  },
)

export default apiClient
