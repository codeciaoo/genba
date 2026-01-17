# #008 GPS自動通知

## 概要

現場半径500m以内に接近した際に、施主やチームメンバーへ自動でSMS通知を送信する機能を実装する。

## ステータス

🔵 Todo

## 優先度

P1（v1.1）

## 依存

- #007 仕上げ・テスト（MVP）

## 参照スキル

- `genba-app-architecture` - GPSジオフェンシング

## タスク

### 1. ジオフェンシング設定

```typescript
// src/features/location/geofencing.ts
import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';

const GEOFENCE_TASK = 'GENBA_GEOFENCE_TASK';
const GEOFENCE_RADIUS = 500; // メートル

export async function registerGeofence(
  siteId: string,
  latitude: number,
  longitude: number
) {
  await Location.startGeofencingAsync(GEOFENCE_TASK, [
    {
      identifier: siteId,
      latitude,
      longitude,
      radius: GEOFENCE_RADIUS,
      notifyOnEnter: true,
      notifyOnExit: true,
    },
  ]);
}

TaskManager.defineTask(GEOFENCE_TASK, async ({ data, error }) => {
  if (error) return;
  const { eventType, region } = data;

  if (eventType === Location.GeofencingEventType.Enter) {
    await sendArrivalNotification(region.identifier);
  }
});
```

### 2. SMS通知送信

```typescript
// src/features/notification/smsNotifier.ts
import * as SMS from 'expo-sms';

export async function sendArrivalNotification(siteId: string) {
  const site = await getSiteById(siteId);
  const message = `【GENBA GEAR】${site.name}に到着しました。`;

  for (const recipient of site.notificationRecipients) {
    await SMS.sendSMSAsync([recipient.phone], message);
  }
}
```

### 3. 現場登録・通知設定画面

- 現場住所→座標変換
- 通知半径設定（500/1000/2000m）
- 通知先登録

## 完了条件

- [ ] 現場を登録できる
- [ ] ジオフェンスが設定できる
- [ ] 現場500m以内で通知が発火する
- [ ] SMSが送信される
- [ ] バックグラウンドでも動作する
