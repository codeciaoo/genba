# オフラインファースト設計

## 基本原則

すべてのデータ操作は「ローカル優先」で実装する。

```
ユーザー操作 → ローカルDB保存 → UI更新 → バックグラウンド同期
              ↑ここで完了として扱う
```

## WatermelonDB 操作

```typescript
// ✅ 正しい: ローカル保存後すぐに成功扱い
async function saveWorkRecord(data: WorkRecordInput) {
  const record = await database.write(async () => {
    return await database.get<WorkRecord>('work_records').create(r => {
      r.voiceTranscript = data.transcript;
      r.status = 'draft';
      r.isSynced = false;  // 未同期フラグ
    });
  });

  // 同期は非同期で（失敗してもローカルには保存済み）
  syncQueue.enqueue(record.id);

  return record;
}

// ❌ 間違い: サーバー応答を待つ
async function saveWorkRecord(data: WorkRecordInput) {
  const response = await api.post('/work-records', data);  // 圏外で失敗
  return response.data;
}
```

## 同期キュー

```typescript
// 同期待ちレコードの管理
interface SyncQueueItem {
  id: string;
  tableName: string;
  operation: 'create' | 'update' | 'delete';
  retryCount: number;
  lastAttempt?: Date;
}

// ネットワーク復帰時に自動同期
NetInfo.addEventListener(state => {
  if (state.isConnected) {
    syncQueue.processAll();
  }
});
```

## 競合解決

```typescript
// サーバー vs ローカルの競合
// 原則: 最新の更新日時を優先
function resolveConflict(local: Record, server: Record): Record {
  return local.updatedAt > server.updatedAt ? local : server;
}
```

## UI表示

```tsx
// 同期状態をユーザーに表示
<Badge variant={record.isSynced ? 'success' : 'warning'}>
  {record.isSynced ? '同期済み' : '同期待ち'}
</Badge>
```
