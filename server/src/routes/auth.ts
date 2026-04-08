import { Hono } from 'hono'
import type { AuthService } from '../services/auth-service'

export function createAuthRoutes(authService: AuthService) {
  const auth = new Hono()

  auth.post('/token', async (c) => {
    const body = await c.req.json<{
      authorizationCode: string
      referrer: string
    }>()

    if (!body.authorizationCode || !body.referrer) {
      return c.json(
        { error: 'authorizationCode and referrer are required' },
        400,
      )
    }

    const result = await authService.generateToken(body)
    return c.json(result)
  })

  auth.post('/refresh', async (c) => {
    const body = await c.req.json<{ refreshToken: string }>()

    if (!body.refreshToken) {
      return c.json({ error: 'refreshToken is required' }, 400)
    }

    const result = await authService.refreshToken(body)
    return c.json(result)
  })

  auth.get('/me', async (c) => {
    const authorization = c.req.header('Authorization')

    if (!authorization?.startsWith('Bearer ')) {
      return c.json({ error: 'Authorization header required' }, 401)
    }

    const accessToken = authorization.split(' ')[1]
    const result = await authService.getUserInfo(accessToken)
    return c.json(result)
  })

  auth.post('/logout', async (c) => {
    const authorization = c.req.header('Authorization')

    if (!authorization?.startsWith('Bearer ')) {
      return c.json({ error: 'Authorization header required' }, 401)
    }

    const accessToken = authorization.split(' ')[1]
    const result = await authService.logoutByAccessToken(accessToken)
    return c.json(result)
  })

  return auth
}
