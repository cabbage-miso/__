import { apiClient } from '@/shared/api'
import type { UserInfo } from '../model/types'

export async function getUserInfo(
  accessToken: string,
): Promise<{ success: UserInfo }> {
  return apiClient
    .get('auth/me', {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
    .json<{ success: UserInfo }>()
}
