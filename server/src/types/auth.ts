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
