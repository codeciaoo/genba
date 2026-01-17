# オフライン同期設計

## 設計思想: Local-First

建設現場は電波が不安定。オフラインでも全機能が使えることが必須。

```
┌─────────────────────────────────────────────────────────┐
│                    アプリ（クライアント）                  │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐  │
│  │   UI層      │ -> │ WatermelonDB│ <- │  Sync Engine │  │
│  │  (React)    │    │  (SQLite)   │    │             │  │
│  └─────────────┘    └─────────────┘    └──────┬──────┘  │
└───────────────────────────────────────────────┼─────────┘
                                                │
                                    ┌───────────▼───────────┐
                                    │      Supabase         │
                                    │  (PostgreSQL + Auth)  │
                                    └───────────────────────┘
```

## WatermelonDB セットアップ

### インストール

```bash
npm install @nozbe/watermelondb
npm install @nozbe/with-observables
npx expo install expo-sqlite
```

### データベース初期化

```typescript
// src/database/index.ts
import { Database } from '@nozbe/watermelondb';
import SQLiteAdapter from '@nozbe/watermelondb/adapters/sqlite';
import { schema } from './schema';
import { Site, WorkRecord, Invoice, ItemTemplate } from './models';

const adapter = new SQLiteAdapter({
  schema,
  dbName: 'genba',
  jsi: true, // JSI for better performance
  onSetUpError: error => {
    console.error('Database setup error:', error);
  },
});

export const database = new Database({
  adapter,
  modelClasses: [Site, WorkRecord, Invoice, ItemTemplate],
});
```

### モデル定義例

```typescript
// src/database/models/Site.ts
import { Model } from '@nozbe/watermelondb';
import { field, date, readonly, children } from '@nozbe/watermelondb/decorators';

export class Site extends Model {
  static table = 'sites';
  static associations = {
    work_records: { type: 'has_many', foreignKey: 'site_id' },
    invoices: { type: 'has_many', foreignKey: 'site_id' },
  };

  @field('server_id') serverId!: string | null;
  @field('name') name!: string;
  @field('client_name') clientName!: string | null;
  @field('address') address!: string | null;
  @field('contact_phone') contactPhone!: string | null;
  @field('notes') notes!: string | null;
  @field('is_synced') isSynced!: boolean;
  @readonly @date('created_at') createdAt!: Date;
  @date('updated_at') updatedAt!: Date;

  @children('work_records') workRecords!: any;
  @children('invoices') invoices!: any;
}
```

## 同期エンジン

### 同期関数

```typescript
// src/database/sync.ts
import { synchronize } from '@nozbe/watermelondb/sync';
import { database } from './index';
import { supabase } from '../services/supabase';

export async function syncWithSupabase() {
  const userId = (await supabase.auth.getUser()).data.user?.id;
  if (!userId) throw new Error('Not authenticated');

  await synchronize({
    database,
    pullChanges: async ({ lastPulledAt, schemaVersion, migration }) => {
      const timestamp = lastPulledAt ? new Date(lastPulledAt).toISOString() : null;

      // 各テーブルの変更を取得
      const [sites, workRecords, invoices] = await Promise.all([
        fetchChanges('sites', timestamp, userId),
        fetchChanges('work_records', timestamp, userId),
        fetchChanges('invoices', timestamp, userId),
      ]);

      return {
        changes: {
          sites,
          work_records: workRecords,
          invoices,
        },
        timestamp: Date.now(),
      };
    },
    pushChanges: async ({ changes, lastPulledAt }) => {
      // 作成・更新・削除を各テーブルにプッシュ
      await pushToSupabase('sites', changes.sites, userId);
      await pushToSupabase('work_records', changes.work_records, userId);
      await pushToSupabase('invoices', changes.invoices, userId);
    },
    migrationsEnabledAtVersion: 1,
  });
}

async function fetchChanges(table: string, since: string | null, userId: string) {
  let query = supabase
    .from(table)
    .select('*')
    .eq('user_id', userId);

  if (since) {
    query = query.gt('updated_at', since);
  }

  const { data: updated, error } = await query;
  if (error) throw error;

  // 削除されたレコードを取得
  const { data: deleted } = await supabase
    .from(`${table}_deleted`)
    .select('id')
    .eq('user_id', userId)
    .gt('deleted_at', since || '1970-01-01');

  return {
    created: updated?.filter(r => !since || r.created_at > since) || [],
    updated: updated?.filter(r => since && r.created_at <= since) || [],
    deleted: deleted?.map(r => r.id) || [],
  };
}

async function pushToSupabase(table: string, changes: any, userId: string) {
  if (changes.created.length > 0) {
    const records = changes.created.map((r: any) => ({
      ...r,
      user_id: userId,
      id: r.server_id || r.id,
    }));
    await supabase.from(table).upsert(records);
  }

  if (changes.updated.length > 0) {
    for (const record of changes.updated) {
      await supabase
        .from(table)
        .update(record)
        .eq('id', record.server_id);
    }
  }

  if (changes.deleted.length > 0) {
    // 論理削除を使用
    for (const id of changes.deleted) {
      await supabase
        .from(table)
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id);
    }
  }
}
```

### 同期トリガー

```typescript
// src/hooks/useSync.ts
import { useEffect, useRef } from 'react';
import NetInfo from '@react-native-community/netinfo';
import { syncWithSupabase } from '../database/sync';

export function useSync() {
  const isSyncing = useRef(false);

  useEffect(() => {
    // ネットワーク状態変化を監視
    const unsubscribe = NetInfo.addEventListener(state => {
      if (state.isConnected && !isSyncing.current) {
        triggerSync();
      }
    });

    // 初回同期
    triggerSync();

    // 定期同期（5分ごと）
    const interval = setInterval(triggerSync, 5 * 60 * 1000);

    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }, []);

  const triggerSync = async () => {
    if (isSyncing.current) return;

    try {
      isSyncing.current = true;
      await syncWithSupabase();
      console.log('Sync completed');
    } catch (error) {
      console.error('Sync failed:', error);
    } finally {
      isSyncing.current = false;
    }
  };

  return { triggerSync };
}
```

## オフライン時の操作

### データ作成

```typescript
// オフラインでもローカルDBに即座に保存
const createSite = async (data: SiteInput) => {
  await database.write(async () => {
    await database.get<Site>('sites').create(site => {
      site.name = data.name;
      site.clientName = data.clientName;
      site.address = data.address;
      site.isSynced = false;  // 未同期マーク
    });
  });
};
```

### オフライン状態の表示

```typescript
// src/components/OfflineIndicator.tsx
import { useNetInfo } from '@react-native-community/netinfo';
import { View, Text } from 'react-native';

export function OfflineIndicator() {
  const netInfo = useNetInfo();

  if (netInfo.isConnected) return null;

  return (
    <View style={styles.banner}>
      <Text style={styles.text}>
        オフラインモード - データは自動で同期されます
      </Text>
    </View>
  );
}
```

## 競合解決

### Last Write Wins (LWW)

シンプルなLWW戦略を採用。`updated_at`が新しい方を優先。

```typescript
// 競合検出と解決
const resolveConflict = (local: any, remote: any) => {
  if (new Date(remote.updated_at) > new Date(local.updated_at)) {
    return remote;  // サーバー側を優先
  }
  return local;  // ローカルを優先（サーバーにプッシュ）
};
```

### 重要データの競合通知

請求書の金額変更など重要な競合は、ユーザーに通知:

```typescript
const handleInvoiceConflict = async (local: Invoice, remote: Invoice) => {
  if (local.totalAmount !== remote.totalAmount) {
    // ユーザーに選択させる
    const choice = await showConflictDialog(local, remote);
    return choice === 'local' ? local : remote;
  }
  return resolveConflict(local, remote);
};
```

## キュー管理（音声ファイル）

音声ファイルはオフライン時にキューイング:

```typescript
// src/services/voiceQueue.ts
import AsyncStorage from '@react-native-async-storage/async-storage';

const QUEUE_KEY = 'voice_processing_queue';

export async function enqueueVoice(audioUri: string, metadata: any) {
  const queue = await getQueue();
  queue.push({
    id: Date.now().toString(),
    audioUri,
    metadata,
    createdAt: new Date().toISOString(),
  });
  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
}

export async function processQueue() {
  const queue = await getQueue();
  const processed: string[] = [];

  for (const item of queue) {
    try {
      await processVoice(item.audioUri);
      processed.push(item.id);
    } catch (error) {
      console.error('Failed to process:', item.id, error);
    }
  }

  // 処理済みを除去
  const remaining = queue.filter(q => !processed.includes(q.id));
  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(remaining));
}
```

## パフォーマンス最適化

### インデックス

```typescript
// WatermelonDB側
tableSchema({
  name: 'work_records',
  columns: [
    { name: 'site_id', type: 'string', isIndexed: true },  // インデックス
    { name: 'recorded_at', type: 'number', isIndexed: true },
    // ...
  ],
}),
```

### 遅延読み込み

```typescript
// 大量データは遅延読み込み
const useSites = () => {
  return useQuery(
    database.get<Site>('sites')
      .query(
        Q.where('is_active', true),
        Q.sortBy('updated_at', Q.desc),
        Q.take(50)  // 最初は50件のみ
      )
  );
};
```
