# Auth Server Deployment & Token Persistence Design

## Goal

Two improvements to the existing Toss Login implementation:
1. Deploy the auth server to Railway so it's accessible beyond the local network
2. Persist auth tokens in localStorage so users stay logged in across app re-entries

## 1. Server Deployment — Railway

### Problem

The auth server runs locally at `http://192.168.55.253:4000`. It's only reachable from the same LAN, making it unusable for production or external testing.

### Constraint

The server uses mTLS (mutual TLS) to communicate with the Toss API. `TlsClient` currently loads cert/key files from disk via `fs.readFileSync`. Railway doesn't have these files.

### Solution

Refactor `TlsClient` to accept `Buffer` data directly instead of file paths. The cert resolution logic in `index.ts` supports two modes:

- **Railway (production):** Read base64-encoded cert/key from `CERT_BASE64` / `KEY_BASE64` env vars, decode to `Buffer`
- **Local dev:** Read from file paths via `CERT_PATH` / `KEY_PATH` (existing behavior)

No Dockerfile needed — Railway's nixpacks auto-detects Node.js from `package.json` and uses the existing `build` (`tsc`) and `start` (`node dist/index.js`) scripts.

### Files Changed

| File | Change |
|------|--------|
| `server/src/clients/tls-client.ts` | Constructor: `(certPath, keyPath, baseUrl)` → `(cert: Buffer, key: Buffer, baseUrl: string)`. Remove `fs` import and `readFileSync` calls. |
| `server/src/index.ts` | Add `loadCert()` function that checks `CERT_BASE64`/`KEY_BASE64` first, falls back to `CERT_PATH`/`KEY_PATH`. Update env var validation. |

### Railway Configuration

| Env Var | Value |
|---------|-------|
| `CERT_BASE64` | `base64 -i cert/public.crt` output |
| `KEY_BASE64` | `base64 -i cert/private.key` output |
| `TOSS_API_BASE_URL` | `https://apps-in-toss-api.toss.im` |
| `DECRYPTION_KEY` | AES-256-GCM key (from .env) |
| `DECRYPTION_AAD` | `TOSS` |
| `CORS_ORIGIN` | Client production URL |
| `PORT` | Auto-injected by Railway |

### Cert Resolution Logic

```typescript
function loadCert(): { cert: Buffer; key: Buffer } {
  if (process.env.CERT_BASE64 && process.env.KEY_BASE64) {
    return {
      cert: Buffer.from(process.env.CERT_BASE64, 'base64'),
      key: Buffer.from(process.env.KEY_BASE64, 'base64'),
    }
  }
  if (process.env.CERT_PATH && process.env.KEY_PATH) {
    return {
      cert: fs.readFileSync(process.env.CERT_PATH),
      key: fs.readFileSync(process.env.KEY_PATH),
    }
  }
  throw new Error('Provide CERT_BASE64/KEY_BASE64 or CERT_PATH/KEY_PATH')
}
```

---

## 2. Client Token Persistence — localStorage

### Problem

`useAuth` stores tokens in `useState`. Tokens are lost on page refresh or when the user exits and re-enters the mini-app.

### Token Lifecycle

- `accessToken`: 1 hour
- `refreshToken`: 14 days
- On refresh, a new token pair (including new refreshToken) is issued

### Solution

Create a `token-storage` module in `features/auth/lib/` and enhance `useAuth` to hydrate from and sync to localStorage.

**What to store:** Both `accessToken` and `refreshToken`, plus a `loginTimestamp` to determine accessToken expiry without a network call.

### Session Maintenance Flow

```
App start
  └→ Load tokens from localStorage
       ├→ No tokens → isLoggedIn = false (show login prompt on action)
       ├→ accessToken valid → use directly
       └→ accessToken expired
            └→ Try refresh with refreshToken
                 ├→ Success → save new tokens, proceed
                 └→ Failure (any reason) → clear tokens, isLoggedIn = false
```

### Files Changed

| File | Change |
|------|--------|
| `toss-client/src/features/auth/lib/token-storage.ts` | **New.** `saveTokens()`, `loadTokens()`, `clearTokens()` with internal `StoredTokens` type |
| `toss-client/src/features/auth/model/use-auth.ts` | Hydrate from localStorage on mount, sync on login/logout/refresh, auto-refresh expired accessToken on startup |
| `toss-client/src/features/auth/index.ts` | No changes (token-storage is internal, not public API) |

### Token Storage Module

```typescript
// features/auth/lib/token-storage.ts
const STORAGE_KEY = 'auth_tokens'

interface StoredTokens {
  tokens: TokenResponse
  loginTimestamp: number
}

function saveTokens(tokens: TokenResponse): void {
  const data: StoredTokens = { tokens, loginTimestamp: Date.now() }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
}

function loadTokens(): StoredTokens | null {
  const raw = localStorage.getItem(STORAGE_KEY)
  if (!raw) return null
  try { return JSON.parse(raw) } catch { return null }
}

function clearTokens(): void {
  localStorage.removeItem(STORAGE_KEY)
}
```

### useAuth Changes

```typescript
// Initialization — lazy hydrate from localStorage
const [tokens, setTokens] = useState<TokenResponse | null>(() => {
  const stored = loadTokens()
  return stored?.tokens ?? null
})

// On mount — check expiry and auto-refresh if needed
useEffect(() => {
  const stored = loadTokens()
  if (!stored) return
  
  const { tokens: t, loginTimestamp } = stored
  const isAccessTokenExpired = Date.now() > loginTimestamp + t.expiresIn * 1000
  
  if (isAccessTokenExpired && t.refreshToken) {
    authApi.refreshAccessToken(t.refreshToken)
      .then(result => {
        setTokens(result.success)
        saveTokens(result.success)
      })
      .catch(() => {
        setTokens(null)
        clearTokens()
      })
  }
}, [])

// Login — save to localStorage after successful login
const login = useCallback(async () => {
  const { authorizationCode, referrer } = await appLogin()
  const result = await authApi.getAccessToken(authorizationCode, referrer)
  setTokens(result.success)
  saveTokens(result.success)
  return result.success
}, [])

// Logout — clear localStorage
const logout = useCallback(async () => {
  try {
    if (tokens?.accessToken) await authApi.logout(tokens.accessToken)
  } catch { /* clear regardless */ }
  setTokens(null)
  clearTokens()
}, [tokens])

// Refresh — update localStorage
const refresh = useCallback(async () => {
  if (!tokens?.refreshToken) return
  const result = await authApi.refreshAccessToken(tokens.refreshToken)
  setTokens(result.success)
  saveTokens(result.success)
}, [tokens])
```

### FSD Compliance

- `token-storage.ts` lives in `features/auth/lib/` — scoped to the auth feature, not leaked to `shared/`
- No upward imports (auth doesn't import from pages/widgets)
- `token-storage` is internal implementation, not exported from `features/auth/index.ts`

### Security

- Tokens in localStorage are accessible via JavaScript (XSS risk)
- Acceptable in Toss WebView: sandboxed environment, no cross-origin scripts
- Same approach used by Supabase Auth SDK and Firebase Auth SDK in similar environments

---

## Client API Base URL Update

After Railway deployment, update `VITE_API_BASE_URL` to point to the Railway URL instead of the LAN IP:

```typescript
// toss-client/src/shared/api/api-client.ts
const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? 'http://192.168.55.253:4000'
```

The fallback remains the LAN IP for local development. For production builds, set `VITE_API_BASE_URL` to the Railway URL.

---

## Implementation Order

1. **Server refactor** — Modify TlsClient + index.ts for env var cert loading (can test locally)
2. **Railway deploy** — Push to Railway, configure env vars, verify health endpoint
3. **Client token persistence** — Add token-storage, modify useAuth
4. **Client API URL** — Update VITE_API_BASE_URL to Railway URL
5. **E2E test** — Login in Toss app → exit → re-enter → verify session maintained

Server and client changes are independent and can be parallelized. Deploy must complete before E2E testing.
