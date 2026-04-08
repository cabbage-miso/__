import type { ReactNode } from 'react'
import type { FallbackProps } from 'react-error-boundary'
import { ErrorBoundary } from 'react-error-boundary'

function GlobalErrorFallback({ error, resetErrorBoundary }: FallbackProps) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        padding: '20px',
        textAlign: 'center',
      }}
    >
      <h1 style={{ fontSize: '24px', marginBottom: '16px' }}>
        Something went wrong
      </h1>
      <p style={{ color: '#666', marginBottom: '24px' }}>
        {error instanceof Error
          ? error.message
          : 'An unexpected error occurred'}
      </p>
      <button
        onClick={resetErrorBoundary}
        style={{
          padding: '12px 24px',
          fontSize: '16px',
          backgroundColor: '#3182F6',
          color: '#fff',
          border: 'none',
          borderRadius: '8px',
          cursor: 'pointer',
        }}
      >
        Try again
      </button>
    </div>
  )
}

export function ErrorBoundaryProvider({ children }: { children: ReactNode }) {
  return (
    <ErrorBoundary
      FallbackComponent={GlobalErrorFallback}
      onError={(error, info) => {
        // TODO: integrate error reporting service
        console.error('Global error:', error, info)
      }}
    >
      {children}
    </ErrorBoundary>
  )
}
