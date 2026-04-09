import ky from 'ky'

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ??
  'https://distinguished-beauty-production-1bef.up.railway.app'

export const apiClient = ky.create({
  prefix: API_BASE_URL,
})
