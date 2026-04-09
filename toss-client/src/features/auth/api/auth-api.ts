import { apiClient } from '@/shared/api'
import type { LoginResult } from '../model/types'

export async function getAccessToken(
  authorizationCode: string,
  referrer: string,
): Promise<LoginResult> {
  return apiClient
    .post('auth/token', {
      json: { authorizationCode, referrer },
    })
    .json<LoginResult>()
}

export async function refreshAccessToken(
  refreshToken: string,
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
