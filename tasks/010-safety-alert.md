# #010 熱中症/安全アラート

## 概要

天気+GPS情報を活用して高温警報を通知し、熱中症や安全事故を予防する機能を実装する。

## ステータス

🔵 Todo

## 優先度

P1（v1.1）

## 依存

- #007 仕上げ・テスト（MVP）

## 参照スキル

- `genba-app-architecture` - 安全アラート

## タスク

### 1. 天気・気温監視

```typescript
const HEAT_ALERT_THRESHOLD = 35; // 35℃以上で警報

export async function checkWeatherAlerts(): Promise<WeatherAlert[]> {
  const location = await Location.getCurrentPositionAsync({});
  const weather = await getWeather(location.coords.latitude, location.coords.longitude);

  const alerts: WeatherAlert[] = [];
  if (weather.temperature >= HEAT_ALERT_THRESHOLD) {
    alerts.push({
      type: 'heat',
      level: 'danger',
      message: `気温${weather.temperature}℃ - 熱中症危険！`,
    });
  }
  return alerts;
}
```

### 2. プッシュ通知・バックグラウンド監視

```typescript
// 30分ごとにバックグラウンドで気温チェック
TaskManager.defineTask(SAFETY_CHECK_TASK, async () => {
  const alerts = await checkWeatherAlerts();
  for (const alert of alerts) {
    await sendSafetyAlert(alert);
  }
});
```

### 3. 安全設定画面

- 熱中症アラートON/OFF
- 閾値設定（デフォルト35℃）
- 通知間隔（30/60/120分）

### 4. チーム一括通知（チームプラン）

## 完了条件

- [ ] 35℃以上で熱中症警報が出る
- [ ] プッシュ通知が送信される
- [ ] バックグラウンドで定期監視される
- [ ] 閾値を設定できる
- [ ] 個人プラン: 単独通知
- [ ] チームプラン: 一括通知
