import { createBrowserRouter } from 'react-router'

import { HomePage } from '@/pages/home'

import { RootLayout } from './root-layout'

export const router = createBrowserRouter([
  {
    path: '/',
    element: <RootLayout />,
    children: [{ index: true, element: <HomePage /> }],
  },
])
