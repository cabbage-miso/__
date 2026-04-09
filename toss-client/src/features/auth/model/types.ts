export interface TokenResponse {
  tokenType: string
  accessToken: string
  refreshToken: string
  expiresIn: number
  scope: string
}

export interface LoginResult {
  success: TokenResponse
}
