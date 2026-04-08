import 'dotenv/config'
import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { TlsClient } from './clients/tls-client'
import { AuthService } from './services/auth-service'
import { createAuthRoutes } from './routes/auth'

const app = new Hono()

app.use(
  '/*',
  cors({
    origin: '*',
    allowMethods: ['GET', 'POST', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization'],
  }),
)

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
