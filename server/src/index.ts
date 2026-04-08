import 'dotenv/config'
import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { TlsClient } from './clients/tls-client'
import { AuthService } from './services/auth-service'
import { createAuthRoutes } from './routes/auth'

const required = [
  'CERT_PATH',
  'KEY_PATH',
  'TOSS_API_BASE_URL',
  'DECRYPTION_KEY',
  'DECRYPTION_AAD',
] as const
for (const key of required) {
  if (!process.env[key]) {
    throw new Error(`Missing required env var: ${key}`)
  }
}

const app = new Hono()

app.use(
  '/*',
  cors({
    origin: process.env.CORS_ORIGIN ?? 'http://localhost:5173',
    allowMethods: ['GET', 'POST', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization'],
  }),
)

app.onError((err, c) => {
  console.error(err)
  return c.json({ error: err.message }, 500)
})

const tlsClient = new TlsClient(
  process.env.CERT_PATH!,
  process.env.KEY_PATH!,
  process.env.TOSS_API_BASE_URL!,
)

const authService = new AuthService(
  tlsClient,
  process.env.DECRYPTION_KEY!,
  process.env.DECRYPTION_AAD!,
)

const authRoutes = createAuthRoutes(authService)
app.route('/auth', authRoutes)

app.get('/health', (c) => c.json({ status: 'ok' }))

const port = Number(process.env.PORT) || 4000

serve({ fetch: app.fetch, port, hostname: '0.0.0.0' }, (info) => {
  console.log(`Server running on http://localhost:${info.port}`)
})
