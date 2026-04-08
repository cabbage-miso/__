import { TDSMobileAITProvider } from '@toss/tds-mobile-ait'
import { Outlet } from 'react-router'

export function RootLayout() {
  return (
    <TDSMobileAITProvider>
      <Outlet />
    </TDSMobileAITProvider>
  )
}
