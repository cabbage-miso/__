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
