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
