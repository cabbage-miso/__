import ky from 'ky'

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:4000'

export const apiClient = ky.create({
  prefixUrl: API_BASE_URL,
})
