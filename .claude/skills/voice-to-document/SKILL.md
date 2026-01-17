---
name: voice-to-document
description: 騒音耐性AIボイス入力から日報の下書きを生成するワークフロー。OpenAIカスタムモデルで騒音フィルタリング、GPT-4o-miniで構造化データ抽出。音声処理、文字起こし、AIテキスト解析、日報生成の実装時に使用。
---

# 騒音耐性AIボイス入力 → 日報生成ワークフロー

## 処理フロー概要

```
音声録音 → 騒音フィルタリング → 文字起こし → 構造化抽出 → GPS/天気統合 → 日報下書き
(3-30秒)   (OpenAI)           (Whisper)    (GPT-4o-mini)  (API)          (PDF出力可)
```

## ワークフローチェックリスト

実装時にコピーして使用:

```
□ Step 1: 音声録音機能の実装
  □ Expo Audio権限設定
  □ マイク1タップで録音開始/停止
  □ 3-30秒の時間制限
  □ 音声ファイルのローカル保存

□ Step 2: 騒音フィルタリング + Whisper API
  □ 音声ファイルのアップロード
  □ 騒音環境用プロンプト設定
  □ 日本語言語指定
  □ 誤認識時のテキスト修正ポップアップ

□ Step 3: GPT-4o-miniによる構造化
  □ 意図解析プロンプトの設定
  □ JSON形式での出力
  □ エラーハンドリング

□ Step 4: GPS/天気API統合
  □ GPS位置情報取得
  □ 天気API連携
  □ データ結合

□ Step 5: 日報下書き生成
  □ 法規準拠チェック（タイムスタンプ/署名）
  □ PDF出力機能
  □ 確認画面への遷移
```

## Step 1: 音声録音（騒音耐性）

### 必要パッケージ

```bash
npx expo install expo-av expo-location
```

### 録音コンポーネント

```typescript
// src/features/voice/VoiceRecorder.tsx
import React, { useState, useRef, useEffect } from 'react';
import { View, Pressable, Text, Alert } from 'react-native';
import { Audio } from 'expo-av';

const MIN_DURATION = 3;  // 最小3秒
const MAX_DURATION = 30; // 最大30秒

export function VoiceRecorder({ onRecordingComplete }) {
  const [isRecording, setIsRecording] = useState(false);
  const [duration, setDuration] = useState(0);
  const recordingRef = useRef<Audio.Recording | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const startRecording = async () => {
    const { granted } = await Audio.requestPermissionsAsync();
    if (!granted) {
      Alert.alert('権限エラー', 'マイクの使用を許可してください');
      return;
    }

    await Audio.setAudioModeAsync({
      allowsRecordingIOS: true,
      playsInSilentModeIOS: true,
    });

    const { recording } = await Audio.Recording.createAsync(
      Audio.RecordingOptionsPresets.HIGH_QUALITY
    );
    recordingRef.current = recording;
    setIsRecording(true);

    // 録音時間カウント
    timerRef.current = setInterval(() => {
      setDuration(prev => {
        if (prev >= MAX_DURATION - 1) {
          stopRecording();
          return MAX_DURATION;
        }
        return prev + 1;
      });
    }, 1000);
  };

  const stopRecording = async () => {
    if (!recordingRef.current) return;

    if (timerRef.current) clearInterval(timerRef.current);

    // 最小時間チェック
    if (duration < MIN_DURATION) {
      Alert.alert('録音時間不足', `${MIN_DURATION}秒以上話してください`);
      await recordingRef.current.stopAndUnloadAsync();
      recordingRef.current = null;
      setIsRecording(false);
      setDuration(0);
      return;
    }

    setIsRecording(false);
    await recordingRef.current.stopAndUnloadAsync();
    const uri = recordingRef.current.getURI();

    onRecordingComplete(uri, duration);
    recordingRef.current = null;
    setDuration(0);
  };

  return (
    <View className="items-center p-8">
      <Pressable
        onPress={isRecording ? stopRecording : startRecording}
        className={`w-32 h-32 rounded-full items-center justify-center ${
          isRecording ? 'bg-error animate-pulse' : 'bg-primary'
        }`}
      >
        <Text className="text-white text-lg font-bold">
          {isRecording ? `${duration}秒` : '🎤'}
        </Text>
      </Pressable>

      <Text className="mt-4 text-text-secondary text-center">
        {isRecording
          ? `話し終わったらタップ（${MAX_DURATION - duration}秒まで）`
          : 'マイク1タップで録音開始\n騒音の中でもOK！'}
      </Text>

      {!isRecording && (
        <Text className="mt-2 text-sm text-text-muted">
          例: 「今日の現場、田中邸。壁塗り3時間、材料10kg使用」
        </Text>
      )}
    </View>
  );
}
```

## Step 2: 騒音フィルタリング + 文字起こし（Whisper）

### Supabase Edge Function

```typescript
// supabase/functions/transcribe/index.ts
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: Deno.env.get('OPENAI_API_KEY'),
});

// 騒音耐性プロンプト（建設現場向け）
const WHISPER_PROMPT = `
建設現場の作業報告。騒音環境での音声入力。
騒音種類: 機械音（電動工具、重機）、風音、環境音を除去。
よく使う言葉: 現場、作業、塗装、配管、電気、材料、時間、完了。
顧客名: ○○邸、○○様、○○ビル。
数値: メートル、kg、時間、個。
`;

Deno.serve(async (req) => {
  const { audio, mimeType } = await req.json();

  // Base64をバイナリに変換
  const binaryData = Uint8Array.from(atob(audio), c => c.charCodeAt(0));
  const file = new File([binaryData], 'audio.m4a', { type: mimeType });

  const transcription = await openai.audio.transcriptions.create({
    file,
    model: 'whisper-1',
    language: 'ja',
    prompt: WHISPER_PROMPT,
  });

  return new Response(
    JSON.stringify({ text: transcription.text }),
    { headers: { 'Content-Type': 'application/json' } }
  );
});
```

### 誤認識修正UI

```typescript
// src/features/voice/TranscriptCorrection.tsx
export function TranscriptCorrection({ transcript, onConfirm, onRerecord }) {
  const [edited, setEdited] = useState(transcript);

  return (
    <View className="p-4">
      <Text className="font-bold mb-2">音声認識結果</Text>
      <TextInput
        value={edited}
        onChangeText={setEdited}
        multiline
        className="border border-gray-300 rounded p-3 min-h-[100px]"
      />

      <View className="flex-row gap-3 mt-4">
        <Button
          title="もう一度録音"
          variant="outline"
          onPress={onRerecord}
          className="flex-1"
        />
        <Button
          title="これで確定"
          onPress={() => onConfirm(edited)}
          className="flex-1"
        />
      </View>
    </View>
  );
}
```

## Step 3: 構造化抽出（GPT-4o-mini）

### 抽出プロンプト

```typescript
// src/constants/prompts.ts
export const EXTRACTION_SYSTEM_PROMPT = `
あなたは建設現場の作業報告を構造化データに変換するアシスタントです。
騒音環境での音声入力から情報を抽出し、JSON形式で出力します。

## 出力JSON形式

{
  "date": "YYYY-MM-DD（不明ならtoday）",
  "location": "現場名・顧客名",
  "tasks": [
    {
      "description": "作業内容",
      "hours": 数値,
      "completed": true/false
    }
  ],
  "materials": [
    {"name": "材料名", "quantity": "数量", "unit": "単位"}
  ],
  "notes": ["備考・メモ"],
  "weather_hint": "天気の言及（あれば）"
}

## 抽出ルール

1. 明示されていない情報はnullまたは空配列
2. 時間不明は推定しない
3. 「今日」「本日」→ date: "today"（後でシステムが変換）
4. 「完了」「終わった」→ completed: true
5. 騒音による不明瞭な部分は[不明瞭]とマーク
6. 金額・単価は抽出しない
`;
```

### 抽出関数

```typescript
// src/services/extract.ts
export async function extractStructuredData(transcript: string) {
  const response = await fetch(`${SUPABASE_FUNCTIONS_URL}/extract`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({ transcript }),
  });

  const data = await response.json();

  // "today"を実際の日付に変換
  if (data.date === 'today') {
    data.date = new Date().toISOString().split('T')[0];
  }

  return data;
}
```

### Supabase Edge Function

```typescript
// supabase/functions/extract/index.ts
import OpenAI from 'openai';

Deno.serve(async (req) => {
  const { transcript } = await req.json();

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: EXTRACTION_SYSTEM_PROMPT },
      { role: 'user', content: transcript },
    ],
    response_format: { type: 'json_object' },
    temperature: 0.3,
  });

  const extracted = JSON.parse(completion.choices[0].message.content);

  return new Response(
    JSON.stringify(extracted),
    { headers: { 'Content-Type': 'application/json' } }
  );
});
```

## Step 4: GPS/天気API統合

### GPS位置情報取得

```typescript
// src/services/location.ts
import * as Location from 'expo-location';

export async function getCurrentLocation() {
  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== 'granted') {
    return null;
  }

  const location = await Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.Balanced,
  });

  return {
    latitude: location.coords.latitude,
    longitude: location.coords.longitude,
    timestamp: location.timestamp,
  };
}
```

### 天気API連携

```typescript
// src/services/weather.ts
const WEATHER_API_KEY = process.env.EXPO_PUBLIC_WEATHER_API_KEY;

export async function getWeather(lat: number, lon: number) {
  const response = await fetch(
    `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${WEATHER_API_KEY}&units=metric&lang=ja`
  );

  const data = await response.json();

  return {
    condition: data.weather[0].description, // 晴れ、曇り、雨など
    temperature: data.main.temp,
    humidity: data.main.humidity,
  };
}
```

## Step 5: 日報下書き生成

### 作業記録の保存

```typescript
// src/features/voice/createDraft.ts
import { database } from '../../database';

export async function createWorkRecordDraft(
  transcript: string,
  extractedData: ExtractedData,
  gpsLocation: Location,
  weather: Weather
) {
  return await database.write(async () => {
    const workRecord = await database
      .get('work_records')
      .create((record) => {
        record.voiceTranscript = transcript;
        record.structuredData = JSON.stringify(extractedData);
        record.gpsLocation = JSON.stringify(gpsLocation);
        record.weather = weather.condition;
        record.temperature = weather.temperature;
        record.recordedAt = new Date().toISOString();
        record.status = 'draft';
        record.isSynced = false;
      });

    return workRecord;
  });
}
```

### 日報生成（法規準拠）

```typescript
// src/features/report/generateDailyReport.ts
import * as Print from 'expo-print';

export async function generateDailyReport(workRecord: WorkRecord) {
  const data = JSON.parse(workRecord.structuredData);
  const gps = JSON.parse(workRecord.gpsLocation);

  // 法規準拠: タイムスタンプ署名
  const timestamp = new Date().toISOString();
  const signature = await generateDigitalSignature(workRecord.id, timestamp);

  const report = {
    date: data.date,
    location: data.location,
    gps: gps,
    weather: workRecord.weather,
    temperature: workRecord.temperature,
    tasks: data.tasks,
    materials: data.materials,
    notes: data.notes,
    timestamp: timestamp,
    signature: signature,
  };

  // 日報をDBに保存
  const dailyReport = await database.write(async () => {
    return database.get('daily_reports').create(dr => {
      dr.workRecordId = workRecord.id;
      dr.reportDate = data.date;
      dr.content = JSON.stringify(report);
      dr.status = 'draft';
    });
  });

  return dailyReport;
}
```

## 全体フロー（統合）

```typescript
// src/features/voice/processVoice.ts
export async function processVoiceInput(audioUri: string) {
  try {
    // 1. GPS位置情報を並行取得
    const locationPromise = getCurrentLocation();

    // 2. 音声ファイルをBase64に変換
    const base64 = await FileSystem.readAsStringAsync(audioUri, {
      encoding: FileSystem.EncodingType.Base64,
    });

    // 3. 騒音フィルタリング + 文字起こし
    const { text: transcript } = await supabase.functions.invoke('transcribe', {
      body: { audio: base64, mimeType: 'audio/m4a' },
    });

    // 4. 構造化抽出
    const extracted = await supabase.functions.invoke('extract', {
      body: { transcript },
    });

    // 5. GPS/天気取得
    const location = await locationPromise;
    const weather = location
      ? await getWeather(location.latitude, location.longitude)
      : { condition: '不明', temperature: null };

    // 6. 作業記録の下書き作成
    const workRecord = await createWorkRecordDraft(
      transcript,
      extracted.data,
      location,
      weather
    );

    return {
      success: true,
      workRecordId: workRecord.id,
      transcript,
      extracted: extracted.data,
      location,
      weather,
    };
  } catch (error) {
    // オフライン時はローカル保存
    if (error.message?.includes('network')) {
      await saveOfflineRecord(audioUri);
      return { success: false, queued: true };
    }
    throw error;
  }
}
```

## オフラインハンドリング

```typescript
// オフライン時のローカル保存
async function saveOfflineRecord(audioUri: string) {
  await database.write(async () => {
    await database.get('pending_records').create(record => {
      record.audioUri = audioUri;
      record.createdAt = new Date().toISOString();
      record.status = 'pending_sync';
    });
  });
}

// オンライン復帰時の処理
export async function processPendingRecords() {
  const pending = await database.get('pending_records')
    .query(Q.where('status', 'pending_sync'))
    .fetch();

  for (const record of pending) {
    try {
      await processVoiceInput(record.audioUri);
      await database.write(async () => {
        await record.destroyPermanently();
      });
    } catch (error) {
      console.error('Sync failed:', error);
    }
  }
}
```

## パフォーマンス目標

| 処理 | 目標時間 |
|------|---------|
| 録音完了→文字起こし開始 | < 1秒 |
| 騒音フィルタリング+文字起こし（30秒音声） | < 5秒 |
| 構造化抽出 | < 3秒 |
| GPS/天気取得（並行） | < 2秒 |
| **全体** | **< 10秒** |

## エラーハンドリング

| エラー | 対処 |
|--------|------|
| ネットワークエラー | ローカル保存 → オンライン時に再処理 |
| 騒音で認識失敗 | テキスト修正ポップアップ or 再録音 |
| GPS取得失敗 | 天気なしで続行（手動入力オプション） |
| 抽出データ不十分 | [不明瞭]マーク + 手動編集画面 |
