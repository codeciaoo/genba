---
name: genba-implementation-guide
description: 「GENBA GEAR」アプリの実装ガイド。具体的なコード例、API統合、エラーハンドリング、テストパターンを提供。設計は genba-app-architecture を参照。
---

# GENBA GEAR 実装ガイド

具体的な実装コード、パターン、ベストプラクティス集。

---

## 1. プロジェクトセットアップ

### 1.1 Expoプロジェクト作成

```bash
# プロジェクト作成
npx create-expo-app@latest genba-gear --template tabs

cd genba-gear

# 必須パッケージ
npx expo install expo-router expo-linking expo-constants expo-status-bar
npx expo install nativewind tailwindcss
npx expo install expo-av expo-location expo-file-system expo-haptics
npx expo install expo-secure-store expo-notifications expo-print expo-sharing

# データベース
npx expo install @nozbe/watermelondb
npm install @supabase/supabase-js

# その他
npm install openai
npm install date-fns
```

### 1.2 NativeWind設定

```javascript
// tailwind.config.js
module.exports = {
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#147878',
          dark: '#0d5454',
          light: '#1a9e9e',
        },
        navy: {
          DEFAULT: '#1a1f3d',
          light: '#2a3050',
        },
        background: '#f5f5f5',
        surface: '#ffffff',
        success: '#2d8a4e',
        warning: '#c77700',
        error: '#c73b3b',
      },
    },
  },
  plugins: [],
};
```

```javascript
// babel.config.js
module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      ["babel-preset-expo", { jsxImportSource: "nativewind" }],
      "nativewind/babel",
    ],
    plugins: [
      ["@babel/plugin-proposal-decorators", { legacy: true }],
    ],
  };
};
```

### 1.3 環境変数

```typescript
// src/constants/config.ts
export const CONFIG = {
  supabase: {
    url: process.env.EXPO_PUBLIC_SUPABASE_URL!,
    anonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!,
  },
  openai: {
    apiKey: process.env.EXPO_PUBLIC_OPENAI_API_KEY!,
  },
  weather: {
    apiKey: process.env.EXPO_PUBLIC_WEATHER_API_KEY!,
  },
};
```

---

## 2. Supabase連携

### 2.1 クライアント初期化

```typescript
// src/services/supabase.ts
import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';
import { CONFIG } from '@/constants/config';

const ExpoSecureStoreAdapter = {
  getItem: async (key: string) => {
    return SecureStore.getItemAsync(key);
  },
  setItem: async (key: string, value: string) => {
    await SecureStore.setItemAsync(key, value);
  },
  removeItem: async (key: string) => {
    await SecureStore.deleteItemAsync(key);
  },
};

export const supabase = createClient(
  CONFIG.supabase.url,
  CONFIG.supabase.anonKey,
  {
    auth: {
      storage: ExpoSecureStoreAdapter,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  }
);
```

### 2.2 認証フック

```typescript
// src/hooks/useAuth.ts
import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/services/supabase';
import type { User, Session, AuthError } from '@supabase/supabase-js';

interface AuthState {
  user: User | null;
  session: Session | null;
  loading: boolean;
  error: AuthError | null;
}

export function useAuth() {
  const [state, setState] = useState<AuthState>({
    user: null,
    session: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    // 初期セッション取得
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      setState({
        user: session?.user ?? null,
        session,
        loading: false,
        error: error as AuthError | null,
      });
    });

    // セッション変更を監視
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setState(prev => ({
          ...prev,
          user: session?.user ?? null,
          session,
        }));
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const signInWithEmail = useCallback(
    async (email: string, password: string) => {
      setState(prev => ({ ...prev, loading: true, error: null }));
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      setState(prev => ({
        ...prev,
        loading: false,
        error: error as AuthError | null,
      }));
      return { data, error };
    },
    []
  );

  const signUp = useCallback(
    async (email: string, password: string) => {
      setState(prev => ({ ...prev, loading: true, error: null }));
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });
      setState(prev => ({
        ...prev,
        loading: false,
        error: error as AuthError | null,
      }));
      return { data, error };
    },
    []
  );

  const signInWithMagicLink = useCallback(
    async (email: string) => {
      setState(prev => ({ ...prev, loading: true, error: null }));
      const { data, error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: 'genba-gear://auth/callback',
        },
      });
      setState(prev => ({
        ...prev,
        loading: false,
        error: error as AuthError | null,
      }));
      return { data, error };
    },
    []
  );

  const signOut = useCallback(async () => {
    const { error } = await supabase.auth.signOut();
    return { error };
  }, []);

  return {
    ...state,
    signInWithEmail,
    signUp,
    signInWithMagicLink,
    signOut,
  };
}
```

---

## 3. WatermelonDB

### 3.1 スキーマ定義

```typescript
// src/database/schema.ts
import { appSchema, tableSchema } from '@nozbe/watermelondb';

export const schema = appSchema({
  version: 1,
  tables: [
    // ユーザープロファイル
    tableSchema({
      name: 'user_profiles',
      columns: [
        { name: 'server_id', type: 'string', isOptional: true },
        { name: 'user_id', type: 'string', isIndexed: true },
        { name: 'business_name', type: 'string' },
        { name: 'representative_name', type: 'string', isOptional: true },
        { name: 'postal_code', type: 'string', isOptional: true },
        { name: 'address', type: 'string', isOptional: true },
        { name: 'phone', type: 'string', isOptional: true },
        { name: 'email', type: 'string', isOptional: true },
        { name: 'invoice_registration_number', type: 'string', isOptional: true },
        { name: 'plan', type: 'string' },
        { name: 'team_id', type: 'string', isOptional: true },
        { name: 'is_synced', type: 'boolean' },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
      ],
    }),

    // 顧客
    tableSchema({
      name: 'customers',
      columns: [
        { name: 'server_id', type: 'string', isOptional: true },
        { name: 'user_id', type: 'string', isIndexed: true },
        { name: 'name', type: 'string' },
        { name: 'address', type: 'string', isOptional: true },
        { name: 'phone', type: 'string', isOptional: true },
        { name: 'email', type: 'string', isOptional: true },
        { name: 'photos', type: 'string' }, // JSON
        { name: 'memos', type: 'string' }, // JSON
        { name: 'ai_summary', type: 'string', isOptional: true },
        { name: 'is_synced', type: 'boolean' },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
      ],
    }),

    // 作業記録
    tableSchema({
      name: 'work_records',
      columns: [
        { name: 'server_id', type: 'string', isOptional: true },
        { name: 'user_id', type: 'string', isIndexed: true },
        { name: 'customer_id', type: 'string', isOptional: true, isIndexed: true },
        { name: 'voice_transcript', type: 'string' },
        { name: 'structured_data', type: 'string' }, // JSON
        { name: 'gps_location', type: 'string' }, // JSON
        { name: 'weather', type: 'string', isOptional: true },
        { name: 'temperature', type: 'number', isOptional: true },
        { name: 'recorded_at', type: 'number' },
        { name: 'status', type: 'string' },
        { name: 'is_synced', type: 'boolean' },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
      ],
    }),

    // 日報
    tableSchema({
      name: 'daily_reports',
      columns: [
        { name: 'server_id', type: 'string', isOptional: true },
        { name: 'user_id', type: 'string', isIndexed: true },
        { name: 'work_record_id', type: 'string', isIndexed: true },
        { name: 'customer_id', type: 'string', isOptional: true },
        { name: 'report_date', type: 'string' },
        { name: 'content', type: 'string' }, // JSON
        { name: 'pdf_url', type: 'string', isOptional: true },
        { name: 'timestamp_signature', type: 'string', isOptional: true },
        { name: 'status', type: 'string' },
        { name: 'is_synced', type: 'boolean' },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
      ],
    }),

    // 請求書
    tableSchema({
      name: 'invoices',
      columns: [
        { name: 'server_id', type: 'string', isOptional: true },
        { name: 'user_id', type: 'string', isIndexed: true },
        { name: 'customer_id', type: 'string', isOptional: true, isIndexed: true },
        { name: 'work_record_id', type: 'string', isOptional: true },
        { name: 'invoice_number', type: 'string' },
        { name: 'issue_date', type: 'string' },
        { name: 'due_date', type: 'string', isOptional: true },
        { name: 'items', type: 'string' }, // JSON
        { name: 'subtotal', type: 'number' },
        { name: 'tax_amount', type: 'number' },
        { name: 'total_amount', type: 'number' },
        { name: 'notes', type: 'string', isOptional: true },
        { name: 'status', type: 'string' },
        { name: 'pdf_url', type: 'string', isOptional: true },
        { name: 'sent_at', type: 'number', isOptional: true },
        { name: 'paid_at', type: 'number', isOptional: true },
        { name: 'is_synced', type: 'boolean' },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
      ],
    }),

    // 保留中の録音（オフライン用）
    tableSchema({
      name: 'pending_records',
      columns: [
        { name: 'audio_uri', type: 'string' },
        { name: 'gps_location', type: 'string' }, // JSON
        { name: 'weather', type: 'string', isOptional: true },
        { name: 'temperature', type: 'number', isOptional: true },
        { name: 'recorded_at', type: 'number' },
        { name: 'status', type: 'string' }, // pending, processing, failed
        { name: 'error_message', type: 'string', isOptional: true },
        { name: 'retry_count', type: 'number' },
        { name: 'created_at', type: 'number' },
      ],
    }),
  ],
});
```

### 3.2 モデル定義

```typescript
// src/database/models/WorkRecord.ts
import { Model } from '@nozbe/watermelondb';
import { field, date, json, readonly, relation } from '@nozbe/watermelondb/decorators';

interface StructuredData {
  workType: string;
  location: string;
  details: string;
  materials?: string[];
  quantity?: string;
  unit?: string;
  issues?: string;
  nextAction?: string;
}

interface GPSLocation {
  latitude: number;
  longitude: number;
  accuracy?: number;
  address?: string;
}

export default class WorkRecord extends Model {
  static table = 'work_records';

  @field('server_id') serverId!: string | null;
  @field('user_id') userId!: string;
  @field('customer_id') customerId!: string | null;
  @field('voice_transcript') voiceTranscript!: string;
  @json('structured_data', (json) => json) structuredData!: StructuredData;
  @json('gps_location', (json) => json) gpsLocation!: GPSLocation;
  @field('weather') weather!: string | null;
  @field('temperature') temperature!: number | null;
  @date('recorded_at') recordedAt!: Date;
  @field('status') status!: 'draft' | 'processed' | 'synced';
  @field('is_synced') isSynced!: boolean;
  @readonly @date('created_at') createdAt!: Date;
  @date('updated_at') updatedAt!: Date;

  @relation('customers', 'customer_id') customer!: any;
}
```

### 3.3 DB初期化

```typescript
// src/database/index.ts
import { Database } from '@nozbe/watermelondb';
import SQLiteAdapter from '@nozbe/watermelondb/adapters/sqlite';
import { schema } from './schema';

// モデル
import UserProfile from './models/UserProfile';
import Customer from './models/Customer';
import WorkRecord from './models/WorkRecord';
import DailyReport from './models/DailyReport';
import Invoice from './models/Invoice';
import PendingRecord from './models/PendingRecord';

const adapter = new SQLiteAdapter({
  schema,
  dbName: 'genba_gear',
  jsi: true,
  onSetUpError: (error) => {
    console.error('Database setup error:', error);
  },
});

export const database = new Database({
  adapter,
  modelClasses: [
    UserProfile,
    Customer,
    WorkRecord,
    DailyReport,
    Invoice,
    PendingRecord,
  ],
});

export { UserProfile, Customer, WorkRecord, DailyReport, Invoice, PendingRecord };
```

### 3.4 同期エンジン

```typescript
// src/database/sync.ts
import { synchronize } from '@nozbe/watermelondb/sync';
import { database } from './index';
import { supabase } from '@/services/supabase';

export async function syncDatabase() {
  await synchronize({
    database,

    pullChanges: async ({ lastPulledAt, schemaVersion, migration }) => {
      const timestamp = lastPulledAt ? new Date(lastPulledAt).toISOString() : null;

      // 各テーブルの変更を取得
      const tables = ['user_profiles', 'customers', 'work_records', 'daily_reports', 'invoices'];
      const changes: any = {};

      for (const table of tables) {
        let query = supabase.from(table).select('*');

        if (timestamp) {
          query = query.gt('updated_at', timestamp);
        }

        const { data, error } = await query;
        if (error) throw error;

        changes[table] = {
          created: data?.filter(r => !timestamp || new Date(r.created_at) > new Date(timestamp)) || [],
          updated: data?.filter(r => timestamp && new Date(r.created_at) <= new Date(timestamp)) || [],
          deleted: [], // 論理削除の場合は別途取得
        };
      }

      return {
        changes,
        timestamp: Date.now(),
      };
    },

    pushChanges: async ({ changes, lastPulledAt }) => {
      for (const [table, tableChanges] of Object.entries(changes)) {
        const { created, updated, deleted } = tableChanges as any;

        // 作成
        if (created.length > 0) {
          const { error } = await supabase.from(table).insert(
            created.map((r: any) => ({
              ...r._raw,
              id: undefined, // サーバーで生成
              local_id: r.id,
            }))
          );
          if (error) throw error;
        }

        // 更新
        if (updated.length > 0) {
          for (const record of updated) {
            const { error } = await supabase
              .from(table)
              .update(record._raw)
              .eq('id', record.server_id);
            if (error) throw error;
          }
        }

        // 削除
        if (deleted.length > 0) {
          const { error } = await supabase
            .from(table)
            .delete()
            .in('id', deleted);
          if (error) throw error;
        }
      }
    },

    migrationsEnabledAtVersion: 1,
  });
}

// ネットワーク復帰時に自動同期
import NetInfo from '@react-native-community/netinfo';

export function setupAutoSync() {
  let wasOffline = false;

  NetInfo.addEventListener((state) => {
    if (state.isConnected && wasOffline) {
      // オフラインから復帰
      syncDatabase().catch(console.error);
      processPendingRecords().catch(console.error);
    }
    wasOffline = !state.isConnected;
  });
}
```

---

## 4. 音声入力

### 4.1 録音コンポーネント

```typescript
// src/features/voice/VoiceRecorder.tsx
import { useState, useRef, useCallback, useEffect } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Audio } from 'expo-av';
import * as Haptics from 'expo-haptics';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withRepeat,
  withTiming,
  cancelAnimation,
} from 'react-native-reanimated';

const MIN_DURATION = 3000;  // 3秒
const MAX_DURATION = 30000; // 30秒

interface VoiceRecorderProps {
  onRecordingComplete: (uri: string, duration: number) => void;
  onError: (error: Error) => void;
}

export function VoiceRecorder({ onRecordingComplete, onError }: VoiceRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [duration, setDuration] = useState(0);
  const recordingRef = useRef<Audio.Recording | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // アニメーション
  const scale = useSharedValue(1);
  const pulseScale = useSharedValue(1);

  const buttonStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
    opacity: 2 - pulseScale.value,
  }));

  // 録音開始
  const startRecording = useCallback(async () => {
    try {
      // パーミッション確認
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== 'granted') {
        throw new Error('マイクの許可が必要です');
      }

      // Audio設定
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      // 録音開始
      const recording = new Audio.Recording();
      await recording.prepareToRecordAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      await recording.startAsync();
      recordingRef.current = recording;

      setIsRecording(true);
      setDuration(0);

      // 触覚フィードバック
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      // アニメーション開始
      scale.value = withSpring(0.95);
      pulseScale.value = withRepeat(
        withTiming(1.5, { duration: 1000 }),
        -1,
        false
      );

      // タイマー開始
      timerRef.current = setInterval(() => {
        setDuration(prev => {
          const newDuration = prev + 100;
          if (newDuration >= MAX_DURATION) {
            stopRecording();
          }
          return newDuration;
        });
      }, 100);

    } catch (error) {
      onError(error as Error);
    }
  }, []);

  // 録音停止
  const stopRecording = useCallback(async () => {
    if (!recordingRef.current) return;

    // タイマー停止
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    // アニメーション停止
    cancelAnimation(pulseScale);
    scale.value = withSpring(1);
    pulseScale.value = 1;

    setIsRecording(false);

    try {
      await recordingRef.current.stopAndUnloadAsync();
      const uri = recordingRef.current.getURI();

      // 最小時間チェック
      if (duration < MIN_DURATION) {
        onError(new Error('録音時間が短すぎます（3秒以上必要）'));
        return;
      }

      if (uri) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        onRecordingComplete(uri, duration);
      }
    } catch (error) {
      onError(error as Error);
    } finally {
      recordingRef.current = null;
    }
  }, [duration, onRecordingComplete, onError]);

  // クリーンアップ
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      if (recordingRef.current) {
        recordingRef.current.stopAndUnloadAsync();
      }
    };
  }, []);

  const progress = duration / MAX_DURATION;

  return (
    <View style={styles.container}>
      {/* プログレスリング */}
      <View style={styles.progressContainer}>
        {isRecording && (
          <Animated.View style={[styles.pulse, pulseStyle]} />
        )}

        <Animated.View style={buttonStyle}>
          <Pressable
            style={[
              styles.button,
              isRecording && styles.buttonRecording,
            ]}
            onPressIn={startRecording}
            onPressOut={stopRecording}
          >
            <View style={styles.buttonInner}>
              {isRecording ? (
                <View style={styles.stopIcon} />
              ) : (
                <Text style={styles.micIcon}>🎤</Text>
              )}
            </View>
          </Pressable>
        </Animated.View>

        {/* プログレスバー */}
        <View style={styles.progressBar}>
          <View
            style={[styles.progressFill, { width: `${progress * 100}%` }]}
          />
        </View>
      </View>

      {/* 時間表示 */}
      <Text style={styles.duration}>
        {isRecording
          ? `${Math.floor(duration / 1000)}秒 / ${MAX_DURATION / 1000}秒`
          : 'タップして録音開始'}
      </Text>

      {/* 説明 */}
      <Text style={styles.hint}>
        {duration < MIN_DURATION && isRecording
          ? `あと${Math.ceil((MIN_DURATION - duration) / 1000)}秒`
          : '押している間、録音されます'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    padding: 24,
  },
  progressContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pulse: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#147878',
  },
  button: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#147878',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonRecording: {
    backgroundColor: '#c73b3b',
  },
  buttonInner: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stopIcon: {
    width: 30,
    height: 30,
    backgroundColor: '#c73b3b',
    borderRadius: 4,
  },
  micIcon: {
    fontSize: 40,
  },
  progressBar: {
    width: 200,
    height: 4,
    backgroundColor: '#e5e5e5',
    borderRadius: 2,
    marginTop: 16,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#147878',
  },
  duration: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 16,
    color: '#1a1f3d',
  },
  hint: {
    fontSize: 14,
    color: '#737373',
    marginTop: 8,
  },
});
```

### 4.2 OpenAI連携

```typescript
// src/services/openai.ts
import OpenAI from 'openai';
import * as FileSystem from 'expo-file-system';
import { CONFIG } from '@/constants/config';

const openai = new OpenAI({
  apiKey: CONFIG.openai.apiKey,
});

// 騒音フィルタリングプロンプト
const NOISE_FILTERING_PROMPT = `
建設現場での作業報告音声です。
背景に機械音、電動工具音、車両音、風音などの騒音が含まれる可能性があります。
人の声のみを抽出し、作業内容を正確に文字起こししてください。
建設業界の専門用語: 墨出し、配筋、型枠、打設、養生、はつり、ケレン、下地処理、コンクリート、鉄筋、足場、クレーン
`.trim();

// 構造化プロンプト
const STRUCTURING_PROMPT = `
建設現場の作業報告を構造化データに変換してください。
以下のJSON形式で出力してください:

{
  "workType": "作業種別（例: 塗装、配管、電気工事）",
  "location": "作業場所（例: 1階リビング、屋上）",
  "details": "作業内容の詳細説明",
  "materials": ["使用材料のリスト"],
  "quantity": "数量（数値のみ）",
  "unit": "単位（例: m2, 本, kg）",
  "issues": "問題点・特記事項（なければnull）",
  "nextAction": "次回予定作業（なければnull）"
}

不明な項目はnullを設定してください。
`.trim();

export interface StructuredWorkData {
  workType: string;
  location: string;
  details: string;
  materials?: string[];
  quantity?: string;
  unit?: string;
  issues?: string | null;
  nextAction?: string | null;
}

/**
 * 音声を文字起こし（騒音フィルタリング付き）
 */
export async function transcribeAudio(audioUri: string): Promise<string> {
  // ファイルをBase64で読み込み
  const base64 = await FileSystem.readAsStringAsync(audioUri, {
    encoding: FileSystem.EncodingType.Base64,
  });

  // Whisper APIに送信
  const response = await openai.audio.transcriptions.create({
    file: new File(
      [Uint8Array.from(atob(base64), c => c.charCodeAt(0))],
      'recording.m4a',
      { type: 'audio/m4a' }
    ),
    model: 'whisper-1',
    language: 'ja',
    prompt: NOISE_FILTERING_PROMPT,
  });

  return response.text;
}

/**
 * 文字起こしを構造化データに変換
 */
export async function structureTranscript(
  transcript: string
): Promise<StructuredWorkData> {
  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: STRUCTURING_PROMPT },
      { role: 'user', content: transcript },
    ],
    response_format: { type: 'json_object' },
    temperature: 0.3,
  });

  const content = response.choices[0].message.content;
  if (!content) {
    throw new Error('構造化に失敗しました');
  }

  return JSON.parse(content);
}

/**
 * 音声処理パイプライン（文字起こし→構造化）
 */
export async function processVoice(audioUri: string): Promise<{
  transcript: string;
  structuredData: StructuredWorkData;
}> {
  // 1. 文字起こし
  const transcript = await transcribeAudio(audioUri);

  // 2. 構造化
  const structuredData = await structureTranscript(transcript);

  return { transcript, structuredData };
}
```

### 4.3 オフラインキュー

```typescript
// src/features/voice/offlineQueue.ts
import { database, PendingRecord } from '@/database';
import { Q } from '@nozbe/watermelondb';
import * as Location from 'expo-location';
import { processVoice } from '@/services/openai';
import { getWeather } from '@/services/weather';
import NetInfo from '@react-native-community/netinfo';

/**
 * 録音をキューに追加
 */
export async function queueRecording(audioUri: string) {
  // GPS取得
  const location = await Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.High,
  });

  // 天気取得（オンラインの場合）
  let weather = null;
  let temperature = null;
  const netState = await NetInfo.fetch();
  if (netState.isConnected) {
    try {
      const weatherData = await getWeather(
        location.coords.latitude,
        location.coords.longitude
      );
      weather = weatherData.description;
      temperature = weatherData.temperature;
    } catch (e) {
      console.warn('天気取得失敗:', e);
    }
  }

  // キューに保存
  await database.write(async () => {
    await database.get<PendingRecord>('pending_records').create((record) => {
      record.audioUri = audioUri;
      record.gpsLocation = JSON.stringify({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        accuracy: location.coords.accuracy,
      });
      record.weather = weather;
      record.temperature = temperature;
      record.recordedAt = Date.now();
      record.status = 'pending';
      record.retryCount = 0;
    });
  });
}

/**
 * 保留中の録音を処理
 */
export async function processPendingRecords() {
  const pendingRecords = await database
    .get<PendingRecord>('pending_records')
    .query(Q.where('status', 'pending'))
    .fetch();

  for (const record of pendingRecords) {
    try {
      // ステータス更新
      await database.write(async () => {
        await record.update((r) => {
          r.status = 'processing';
        });
      });

      // 音声処理
      const { transcript, structuredData } = await processVoice(record.audioUri);

      // WorkRecord作成
      await database.write(async () => {
        await database.get('work_records').create((workRecord: any) => {
          workRecord.userId = 'current_user_id'; // TODO: 実際のユーザーID
          workRecord.voiceTranscript = transcript;
          workRecord.structuredData = structuredData;
          workRecord.gpsLocation = JSON.parse(record.gpsLocation);
          workRecord.weather = record.weather;
          workRecord.temperature = record.temperature;
          workRecord.recordedAt = new Date(record.recordedAt);
          workRecord.status = 'processed';
          workRecord.isSynced = false;
        });

        // キューから削除
        await record.destroyPermanently();
      });

    } catch (error) {
      console.error('処理失敗:', error);

      await database.write(async () => {
        await record.update((r) => {
          r.status = record.retryCount >= 3 ? 'failed' : 'pending';
          r.retryCount = record.retryCount + 1;
          r.errorMessage = (error as Error).message;
        });
      });
    }
  }
}
```

---

## 5. GPS・天気

### 5.1 位置情報

```typescript
// src/services/location.ts
import * as Location from 'expo-location';

export interface GPSLocation {
  latitude: number;
  longitude: number;
  accuracy: number | null;
  address?: string;
}

/**
 * 現在位置を取得
 */
export async function getCurrentLocation(): Promise<GPSLocation> {
  // パーミッション確認
  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== 'granted') {
    throw new Error('位置情報の許可が必要です');
  }

  // 位置取得
  const location = await Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.High,
  });

  return {
    latitude: location.coords.latitude,
    longitude: location.coords.longitude,
    accuracy: location.coords.accuracy,
  };
}

/**
 * 逆ジオコーディング（座標→住所）
 */
export async function reverseGeocode(
  latitude: number,
  longitude: number
): Promise<string> {
  const results = await Location.reverseGeocodeAsync({
    latitude,
    longitude,
  });

  if (results.length === 0) {
    return '住所取得失敗';
  }

  const { city, district, street, streetNumber } = results[0];
  return [city, district, street, streetNumber].filter(Boolean).join(' ');
}
```

### 5.2 天気API

```typescript
// src/services/weather.ts
import { CONFIG } from '@/constants/config';

export interface WeatherData {
  description: string;
  temperature: number;
  humidity: number;
  icon: string;
}

/**
 * 天気情報を取得
 */
export async function getWeather(
  latitude: number,
  longitude: number
): Promise<WeatherData> {
  const url = `https://api.openweathermap.org/data/2.5/weather?lat=${latitude}&lon=${longitude}&appid=${CONFIG.weather.apiKey}&units=metric&lang=ja`;

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error('天気情報の取得に失敗しました');
  }

  const data = await response.json();

  return {
    description: data.weather[0].description,
    temperature: Math.round(data.main.temp),
    humidity: data.main.humidity,
    icon: data.weather[0].icon,
  };
}

/**
 * 天気アイコンURLを取得
 */
export function getWeatherIconUrl(icon: string): string {
  return `https://openweathermap.org/img/wn/${icon}@2x.png`;
}
```

---

## 6. PDF生成

### 6.1 日報PDF

```typescript
// src/features/report/pdfGenerator.ts
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';

interface ReportPDFData {
  reportDate: Date;
  businessName: string;
  siteName: string;
  weather: string;
  temperature: number;
  address: string;
  workItems: Array<{
    workType: string;
    details: string;
  }>;
  notes?: string;
  timestampSignature: string;
}

export async function generateReportPDF(data: ReportPDFData): Promise<string> {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        body {
          font-family: 'Hiragino Sans', 'Noto Sans JP', sans-serif;
          padding: 40px;
          color: #1a1a1a;
          line-height: 1.6;
        }
        .header {
          text-align: center;
          border-bottom: 3px solid #147878;
          padding-bottom: 16px;
          margin-bottom: 24px;
        }
        .title {
          font-size: 28px;
          font-weight: bold;
          color: #1a1f3d;
        }
        .date {
          font-size: 16px;
          color: #525252;
          margin-top: 8px;
        }
        .section {
          margin-bottom: 24px;
        }
        .section-title {
          font-size: 14px;
          font-weight: bold;
          background-color: #147878;
          color: white;
          padding: 8px 12px;
          margin-bottom: 12px;
        }
        .info-grid {
          display: grid;
          grid-template-columns: 120px 1fr;
          gap: 8px;
        }
        .info-label {
          font-weight: bold;
          color: #525252;
        }
        .info-value {
          color: #1a1a1a;
        }
        .work-item {
          border-bottom: 1px solid #e5e5e5;
          padding: 12px 0;
        }
        .work-item:last-child {
          border-bottom: none;
        }
        .work-type {
          font-weight: bold;
          color: #147878;
          margin-bottom: 4px;
        }
        .footer {
          margin-top: 40px;
          padding-top: 16px;
          border-top: 1px solid #e5e5e5;
          text-align: right;
          font-size: 12px;
          color: #737373;
        }
        .signature {
          font-family: monospace;
          font-size: 10px;
          word-break: break-all;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="title">作業日報</div>
        <div class="date">${format(data.reportDate, 'yyyy年M月d日（E）', { locale: ja })}</div>
      </div>

      <div class="section">
        <div class="section-title">基本情報</div>
        <div class="info-grid">
          <div class="info-label">事業者名</div>
          <div class="info-value">${data.businessName}</div>

          <div class="info-label">現場名</div>
          <div class="info-value">${data.siteName}</div>

          <div class="info-label">天気</div>
          <div class="info-value">${data.weather} / ${data.temperature}℃</div>

          <div class="info-label">住所</div>
          <div class="info-value">${data.address}</div>
        </div>
      </div>

      <div class="section">
        <div class="section-title">作業内容</div>
        ${data.workItems.map(item => `
          <div class="work-item">
            <div class="work-type">${item.workType}</div>
            <div>${item.details}</div>
          </div>
        `).join('')}
      </div>

      ${data.notes ? `
        <div class="section">
          <div class="section-title">特記事項</div>
          <div>${data.notes}</div>
        </div>
      ` : ''}

      <div class="footer">
        <div>タイムスタンプ署名:</div>
        <div class="signature">${data.timestampSignature}</div>
        <div style="margin-top: 8px;">GENBA GEAR で作成</div>
      </div>
    </body>
    </html>
  `;

  const { uri } = await Print.printToFileAsync({
    html,
    base64: false,
  });

  return uri;
}

/**
 * PDFを共有
 */
export async function sharePDF(uri: string, title: string) {
  const isAvailable = await Sharing.isAvailableAsync();
  if (!isAvailable) {
    throw new Error('共有機能が利用できません');
  }

  await Sharing.shareAsync(uri, {
    mimeType: 'application/pdf',
    dialogTitle: title,
  });
}
```

---

## 7. エラーハンドリング

### 7.1 グローバルエラーハンドラー

```typescript
// src/utils/errorHandler.ts
import { Alert } from 'react-native';
import * as Haptics from 'expo-haptics';

type ErrorType =
  | 'network'
  | 'permission'
  | 'validation'
  | 'auth'
  | 'server'
  | 'unknown';

interface AppError {
  type: ErrorType;
  message: string;
  originalError?: Error;
}

/**
 * エラーを分類
 */
export function classifyError(error: Error): AppError {
  const message = error.message.toLowerCase();

  if (message.includes('network') || message.includes('fetch')) {
    return {
      type: 'network',
      message: 'ネットワークに接続できません。オフラインモードで動作中です。',
      originalError: error,
    };
  }

  if (message.includes('permission') || message.includes('denied')) {
    return {
      type: 'permission',
      message: '必要な権限がありません。設定から許可してください。',
      originalError: error,
    };
  }

  if (message.includes('invalid') || message.includes('required')) {
    return {
      type: 'validation',
      message: '入力内容に問題があります。確認してください。',
      originalError: error,
    };
  }

  if (message.includes('auth') || message.includes('unauthorized')) {
    return {
      type: 'auth',
      message: 'ログインが必要です。',
      originalError: error,
    };
  }

  if (message.includes('500') || message.includes('server')) {
    return {
      type: 'server',
      message: 'サーバーエラーが発生しました。しばらく待ってから再試行してください。',
      originalError: error,
    };
  }

  return {
    type: 'unknown',
    message: 'エラーが発生しました。再度お試しください。',
    originalError: error,
  };
}

/**
 * エラーをユーザーに表示
 */
export function showError(error: Error | AppError) {
  const appError = 'type' in error ? error : classifyError(error);

  // 触覚フィードバック
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);

  // アラート表示
  Alert.alert(
    'エラー',
    appError.message,
    [{ text: 'OK', style: 'default' }]
  );

  // 開発環境ではコンソールに出力
  if (__DEV__) {
    console.error('[AppError]', appError);
  }
}

/**
 * エラーバウンダリ用フック
 */
export function useErrorHandler() {
  const handleError = (error: Error) => {
    showError(error);
  };

  return { handleError };
}
```

---

## 8. テスト

### 8.1 ユニットテスト例

```typescript
// __tests__/utils/taxCalculator.test.ts
import { calculateTax, calculateSubtotal } from '@/features/invoice/taxCalculator';

describe('税額計算', () => {
  const items = [
    { amount: 10000, taxRate: 10 },
    { amount: 5000, taxRate: 10 },
    { amount: 3000, taxRate: 8 },
  ];

  it('小計が正しく計算される', () => {
    expect(calculateSubtotal(items)).toBe(18000);
  });

  it('税額が正しく計算される（端数切り捨て）', () => {
    // 10%: 15000 * 0.1 = 1500
    // 8%: 3000 * 0.08 = 240
    expect(calculateTax(items)).toBe(1740);
  });

  it('空配列で0を返す', () => {
    expect(calculateTax([])).toBe(0);
    expect(calculateSubtotal([])).toBe(0);
  });
});
```

### 8.2 コンポーネントテスト例

```typescript
// __tests__/components/VoiceRecorder.test.tsx
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { VoiceRecorder } from '@/features/voice/VoiceRecorder';

jest.mock('expo-av');
jest.mock('expo-haptics');

describe('VoiceRecorder', () => {
  const mockOnComplete = jest.fn();
  const mockOnError = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('初期状態で録音ボタンが表示される', () => {
    const { getByText } = render(
      <VoiceRecorder
        onRecordingComplete={mockOnComplete}
        onError={mockOnError}
      />
    );

    expect(getByText('タップして録音開始')).toBeTruthy();
  });

  it('3秒未満でエラーが発生する', async () => {
    const { getByTestId } = render(
      <VoiceRecorder
        onRecordingComplete={mockOnComplete}
        onError={mockOnError}
      />
    );

    const button = getByTestId('record-button');

    // 短い録音をシミュレート
    fireEvent(button, 'pressIn');
    await new Promise(r => setTimeout(r, 1000));
    fireEvent(button, 'pressOut');

    await waitFor(() => {
      expect(mockOnError).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('短すぎます'),
        })
      );
    });
  });
});
```

---

## 9. 使用方法

このスキルは**具体的な実装**に使用します。

```
使用シーン:
- 機能の実装時
- コードレビュー時
- バグ修正時
- リファクタリング時

設計の判断は genba-app-architecture を参照してください。
```

### 関連スキル

| スキル | 用途 |
|--------|------|
| `genba-app-architecture` | 設計判断、アーキテクチャ |
| `voice-to-document` | 音声入力の詳細フロー |
| `invoice-generator` | 請求書生成の詳細ロジック |
| `ui-ux-mastery` | UI/UXパターン、アニメーション |
