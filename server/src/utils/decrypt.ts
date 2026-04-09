import * as crypto from 'node:crypto'

export function decryptAes256Gcm(
  encryptedBase64: string,
  keyBase64: string,
  aad: string,
): string {
  const encrypted = Buffer.from(encryptedBase64, 'base64')
  const key = Buffer.from(keyBase64, 'base64')
  const aadBuffer = Buffer.from(aad, 'utf8')

  const iv = encrypted.subarray(0, 12)
  const authTag = encrypted.subarray(encrypted.length - 16)
  const ciphertext = encrypted.subarray(12, encrypted.length - 16)

  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv)
  decipher.setAuthTag(authTag)
  decipher.setAAD(aadBuffer)

  let decrypted = decipher.update(ciphertext, undefined, 'utf8')
  decrypted += decipher.final('utf8')

  return decrypted
}

const ENCRYPTED_FIELDS = [
  'name',
  'phone',
  'birthday',
  'ci',
  'gender',
  'nationality',
  'email',
] as const

export function decryptUserInfo<T extends object>(
  userInfo: T,
  keyBase64: string,
  aad: string,
): T {
  const decrypted: Record<string, unknown> = {
    ...(userInfo as Record<string, unknown>),
  }

  for (const field of ENCRYPTED_FIELDS) {
    const value = decrypted[field]
    if (typeof value === 'string' && value.length > 0) {
      try {
        decrypted[field] = decryptAes256Gcm(value, keyBase64, aad)
      } catch {
        decrypted[field] = null
      }
    }
  }

  return decrypted as T
}
