# WhaleTracker Mobile

Expo + React Native tabanlı mobil uygulama.

## Kurulum

```bash
cd mobile
npm install
```

## Çalıştırma

```bash
# Expo Go ile (telefonda test)
npx expo start

# Android emülatör
npx expo start --android

# iOS simülatör
npx expo start --ios
```

## API Bağlantısı

`app.json` → `expo.extra` içindeki URL'leri güncelle:

| Ortam | API_BASE_URL |
|---|---|
| Android emülatör | `http://10.0.2.2:8000` |
| iOS simülatör | `http://localhost:8000` |
| Gerçek cihaz (yerel ağ) | `http://192.168.x.x:8000` |
| Üretim | `https://api.whaletracker.app` |

## Klasör Yapısı

```
mobile/
├── App.js                     ← giriş noktası
├── app.json                   ← Expo konfigürasyonu
├── src/
│   ├── constants/
│   │   └── colors.js          ← renk paleti
│   ├── context/
│   │   └── AuthContext.js     ← global auth state
│   ├── hooks/
│   │   └── useWebSocket.js    ← canlı veri hook'u
│   ├── navigation/
│   │   └── AppNavigator.js    ← tab + stack router
│   ├── screens/
│   │   ├── LoginScreen.js
│   │   ├── BetaFullScreen.js
│   │   ├── DashboardScreen.js ← ana dashboard
│   │   ├── JournalScreen.js   ← trade günlüğü
│   │   ├── StatsScreen.js     ← istatistikler
│   │   ├── AIChatScreen.js    ← AI Coach sohbet
│   │   └── NewsScreen.js      ← haberler
│   └── services/
│       ├── api.js             ← HTTP istemcisi
│       └── storage.js         ← SecureStore token
```

## WebSocket Kanalları

| Kanal | URL |
|---|---|
| Canlı fiyatlar | `ws://.../ws/live-prices?token=<jwt>` |
| Whale alert'leri | `ws://.../ws/whale-alerts?token=<jwt>` |
| AI Radar | `ws://.../ws/radar?token=<jwt>` |

## Backend API Endpoint'leri

| Endpoint | Açıklama |
|---|---|
| `POST /api/v1/auth/login` | Giriş, JWT döner |
| `GET /api/v1/users/me` | Kullanıcı bilgisi |
| `GET /api/v1/mobile/dashboard` | Tüm dashboard verisi (tek çağrı) |
| `GET /api/v1/mobile/journal` | Sayfalı trade günlüğü |
| `GET /api/v1/mobile/stats?period=30d` | İstatistikler |
| `POST /api/v1/ai/chat` | AI sohbet |
| `GET /api/v1/news` | Haberler |
