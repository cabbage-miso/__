import { ErrorBoundaryProvider } from './error-boundary-provider'
import { QueryProvider } from './query-provider'
import { AppRouter } from './router-provider'

export function Providers() {
  return (
    <ErrorBoundaryProvider>
      <QueryProvider>
        <AppRouter />
      </QueryProvider>
    </ErrorBoundaryProvider>
  )
}
