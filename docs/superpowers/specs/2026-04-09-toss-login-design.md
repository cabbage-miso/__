# Apps-in-Toss Login Feature Design

## Context

This project ("우리 가족 웰니스 캘린더") is an Apps-in-Toss mini-app that needs login functionality. The goal is a "lazy login" pattern — the home screen is visible without authentication, and login is prompted only when the user attempts an action that requires it (e.g., registering weight, earning points).

For now, we are building the **minimal foundation**: an auth server and client integration that proves Toss Login works and user info loads correctly. Future work will integrate Supabase for persistent user data and app-specific features (points, records).

## Architecture Overview

```
┌──────────────┐    appLogin()     ┌──────────────┐
│  Toss App    │ ←───────────────→ │  Client      │
│  (Native)    │  authorizationCode│  (React)     │
└──────────────┘                   └──────┬───────┘
                                          │ HTTP
                                          ▼
                                   ┌──────────────┐    mTLS    ┌──────────────┐
                                   │  Server      │ ─────────→ │  Toss API    │
                                   │  (Hono)      │            │  OAuth2      │
                                   └──────────────┘            └──────────────┘
```

**Approach: Minimal Stateless Proxy (Approach A)**
- Server acts as a mTLS proxy + user data decryptor
- Tokens stored client-side in React state (in-memory)
- Server is stateless — no session management
- Proven pattern from the official example project

## Server Design

### Tech Stack
- **Runtime**: Node.js
- **Framework**: Hono (TypeScript native, modern, lightweight)
- **mTLS**: Node.js `https` module with client certificates

### Directory Structure

```
server/
├── src/
│   ├── index.ts              # Hono app entry + HTTPS server start
│   ├── routes/
│   │   └── auth.ts           # Auth route definitions (4 endpoints)
│   ├── services/
│   │   └── auth-service.ts   # Toss OAuth2 API call logic
│   ├── clients/
│   │   └── tls-client.ts     # mTLS HTTPS client wrapper
│   ├── utils/
│   │   └── decrypt.ts        # AES-256-GCM decryption
│   └── types/
│       └── auth.ts           # Request/response type definitions
├── cert/                     # mTLS certificates (gitignored)
│   ├── public.crt
│   └── private.key
├── .env                      # Secrets (gitignored)
├── package.json
└── tsconfig.json
```

### API Endpoints

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| POST | `/auth/token` | Exchange authorizationCode + referrer for tokens | Body: authorizationCode, referrer |
| POST | `/auth/refresh` | Refresh accessToken | Body: refreshToken |
| GET | `/auth/me` | Fetch + decrypt user info | Header: Authorization Bearer |
| POST | `/auth/logout` | Logout (revoke accessToken) | Header: Authorization Bearer |

### CORS & Server Runtime

- Server runs as **HTTP** in development (not HTTPS) — mTLS is only for server→Toss API calls
- Hono CORS middleware enables requests from the client dev server (localhost:5173)
- Client→Server communication is plain HTTP; mTLS is transparent to the client

### mTLS Client

All server-to-Toss API calls go through a TLS client that attaches:
- Client certificate: `cert/public.crt`
- Client private key: `cert/private.key`
- Base URL: `https://apps-in-toss-api.toss.im`

### User Data Decryption

Toss API returns PII fields encrypted with AES-256-GCM. The server decrypts using:
- Decryption key (from .env)
- AAD (from .env)
- IV: first 12 bytes of the encrypted payload
- Auth tag: last 16 bytes

Encrypted fields: name, phone, birthday, ci, gender, nationality, email.

### Environment Variables (.env)

```
PORT=4000
TOSS_API_BASE_URL=https://apps-in-toss-api.toss.im
CERT_PATH=./cert/public.crt
KEY_PATH=./cert/private.key
DECRYPTION_KEY=<base64-encoded-key>
DECRYPTION_AAD=<aad-string>
```

## Client Design

### Tech Stack
- **HTTP Client**: ky (lightweight fetch wrapper)
- **State**: React state / Context for auth tokens
- **Framework API**: `appLogin()` from `@apps-in-toss/web-framework`

### Directory Structure (FSD)

```
toss-client/src/
├── features/
│   └── auth/
│       ├── index.ts              # Public API: useAuth, login/logout functions
│       ├── api/
│       │   └── auth-api.ts       # Server auth endpoint calls via ky
│       └── model/
│           ├── use-auth.ts       # useAuth hook (login, logout, refresh, isLoggedIn)
│           └── types.ts          # Token types, login request/response
├── entities/
│   └── user/
│       ├── index.ts              # Public API: useUserInfo, User type
│       ├── api/
│       │   └── user-api.ts       # GET /auth/me call
│       └── model/
│           ├── use-user-info.ts  # useUserInfo hook (React Query)
│           └── types.ts          # User info type definition
└── shared/
    └── api/
        ├── api-client.ts         # ky instance with base URL + error handling
        └── index.ts              # Public API export
```

### Key Components

**`shared/api/api-client.ts`** — ky instance:
- Base URL pointing to the auth server
- JSON content type
- Error handling (network errors, auth errors)

**`features/auth/model/use-auth.ts`** — Core auth hook:
- `login()`: calls `appLogin()` → sends authorizationCode to server → stores tokens
- `logout()`: calls server logout → clears tokens
- `refreshToken()`: refreshes accessToken via server
- `isLoggedIn`: boolean derived from token presence
- `accessToken`: current token for API calls

**`entities/user/model/use-user-info.ts`** — User info hook:
- Uses React Query to fetch/cache user info
- Only enabled when `isLoggedIn` is true
- Calls `GET /auth/me` with Authorization header

### Auth Flow (Lazy Login Pattern)

1. User opens app → HomePage renders without login
2. User taps an action requiring login (e.g., "체중 등록하기")
3. Check `isLoggedIn` from `useAuth` — if false:
   a. Call `login()` which triggers `appLogin()` (Toss native login)
   b. Exchange authorization code for tokens via server
   c. Store tokens in React state
4. Proceed with the action

### HomePage Test UI

For verification, HomePage will include:

1. **로그인 버튼** (BottomCTA): calls `useAuth().login()` on click
2. **로그인 상태 표시**: `isLoggedIn` 여부를 화면에 표시
3. **사용자 정보 카드**: 로그인 성공 시 `useUserInfo()`로 받아온 기본 정보 표시
   - 이름 (name)
   - 전화번호 (phone)
   - 성별 (gender)
   - 생년월일 (birthday)
4. **로그아웃 버튼**: 로그인 상태일 때 표시, 클릭 시 로그아웃

```
┌────────────────────────────┐
│                            │
│   (비로그인 상태)            │
│                            │
│   ┌──────────────────────┐ │
│   │     로그인            │ │  ← BottomCTA
│   └──────────────────────┘ │
└────────────────────────────┘

┌────────────────────────────┐
│                            │
│   ✓ 로그인됨               │
│                            │
│   이름: 홍길동              │
│   전화번호: 010-xxxx-xxxx  │
│   성별: MALE               │
│   생년월일: 19900101       │
│                            │
│   ┌──────────────────────┐ │
│   │     로그아웃           │ │  ← BottomCTA
│   └──────────────────────┘ │
└────────────────────────────┘
```

HomePage는 `features/auth`와 `entities/user`를 import하여 사용합니다 (pages → features/entities 의존 — FSD 규칙 준수).

## Toss OAuth2 API Reference

Base URL: `https://apps-in-toss-api.toss.im/api-partner/v1/apps-in-toss/user/oauth2`

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/generate-token` | POST | Exchange authorizationCode for tokens |
| `/refresh-token` | POST | Refresh accessToken |
| `/login-me` | GET | Get user info (encrypted) |
| `/access/remove-by-access-token` | POST | Revoke by accessToken |

## Key Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Server framework | Hono | Modern, TypeScript native, lightweight |
| HTTP client | ky | Lightweight fetch wrapper, clean API |
| Token storage | Client in-memory | Simple, mini-app rarely refreshes |
| Server state | Stateless | Proxy role only, Supabase later for persistence |
| Certificates location | `server/cert/` | kebab-case, gitignored |
| Secrets | `.env` file | Standard, gitignored |

## Future Extension: Supabase Integration

When ready to add persistent user data:
1. After token exchange, use `userKey` to upsert user in Supabase `users` table
2. Store decrypted user info (name, phone, etc.) in Supabase
3. Link app data (points, weight records) to `userKey` as FK
4. No architectural changes needed — add sync step after login

## Verification Plan

1. **Server startup**: Server starts on configured port, mTLS certificates load without error
2. **Login flow**: Client calls `appLogin()` → server exchanges code → tokens returned
3. **User info**: `GET /auth/me` returns decrypted user data (name, phone, etc.)
4. **Token refresh**: Expired token triggers refresh, new token works
5. **Logout**: Session properly revoked via server
6. **Error handling**: Invalid tokens, network errors handled gracefully

Note: Full e2e testing requires a real Toss app environment (sandbox or production). Local development can verify server logic with mock data.
