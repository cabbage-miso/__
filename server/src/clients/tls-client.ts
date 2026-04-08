import * as https from 'node:https'
import * as fs from 'node:fs'

export class TlsClient {
  private cert: Buffer
  private key: Buffer
  private baseUrl: string

  constructor(certPath: string, keyPath: string, baseUrl: string) {
    this.cert = fs.readFileSync(certPath)
    this.key = fs.readFileSync(keyPath)
    this.baseUrl = baseUrl
  }

  async request<T>(
    method: string,
    path: string,
    body?: unknown,
    headers?: Record<string, string>,
  ): Promise<T> {
    const url = new URL(path, this.baseUrl)

    return new Promise((resolve, reject) => {
      const options: https.RequestOptions = {
        hostname: url.hostname,
        port: url.port || 443,
        path: url.pathname,
        method,
        cert: this.cert,
        key: this.key,
        rejectUnauthorized: true,
        headers: {
          'Content-Type': 'application/json',
          ...headers,
        },
      }

      const req = https.request(options, (res) => {
        let data = ''
        res.on('data', (chunk: string) => {
          data += chunk
        })
        res.on('end', () => {
          try {
            const parsed = JSON.parse(data)
            if (
              res.statusCode &&
              (res.statusCode < 200 || res.statusCode >= 300)
            ) {
              reject(new Error(`Toss API error (${res.statusCode}): ${data}`))
              return
            }
            resolve(parsed as T)
          } catch {
            reject(new Error(`Failed to parse response: ${data}`))
          }
        })
      })

      req.on('error', reject)

      if (body) {
        req.write(JSON.stringify(body))
      }

      req.end()
    })
  }

  async post<T>(path: string, body: unknown): Promise<T> {
    return this.request<T>('POST', path, body)
  }

  async get<T>(path: string, headers?: Record<string, string>): Promise<T> {
    return this.request<T>('GET', path, undefined, headers)
  }
}
