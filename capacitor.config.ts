import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'kr.ilitda.app',
  appName: '일잇다',
  webDir: '.next',
  server: {
    url: 'https://ilitda.vercel.app',
    cleartext: false,
    // 개발 시: 'http://192.168.x.x:3000'으로 교체 후 cleartext: true
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#2563EB',
      showSpinner: false,
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_CROP',
    },
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#2563EB',
    },
    // PushNotifications: FCM 미사용 (1개월차 이후 추가 예정, Solapi SMS로 대체)
    Geolocation: {
      permissions: {
        location: 'whenInUse',
      },
    },
  },
}

export default config
