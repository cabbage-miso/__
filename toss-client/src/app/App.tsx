import { TDSMobileAITProvider } from '@toss/tds-mobile-ait'
import { HomePage } from '@/pages/home'

export function App() {
  return (
    <TDSMobileAITProvider>
      <HomePage />
    </TDSMobileAITProvider>
  )
}
