import { useCallback, useEffect, useState } from 'react'
import { appLogin } from '@apps-in-toss/web-framework'
import * as authApi from '../api/auth-api'
import {
  saveTokens,
  loadTokens,
  clearTokens,
  isAccessTokenExpired,
} from '../lib/token-storage'
import type { TokenResponse } from './types'

export function useAuth() {
  const [tokens, setTokens] = useState<TokenResponse | null>(
    () => loadTokens()?.tokens ?? null,
  )

  const isLoggedIn = tokens !== null

  useEffect(() => {
    const stored = loadTokens()
    if (!stored) return
    if (!isAccessTokenExpired(stored)) return

    authApi
      .refreshAccessToken(stored.tokens.refreshToken)
      .then((result) => {
        setTokens(result.success)
        saveTokens(result.success)
      })
      .catch(() => {
        setTokens(null)
        clearTokens()
      })
  }, [])

  const login = useCallback(async () => {
    const { authorizationCode, referrer } = await appLogin()
    const result = await authApi.getAccessToken(authorizationCode, referrer)
    setTokens(result.success)
    saveTokens(result.success)
    return result.success
  }, [])

  const logout = useCallback(async () => {
    try {
      if (tokens?.accessToken) {
        await authApi.logout(tokens.accessToken)
      }
    } catch {
      // Server logout may fail (expired token, network error) — clear local state regardless
    }
    setTokens(null)
    clearTokens()
  }, [tokens])

  const refresh = useCallback(async () => {
    if (!tokens?.refreshToken) return
    const result = await authApi.refreshAccessToken(tokens.refreshToken)
    setTokens(result.success)
    saveTokens(result.success)
  }, [tokens])

  return {
    isLoggedIn,
    accessToken: tokens?.accessToken ?? null,
    login,
    logout,
    refresh,
  }
}
