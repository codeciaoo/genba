# #004 騒音耐性AIボイス入力

## 概要

建設現場の騒音環境下でも正確に音声入力できる、騒音耐性AIボイス入力機能を実装する。

## ステータス

🟢 Done

## 優先度

P0（MVP必須）

## 依存

- #003 認証・ユーザー設定

## 参照スキル

- `voice-to-document` - 騒音耐性ボイス入力ワークフロー

## タスク

### 1. 音声録音コンポーネント

```typescript
// src/features/voice/VoiceRecorder.tsx
import { Audio } from 'expo-av';

const MIN_DURATION = 3000;  // 最小3秒
const MAX_DURATION = 30000; // 最大30秒

interface VoiceRecorderProps {
  onRecordingComplete: (uri: string, duration: number) => void;
  onError: (error: Error) => void;
}

export function VoiceRecorder({ onRecordingComplete, onError }: VoiceRecorderProps) {
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [duration, setDuration] = useState(0);
  const [isRecording, setIsRecording] = useState(false);

  // 録音開始/停止ロジック
  // プログレスリング表示
  // 最大時間での自動停止
}
```

### 2. Whisper API連携（騒音フィルタリング）

```typescript
// src/services/openai.ts
export async function transcribeWithNoiseFiltering(audioUri: string): Promise<string> {
  const formData = new FormData();
  formData.append('file', {
    uri: audioUri,
    type: 'audio/m4a',
    name: 'recording.m4a',
  } as any);
  formData.append('model', 'whisper-1');
  formData.append('language', 'ja');
  formData.append('prompt', `
    建設現場での作業報告音声です。
    背景に機械音、電動工具音、車両音などの騒音が含まれる可能性があります。
    人の声のみを抽出し、作業内容を正確に文字起こししてください。
    専門用語: 墨出し、配筋、型枠、打設、養生、はつり、ケレン、下地処理
  `);

  const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
    },
    body: formData,
  });

  const result = await response.json();
  return result.text;
}
```

### 3. GPT-4o-mini構造化

```typescript
// src/services/openai.ts
export async function structureWorkData(transcript: string): Promise<StructuredWorkData> {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `建設現場の作業報告を構造化データに変換してください。
JSON形式で出力:
{
  "workType": "作業種別",
  "location": "作業場所",
  "details": "作業内容詳細",
  "materials": ["使用材料"],
  "quantity": "数量",
  "unit": "単位",
  "issues": "特記事項",
  "nextAction": "次回予定"
}`
        },
        { role: 'user', content: transcript }
      ],
      temperature: 0.3,
    }),
  });

  const result = await response.json();
  return JSON.parse(result.choices[0].message.content);
}
```

### 4. 文字起こし確認・修正UI

```typescript
// src/features/voice/TranscriptEditor.tsx
interface TranscriptEditorProps {
  transcript: string;
  structuredData: StructuredWorkData;
  onConfirm: (data: StructuredWorkData) => void;
  onRetry: () => void;
}

// フィールドごとの編集
// 再録音ボタン
// 確定ボタン
```

### 5. オフライン対応

```typescript
// src/features/voice/offlineQueue.ts
interface PendingRecord {
  id: string;
  audioUri: string;
  gpsLocation: GPSLocation;
  weather: WeatherData;
  recordedAt: Date;
  status: 'pending' | 'processing' | 'failed';
}

// ローカルに保存
// オンライン復帰時に自動処理
```

### 6. GPS/天気自動取得

```typescript
// src/services/location.ts
import * as Location from 'expo-location';

export async function getCurrentLocation(): Promise<GPSLocation> {
  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== 'granted') throw new Error('位置情報の許可が必要です');

  const location = await Location.getCurrentPositionAsync({});
  return {
    latitude: location.coords.latitude,
    longitude: location.coords.longitude,
    accuracy: location.coords.accuracy,
  };
}

// src/services/weather.ts
export async function getWeather(lat: number, lon: number): Promise<WeatherData> {
  const response = await fetch(
    `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric&lang=ja`
  );
  const data = await response.json();
  return {
    description: data.weather[0].description,
    temperature: data.main.temp,
    humidity: data.main.humidity,
  };
}
```

### 7. 手動作業記録入力画面（フォールバック）

音声認識が失敗した場合、または音声入力が使えない環境向けのフォールバック画面。

```typescript
// app/manual-input.tsx
export default function ManualInputScreen() {
  const [siteName, setSiteName] = useState('');
  const [workItems, setWorkItems] = useState<WorkItem[]>([{ id: '1', content: '' }]);
  const [notes, setNotes] = useState('');

  const addWorkItem = () => {
    setWorkItems([...workItems, { id: Date.now().toString(), content: '' }]);
  };

  const updateWorkItem = (id: string, content: string) => {
    setWorkItems(workItems.map(item =>
      item.id === id ? { ...item, content } : item
    ));
  };

  const removeWorkItem = (id: string) => {
    if (workItems.length > 1) {
      setWorkItems(workItems.filter(item => item.id !== id));
    }
  };

  const handleSave = async () => {
    // バリデーション
    if (!siteName.trim()) {
      Alert.alert('エラー', '現場名を入力してください');
      return;
    }
    if (!workItems.some(item => item.content.trim())) {
      Alert.alert('エラー', '作業内容を1つ以上入力してください');
      return;
    }

    // GPS/天気取得
    const gpsLocation = await getCurrentLocation();
    const weather = await getWeather(gpsLocation.latitude, gpsLocation.longitude);

    // 作業記録保存
    const workRecord = await createWorkRecord({
      voiceTranscript: null, // 手動入力なので音声データなし
      structuredData: {
        location: siteName,
        workItems: workItems.filter(item => item.content.trim()),
        notes,
      },
      gpsLocation,
      weather: weather.description,
      temperature: weather.temperature,
      recordedAt: new Date(),
      status: 'draft',
    });

    // 下書き確認画面へ
    router.replace(`/draft/${workRecord.id}`);
  };

  return (
    <ScrollView className="flex-1 bg-background p-4">
      <Text className="text-xl font-bold mb-4">作業記録を入力</Text>

      {/* 現場名 */}
      <Text className="font-semibold mb-2">現場名</Text>
      <TextInput
        value={siteName}
        onChangeText={setSiteName}
        placeholder="田中邸、○○ビル など"
        className="border border-gray-300 rounded-lg p-3 mb-4"
      />

      {/* 作業内容リスト */}
      <Text className="font-semibold mb-2">作業内容</Text>
      {workItems.map((item, index) => (
        <View key={item.id} className="flex-row items-center mb-2">
          <TextInput
            value={item.content}
            onChangeText={(text) => updateWorkItem(item.id, text)}
            placeholder={`作業${index + 1}を入力`}
            className="flex-1 border border-gray-300 rounded-lg p-3"
          />
          {workItems.length > 1 && (
            <TouchableOpacity
              onPress={() => removeWorkItem(item.id)}
              className="ml-2 p-2"
            >
              <Text className="text-error">✕</Text>
            </TouchableOpacity>
          )}
        </View>
      ))}
      <TouchableOpacity
        onPress={addWorkItem}
        className="border border-dashed border-primary rounded-lg p-3 items-center mb-4"
      >
        <Text className="text-primary">＋ 作業を追加</Text>
      </TouchableOpacity>

      {/* 備考 */}
      <Text className="font-semibold mb-2">備考・メモ（任意）</Text>
      <TextInput
        value={notes}
        onChangeText={setNotes}
        placeholder="特記事項があれば入力"
        multiline
        numberOfLines={3}
        className="border border-gray-300 rounded-lg p-3 mb-6"
      />

      {/* 保存ボタン */}
      <Button
        title="記録を保存"
        onPress={handleSave}
        className="bg-primary py-4"
      />
    </ScrollView>
  );
}
```

**手動入力画面仕様**:
- パス: `/manual-input`
- 進入経路:
  - 音声認識失敗エラー画面から「手動で入力する」ボタン
  - ホーム画面から（将来的に追加ボタン）
- 入力項目:
  - 現場名（必須）: コンボボックス（過去の現場名をサジェスト）
  - 作業内容（必須）: 複数入力可能、追加・削除ボタン
  - 備考・メモ（任意）
- GPS/天気: 保存時に自動取得
- 遷移先: 保存成功 → 下書き確認画面 `/draft/[id]`

## 実行コマンド

```bash
# 指示文
voice-to-documentスキルを参照して、
騒音耐性AIボイス入力機能を実装してください。

作業対象: /Users/tsubasatahara/dev/codeciao/genba/genba-gear

1. 音声録音コンポーネント（3-30秒制限）
2. Whisper API連携（騒音フィルタリングプロンプト）
3. GPT-4o-mini構造化
4. 文字起こし確認・修正UI
5. オフラインキュー
6. GPS/天気自動取得
7. 手動入力画面（音声認識失敗時のフォールバック）
```

## 完了条件

- [x] マイクボタンタップで録音開始できる
- [x] 3秒未満は「短すぎます」エラー
- [x] 30秒で自動停止する
- [x] プログレスリングが表示される
- [x] Whisperで文字起こしされる
- [x] GPT-4o-miniで構造化される
- [x] 文字起こし結果を修正できる
- [x] GPS/天気が自動取得される
- [x] オフラインでも録音・保存できる
- [x] オンライン復帰時に自動処理される
- [x] 認識失敗時に「手動入力」オプションが表示される
- [x] 手動入力フォームで作業記録を作成できる
- [x] 手動入力からも下書き確認→日報生成フローに進める
