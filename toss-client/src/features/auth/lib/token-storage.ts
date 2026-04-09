import type { TokenResponse } from '../model/types'

const STORAGE_KEY = 'auth_tokens'

interface StoredTokens {
  tokens: TokenResponse
  loginTimestamp: number
}

export function saveTokens(tokens: TokenResponse): void {
  const data: StoredTokens = { tokens, loginTimestamp: Date.now() }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
}

export function loadTokens(): StoredTokens | null {
  const raw = localStorage.getItem(STORAGE_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw)
  } catch {
    return null
  }
}

export function clearTokens(): void {
  localStorage.removeItem(STORAGE_KEY)
}

export function isAccessTokenExpired(stored: StoredTokens): boolean {
  return Date.now() > stored.loginTimestamp + stored.tokens.expiresIn * 1000
}
