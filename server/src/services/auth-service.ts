import type { TlsClient } from '../clients/tls-client'
import type {
  TokenRequest,
  TokenResponse,
  RefreshRequest,
  UserInfo,
  TossApiResponse,
} from '../types/auth'
import { decryptUserInfo } from '../utils/decrypt'

const API_PATH = '/api-partner/v1/apps-in-toss/user/oauth2'

export class AuthService {
  constructor(
    private client: TlsClient,
    private decryptionKey: string,
    private decryptionAad: string,
  ) {}

  async generateToken(
    request: TokenRequest,
  ): Promise<TossApiResponse<TokenResponse>> {
    return this.client.post<TossApiResponse<TokenResponse>>(
      `${API_PATH}/generate-token`,
      request,
    )
  }

  async refreshToken(
    request: RefreshRequest,
  ): Promise<TossApiResponse<TokenResponse>> {
    return this.client.post<TossApiResponse<TokenResponse>>(
      `${API_PATH}/refresh-token`,
      request,
    )
  }

  async getUserInfo(accessToken: string): Promise<TossApiResponse<UserInfo>> {
    const response = await this.client.get<TossApiResponse<UserInfo>>(
      `${API_PATH}/login-me`,
      { Authorization: `Bearer ${accessToken}` },
    )

    if (response.success) {
      response.success = decryptUserInfo(
        response.success,
        this.decryptionKey,
        this.decryptionAad,
      )
    }

    return response
  }

  async logoutByAccessToken(
    accessToken: string,
  ): Promise<TossApiResponse<unknown>> {
    return this.client.post<TossApiResponse<unknown>>(
      `${API_PATH}/access/remove-by-access-token`,
      { accessToken },
    )
  }
}
