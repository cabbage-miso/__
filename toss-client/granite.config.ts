import { defineConfig } from '@apps-in-toss/web-framework/config'

export default defineConfig({
  appName: 'my-family-wellness-calendar',
  brand: {
    displayName: '우리 가족 웰니스 캘린더',
    primaryColor: '#3182F6',
    icon: '',
  },
  web: {
    host: 'localhost',
    port: 5173,
    commands: {
      dev: 'vite',
      build: 'vite build',
    },
  },
  permissions: [],
})
