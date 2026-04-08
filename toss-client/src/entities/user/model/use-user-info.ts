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
