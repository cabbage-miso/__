# Apps-in-Toss Login Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a minimal auth server (Hono) and client integration that proves Toss Login works and user info loads correctly.

**Architecture:** Stateless Hono server acts as an mTLS proxy to the Toss OAuth2 API with AES-256-GCM user data decryption. Client uses `appLogin()` from `@apps-in-toss/web-framework` to get an authorization code, exchanges it for tokens via the server, and displays user info on the HomePage.

**Tech Stack:** Hono, Node.js, ky, React, React Query, TypeScript, TDS Mobile

**Parallel Tracks:** Tasks 1-4 (Server) and Tasks 5-8 (Client) can be dispatched to separate subagents and executed in parallel. Task 9 (Integration) depends on both.

**Spec:** `docs/superpowers/specs/2026-04-09-toss-login-design.md`

---

## File Structure Overview

### Server — New files

| File | Responsibility |
|------|---------------|
| `server/package.json` | Dependencies: hono, @hono/node-server, dotenv |
| `server/tsconfig.json` | TypeScript config (ES2022, ESNext modules) |
| `server/.env` | Secrets: port, Toss API URL, cert paths, decryption key/AAD |
| `server/cert/public.crt` | mTLS client certificate (moved from mTLS_인증서_20260404/) |
| `server/cert/private.key` | mTLS client private key (moved from mTLS_인증서_20260404/) |
| `server/src/types/auth.ts` | Request/response type definitions |
| `server/src/utils/decrypt.ts` | AES-256-GCM decryption functions |
| `server/src/clients/tls-client.ts` | mTLS HTTPS client wrapper |
| `server/src/services/auth-service.ts` | Toss OAuth2 API call logic |
| `server/src/routes/auth.ts` | 4 auth endpoints |
| `server/src/index.ts` | App entry: Hono + CORS + routes + serve |

### Client — New files

| File | Responsibility |
|------|---------------|
| `toss-client/src/shared/api/api-client.ts` | ky instance with base URL |
| `toss-client/src/shared/api/index.ts` | Public API export |
| `toss-client/src/features/auth/model/types.ts` | Token types |
| `toss-client/src/features/auth/api/auth-api.ts` | Server auth endpoint calls |
| `toss-client/src/features/auth/model/use-auth.ts` | useAuth hook |
| `toss-client/src/features/auth/index.ts` | Public API export |
| `toss-client/src/entities/user/model/types.ts` | UserInfo type |
| `toss-client/src/entities/user/api/user-api.ts` | GET /auth/me call |
| `toss-client/src/entities/user/model/use-user-info.ts` | useUserInfo hook (React Query) |
| `toss-client/src/entities/user/index.ts` | Public API export |

### Modified files

| File | Change |
|------|--------|
| `.gitignore` | Add cert/, .env entries |
| `toss-client/src/pages/home/ui/HomePage.tsx` | Login button + user info display |

---

## Track A: Server (Tasks 1-4)

### Task 1: Server Project Setup + Certificate Relocation

**Files:**
- Create: `server/package.json`
- Create: `server/tsconfig.json`
- Create: `server/.env`
- Move: `server/mTLS_인증서_20260404/*.key` → `server/cert/private.key`
- Move: `server/mTLS_인증서_20260404/*.crt` → `server/cert/public.crt`
- Modify: `.gitignore`

- [ ] **Step 1: Create server/package.json**

```json
{
  "name": "server",
  "private": true,
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js"
  },
  "dependencies": {
    "hono": "^4.7.0",
    "@hono/node-server": "^1.14.0",
    "dotenv": "^16.5.0"
  },
  "devDependencies": {
    "tsx": "^4.19.0",
    "typescript": "~5.9.3",
    "@types/node": "^22.0.0"
  }
}
```

- [ ] **Step 2: Create server/tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "outDir": "dist",
    "rootDir": "src",
    "declaration": true
  },
  "include": ["src"]
}
```

- [ ] **Step 3: Create server/.env**

```
PORT=4000
TOSS_API_BASE_URL=https://apps-in-toss-api.toss.im
CERT_PATH=./cert/public.crt
KEY_PATH=./cert/private.key
DECRYPTION_KEY=Xrd0wUJGTvpF5Y+3DY0uFLV23ZPO1GamsnbaCSwBqXQ=
DECRYPTION_AAD=TOSS
```

- [ ] **Step 4: Relocate mTLS certificates**

```bash
cd /Users/jangho.choi/Documents/GitHub/__/server
mkdir -p cert
cp "mTLS_인증서_20260404/wellness-calendar_public.crt" cert/public.crt
cp "mTLS_인증서_20260404/wellness-calendar_private.key" cert/private.key
rm -rf "mTLS_인증서_20260404"
```

- [ ] **Step 5: Update .gitignore**

Add these lines to the root `.gitignore`:

```
# Server secrets
server/cert/
server/.env
.env
.vite
```

- [ ] **Step 6: Install server dependencies**

```bash
cd /Users/jangho.choi/Documents/GitHub/__/server
pnpm install
```

- [ ] **Step 7: Commit**

```bash
git add server/package.json server/tsconfig.json server/pnpm-lock.yaml .gitignore
git commit -m "feat: initialize server project with Hono and mTLS certificates"
```

---

### Task 2: Types + Decrypt Utility + TLS Client

**Files:**
- Create: `server/src/types/auth.ts`
- Create: `server/src/utils/decrypt.ts`
- Create: `server/src/clients/tls-client.ts`

- [ ] **Step 1: Create server/src/types/auth.ts**

```typescript
export interface TokenRequest {
  authorizationCode: string
  referrer: string
}

export interface TokenResponse {
  tokenType: string
  accessToken: string
  refreshToken: string
  expiresIn: number
  scope: string
}

export interface RefreshRequest {
  refreshToken: string
}

export interface UserInfo {
  userKey: number
  scope: string
  agreedTerms: string[]
  name: string | null
  phone: string | null
  birthday: string | null
  ci: string | null
  gender: string | null
  nationality: string | null
  email: string | null
}

export interface TossApiResponse<T> {
  success: T
}

export interface TossApiError {
  error: {
    code: string
    message: string
  }
}
```

- [ ] **Step 2: Create server/src/utils/decrypt.ts**

```typescript
import * as crypto from 'node:crypto'

export function decryptAes256Gcm(
  encryptedBase64: string,
  keyBase64: string,
  aad: string
): string {
  const encrypted = Buffer.from(encryptedBase64, 'base64')
  const key = Buffer.from(keyBase64, 'base64')
  const aadBuffer = Buffer.from(aad, 'utf8')

  const iv = encrypted.subarray(0, 12)
  const authTag = encrypted.subarray(encrypted.length - 16)
  const ciphertext = encrypted.subarray(12, encrypted.length - 16)

  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv)
  decipher.setAuthTag(authTag)
  decipher.setAAD(aadBuffer)

  let decrypted = decipher.update(ciphertext, undefined, 'utf8')
  decrypted += decipher.final('utf8')

  return decrypted
}

const ENCRYPTED_FIELDS = [
  'name',
  'phone',
  'birthday',
  'ci',
  'gender',
  'nationality',
  'email',
] as const

export function decryptUserInfo<T extends Record<string, unknown>>(
  userInfo: T,
  keyBase64: string,
  aad: string
): T {
  const decrypted = { ...userInfo }

  for (const field of ENCRYPTED_FIELDS) {
    const value = decrypted[field]
    if (typeof value === 'string' && value.length > 0) {
      try {
        ;(decrypted as Record<string, unknown>)[field] = decryptAes256Gcm(
          value,
          keyBase64,
          aad
        )
      } catch {
        ;(decrypted as Record<string, unknown>)[field] = null
      }
    }
  }

  return decrypted
}
```

- [ ] **Step 3: Create server/src/clients/tls-client.ts**

```typescript
import * as https from 'node:https'
import * as fs from 'node:fs'

export class TlsClient {
  private cert: Buffer
  private key: Buffer
  private baseUrl: string

  constructor(certPath: string, keyPath: string, baseUrl: string) {
    this.cert = fs.readFileSync(certPath)
    this.key = fs.readFileSync(keyPath)
    this.baseUrl = baseUrl
  }

  async request<T>(
    method: string,
    path: string,
    body?: unknown,
    headers?: Record<string, string>
  ): Promise<T> {
    const url = new URL(path, this.baseUrl)

    return new Promise((resolve, reject) => {
      const options: https.RequestOptions = {
        hostname: url.hostname,
        port: url.port || 443,
        path: url.pathname,
        method,
        cert: this.cert,
        key: this.key,
        rejectUnauthorized: true,
        headers: {
          'Content-Type': 'application/json',
          ...headers,
        },
      }

      const req = https.request(options, (res) => {
        let data = ''
        res.on('data', (chunk: string) => {
          data += chunk
        })
        res.on('end', () => {
          try {
            const parsed = JSON.parse(data) as T
            resolve(parsed)
          } catch {
            reject(new Error(`Failed to parse response: ${data}`))
          }
        })
      })

      req.on('error', reject)

      if (body) {
        req.write(JSON.stringify(body))
      }

      req.end()
    })
  }

  async post<T>(path: string, body: unknown): Promise<T> {
    return this.request<T>('POST', path, body)
  }

  async get<T>(path: string, headers?: Record<string, string>): Promise<T> {
    return this.request<T>('GET', path, undefined, headers)
  }
}
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
cd /Users/jangho.choi/Documents/GitHub/__/server
npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 5: Commit**

```bash
git add server/src/types/ server/src/utils/ server/src/clients/
git commit -m "feat: add server types, AES-256-GCM decrypt utility, and mTLS client"
```

---

### Task 3: Auth Service

**Files:**
- Create: `server/src/services/auth-service.ts`

- [ ] **Step 1: Create server/src/services/auth-service.ts**

```typescript
import type { TlsClient } from '../clients/tls-client'
import type {
  TokenRequest,
  TokenResponse,
  RefreshRequest,
  UserInfo,
  TossApiResponse,
} from '../types/auth'
import { decryptUserInfo } from '../utils/decrypt'

const API_PATH =
  '/api-partner/v1/apps-in-toss/user/oauth2'

export class AuthService {
  constructor(
    private client: TlsClient,
    private decryptionKey: string,
    private decryptionAad: string
  ) {}

  async generateToken(
    request: TokenRequest
  ): Promise<TossApiResponse<TokenResponse>> {
    return this.client.post<TossApiResponse<TokenResponse>>(
      `${API_PATH}/generate-token`,
      request
    )
  }

  async refreshToken(
    request: RefreshRequest
  ): Promise<TossApiResponse<TokenResponse>> {
    return this.client.post<TossApiResponse<TokenResponse>>(
      `${API_PATH}/refresh-token`,
      request
    )
  }

  async getUserInfo(
    accessToken: string
  ): Promise<TossApiResponse<UserInfo>> {
    const response = await this.client.get<TossApiResponse<UserInfo>>(
      `${API_PATH}/login-me`,
      { Authorization: `Bearer ${accessToken}` }
    )

    if (response.success) {
      response.success = decryptUserInfo(
        response.success,
        this.decryptionKey,
        this.decryptionAad
      )
    }

    return response
  }

  async logoutByAccessToken(
    accessToken: string
  ): Promise<TossApiResponse<unknown>> {
    return this.client.post<TossApiResponse<unknown>>(
      `${API_PATH}/access/remove-by-access-token`,
      { accessToken }
    )
  }
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd /Users/jangho.choi/Documents/GitHub/__/server
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add server/src/services/
git commit -m "feat: add auth service for Toss OAuth2 API calls"
```

---

### Task 4: Auth Routes + Server Entry

**Files:**
- Create: `server/src/routes/auth.ts`
- Create: `server/src/index.ts`

- [ ] **Step 1: Create server/src/routes/auth.ts**

```typescript
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
        400
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
```

- [ ] **Step 2: Create server/src/index.ts**

```typescript
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
  })
)

const tlsClient = new TlsClient(
  process.env.CERT_PATH!,
  process.env.KEY_PATH!,
  process.env.TOSS_API_BASE_URL!
)

const authService = new AuthService(
  tlsClient,
  process.env.DECRYPTION_KEY!,
  process.env.DECRYPTION_AAD!
)

const authRoutes = createAuthRoutes(authService)
app.route('/auth', authRoutes)

app.get('/health', (c) => c.json({ status: 'ok' }))

const port = Number(process.env.PORT) || 4000

serve({ fetch: app.fetch, port, hostname: '0.0.0.0' }, (info) => {
  console.log(`Server running on http://localhost:${info.port}`)
})
```

- [ ] **Step 3: Verify server starts**

```bash
cd /Users/jangho.choi/Documents/GitHub/__/server
pnpm dev
```

Expected: `Server running on http://localhost:4000`. Ctrl+C to stop.

- [ ] **Step 4: Verify health endpoint**

```bash
curl http://localhost:4000/health
```

Expected: `{"status":"ok"}`

- [ ] **Step 5: Commit**

```bash
git add server/src/routes/ server/src/index.ts
git commit -m "feat: add auth routes and server entry with CORS"
```

---

## Track B: Client (Tasks 5-8)

### Task 5: Install ky + Shared API Client

**Files:**
- Create: `toss-client/src/shared/api/api-client.ts`
- Create: `toss-client/src/shared/api/index.ts`

- [ ] **Step 1: Install ky**

```bash
cd /Users/jangho.choi/Documents/GitHub/__/toss-client
pnpm add ky
```

- [ ] **Step 2: Create toss-client/src/shared/api/api-client.ts**

```typescript
import ky from 'ky'

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:4000'

export const apiClient = ky.create({
  prefixUrl: API_BASE_URL,
})
```

- [ ] **Step 3: Create toss-client/src/shared/api/index.ts**

```typescript
export { apiClient } from './api-client'
```

- [ ] **Step 4: Commit**

```bash
git add toss-client/src/shared/api/ toss-client/package.json toss-client/pnpm-lock.yaml
git commit -m "feat: add shared API client with ky"
```

---

### Task 6: Auth Feature (features/auth)

**Files:**
- Create: `toss-client/src/features/auth/model/types.ts`
- Create: `toss-client/src/features/auth/api/auth-api.ts`
- Create: `toss-client/src/features/auth/model/use-auth.ts`
- Create: `toss-client/src/features/auth/index.ts`

- [ ] **Step 1: Create toss-client/src/features/auth/model/types.ts**

```typescript
export interface TokenResponse {
  tokenType: string
  accessToken: string
  refreshToken: string
  expiresIn: number
  scope: string
}

export interface LoginResult {
  success: TokenResponse
}
```

- [ ] **Step 2: Create toss-client/src/features/auth/api/auth-api.ts**

```typescript
import { apiClient } from '@/shared/api'
import type { LoginResult } from '../model/types'

export async function getAccessToken(
  authorizationCode: string,
  referrer: string
): Promise<LoginResult> {
  return apiClient
    .post('auth/token', {
      json: { authorizationCode, referrer },
    })
    .json<LoginResult>()
}

export async function refreshAccessToken(
  refreshToken: string
): Promise<LoginResult> {
  return apiClient
    .post('auth/refresh', {
      json: { refreshToken },
    })
    .json<LoginResult>()
}

export async function logout(accessToken: string): Promise<void> {
  await apiClient.post('auth/logout', {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
}
```

- [ ] **Step 3: Create toss-client/src/features/auth/model/use-auth.ts**

```typescript
import { useCallback, useState } from 'react'
import { appLogin } from '@apps-in-toss/web-framework'
import * as authApi from '../api/auth-api'
import type { TokenResponse } from './types'

export function useAuth() {
  const [tokens, setTokens] = useState<TokenResponse | null>(null)

  const isLoggedIn = tokens !== null

  const login = useCallback(async () => {
    const { authorizationCode, referrer } = await appLogin()
    const result = await authApi.getAccessToken(authorizationCode, referrer)
    setTokens(result.success)
    return result.success
  }, [])

  const logout = useCallback(async () => {
    if (tokens?.accessToken) {
      await authApi.logout(tokens.accessToken)
    }
    setTokens(null)
  }, [tokens])

  const refresh = useCallback(async () => {
    if (!tokens?.refreshToken) return
    const result = await authApi.refreshAccessToken(tokens.refreshToken)
    setTokens(result.success)
  }, [tokens])

  return {
    isLoggedIn,
    accessToken: tokens?.accessToken ?? null,
    login,
    logout,
    refresh,
  }
}
```

- [ ] **Step 4: Create toss-client/src/features/auth/index.ts**

```typescript
export { useAuth } from './model/use-auth'
export type { TokenResponse, LoginResult } from './model/types'
```

- [ ] **Step 5: Verify TypeScript compiles**

```bash
cd /Users/jangho.choi/Documents/GitHub/__/toss-client
npx tsc --noEmit
```

Note: `appLogin` may show type errors if `@apps-in-toss/web-framework` types are not fully resolved. This is acceptable — the function exists at runtime in the Toss app environment.

- [ ] **Step 6: Commit**

```bash
git add toss-client/src/features/auth/
git commit -m "feat: add auth feature with useAuth hook and Toss login integration"
```

---

### Task 7: User Entity (entities/user)

**Files:**
- Create: `toss-client/src/entities/user/model/types.ts`
- Create: `toss-client/src/entities/user/api/user-api.ts`
- Create: `toss-client/src/entities/user/model/use-user-info.ts`
- Create: `toss-client/src/entities/user/index.ts`

- [ ] **Step 1: Create toss-client/src/entities/user/model/types.ts**

```typescript
export interface UserInfo {
  userKey: number
  scope: string
  name: string | null
  phone: string | null
  birthday: string | null
  gender: string | null
  nationality: string | null
  email: string | null
}
```

- [ ] **Step 2: Create toss-client/src/entities/user/api/user-api.ts**

```typescript
import { apiClient } from '@/shared/api'
import type { UserInfo } from '../model/types'

export async function getUserInfo(
  accessToken: string
): Promise<{ success: UserInfo }> {
  return apiClient
    .get('auth/me', {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
    .json<{ success: UserInfo }>()
}
```

- [ ] **Step 3: Create toss-client/src/entities/user/model/use-user-info.ts**

```typescript
import { useQuery } from '@tanstack/react-query'
import { getUserInfo } from '../api/user-api'
import type { UserInfo } from './types'

export function useUserInfo(accessToken: string | null) {
  return useQuery<UserInfo>({
    queryKey: ['user', 'me'],
    queryFn: async () => {
      const result = await getUserInfo(accessToken!)
      return result.success
    },
    enabled: accessToken !== null,
  })
}
```

- [ ] **Step 4: Create toss-client/src/entities/user/index.ts**

```typescript
export { useUserInfo } from './model/use-user-info'
export type { UserInfo } from './model/types'
```

- [ ] **Step 5: Commit**

```bash
git add toss-client/src/entities/user/
git commit -m "feat: add user entity with useUserInfo hook"
```

---

### Task 8: HomePage Login UI

**Files:**
- Modify: `toss-client/src/pages/home/ui/HomePage.tsx`

- [ ] **Step 1: Update HomePage.tsx**

Replace the entire content of `toss-client/src/pages/home/ui/HomePage.tsx` with:

```tsx
import { useState } from 'react'
import { BottomCTA } from '@toss/tds-mobile'
import { useAuth } from '@/features/auth'
import { useUserInfo } from '@/entities/user'

export function HomePage() {
  const { isLoggedIn, accessToken, login, logout } = useAuth()
  const { data: user, isLoading } = useUserInfo(accessToken)
  const [error, setError] = useState<string | null>(null)

  const handleLogin = async () => {
    try {
      setError(null)
      await login()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Login failed')
    }
  }

  const handleLogout = async () => {
    try {
      setError(null)
      await logout()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Logout failed')
    }
  }

  return (
    <div className="flex flex-col gap-4 p-5">
      {error && (
        <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">
          {error}
        </div>
      )}

      {isLoggedIn ? (
        <>
          <div className="rounded-lg bg-gray-50 p-4">
            <p className="mb-3 text-sm font-semibold text-green-600">
              로그인됨
            </p>
            {isLoading ? (
              <p className="text-sm text-gray-500">로딩 중...</p>
            ) : user ? (
              <div className="flex flex-col gap-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">이름</span>
                  <span>{user.name ?? '-'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">전화번호</span>
                  <span>{user.phone ?? '-'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">성별</span>
                  <span>{user.gender ?? '-'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">생년월일</span>
                  <span>{user.birthday ?? '-'}</span>
                </div>
              </div>
            ) : null}
          </div>
          <BottomCTA onClick={handleLogout}>로그아웃</BottomCTA>
        </>
      ) : (
        <BottomCTA onClick={handleLogin}>로그인</BottomCTA>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Verify dev server starts**

```bash
cd /Users/jangho.choi/Documents/GitHub/__/toss-client
pnpm dev
```

Expected: Dev server starts without build errors. The page should render the login button.

Note: `BottomCTA` may use a compound component pattern (e.g., `<BottomCTA.Item>`). If the `onClick` prop doesn't work directly, check the TDS Mobile API and adjust accordingly — for example, wrapping with `<BottomCTA><BottomCTA.Item onClick={handler}>Text</BottomCTA.Item></BottomCTA>`.

- [ ] **Step 3: Commit**

```bash
git add toss-client/src/pages/home/ui/HomePage.tsx
git commit -m "feat: add login button and user info display to HomePage"
```

---

## Track C: Integration (Task 9)

### Task 9: End-to-End Verification

**Depends on:** Tasks 1-8 complete.

- [ ] **Step 1: Start the auth server**

```bash
cd /Users/jangho.choi/Documents/GitHub/__/server
pnpm dev
```

Expected: `Server running on http://localhost:4000`

- [ ] **Step 2: Verify server health**

```bash
curl http://localhost:4000/health
```

Expected: `{"status":"ok"}`

- [ ] **Step 3: Verify CORS headers**

```bash
curl -v -X OPTIONS http://localhost:4000/auth/token \
  -H "Origin: http://localhost:5173" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: Content-Type"
```

Expected: Response includes `Access-Control-Allow-Origin` header.

- [ ] **Step 4: Start the client dev server**

In a separate terminal:

```bash
cd /Users/jangho.choi/Documents/GitHub/__/toss-client
pnpm dev
```

- [ ] **Step 5: Test in Toss app environment**

Full login flow requires the Toss app (sandbox or production):

1. Open the mini-app in the Toss app via QR code scan
2. Tap the "로그인" button
3. Complete the Toss login consent screen (first time only)
4. Verify user info (name, phone, gender, birthday) appears on the HomePage
5. Tap "로그아웃" and verify return to login button state

Note: `appLogin()` only works inside the Toss app WebView. In a browser outside Toss, it will throw an error — this is expected behavior.

- [ ] **Step 6: Final commit**

```bash
git add -A
git commit -m "feat: complete Toss Login integration with auth server and client"
```
