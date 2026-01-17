# 音声処理パイプライン

## 概要

職人が現場帰りに「しゃべるだけ」で日報・請求書の下書きを作成するためのAI処理フロー。

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│  音声録音    │ -> │  文字起こし  │ -> │  構造化抽出  │ -> │  下書き生成  │
│  (Client)   │    │  (Whisper)  │    │  (GPT-4o)   │    │  (Client)   │
└─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘
```

## 1. 音声録音（クライアント側）

### Expo Audio設定

```typescript
import { Audio } from 'expo-av';

const startRecording = async () => {
  await Audio.requestPermissionsAsync();
  await Audio.setAudioModeAsync({
    allowsRecordingIOS: true,
    playsInSilentModeIOS: true,
  });

  const { recording } = await Audio.Recording.createAsync(
    Audio.RecordingOptionsPresets.HIGH_QUALITY
  );
  return recording;
};

const stopRecording = async (recording: Audio.Recording) => {
  await recording.stopAndUnloadAsync();
  const uri = recording.getURI();
  return uri; // ローカルファイルパス
};
```

### 録音設定（建設現場向け）

```typescript
const RECORDING_OPTIONS = {
  android: {
    extension: '.m4a',
    outputFormat: Audio.AndroidOutputFormat.MPEG_4,
    audioEncoder: Audio.AndroidAudioEncoder.AAC,
    sampleRate: 44100,
    numberOfChannels: 1,  // モノラルで十分、ファイルサイズ削減
    bitRate: 128000,
  },
  ios: {
    extension: '.m4a',
    audioQuality: Audio.IOSAudioQuality.HIGH,
    sampleRate: 44100,
    numberOfChannels: 1,
    bitRate: 128000,
    linearPCMBitDepth: 16,
    linearPCMIsBigEndian: false,
    linearPCMIsFloat: false,
  },
};
```

## 2. 文字起こし（Whisper API）

### サーバーサイド実装（Supabase Edge Function）

```typescript
// supabase/functions/transcribe/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: Deno.env.get('OPENAI_API_KEY'),
});

serve(async (req) => {
  const formData = await req.formData();
  const audioFile = formData.get('audio') as File;

  const transcription = await openai.audio.transcriptions.create({
    file: audioFile,
    model: 'whisper-1',
    language: 'ja',
    prompt: '建設現場の作業報告。エアコン、配管、電気工事。田中邸、佐藤様。', // 認識精度向上用
  });

  return new Response(
    JSON.stringify({ text: transcription.text }),
    { headers: { 'Content-Type': 'application/json' } }
  );
});
```

### Whisper認識精度向上のコツ

1. **プロンプトに専門用語を含める**: 職種に応じた用語（エアコン、配管、電気等）
2. **固有名詞の例を含める**: よく使う現場名・顧客名
3. **騒音対策**: 録音前に「静かな場所で」と案内、またはノイズ除去前処理

## 3. 構造化抽出（GPT-4o）

### 抽出プロンプト

```typescript
const EXTRACTION_SYSTEM_PROMPT = `
あなたは建設現場の作業報告を構造化データに変換するアシスタントです。

音声入力されたテキストから、以下の情報を抽出してJSON形式で出力してください。

## 出力形式

{
  "site_hint": "現場名や顧客名のヒント（推測含む）",
  "work_items": [
    {
      "description": "作業内容",
      "details": "詳細・補足",
      "quantity": 数量（数値）,
      "unit": "単位（式、個、m、時間など）",
      "completed": true/false
    }
  ],
  "materials": [
    {
      "name": "材料名",
      "quantity": "数量（単位込み）"
    }
  ],
  "additional_work": [
    {
      "description": "追加・変更作業",
      "reason": "理由（あれば）",
      "approved": true/false/null
    }
  ],
  "notes": ["備考・申し送り事項"],
  "work_time": {
    "start": "HH:MM または null",
    "end": "HH:MM または null"
  }
}

## ルール

1. 明示されていない情報は推測せず、nullまたは空配列にする
2. 数量が不明な場合は1とし、unitは"式"とする
3. 「追加」「変更」「予定外」などの言葉があればadditional_workに分類
4. 「次回」「今度」などの言葉があればnotesに分類
5. 金額は抽出しない（テンプレートから補完するため）
`;

const extractStructuredData = async (transcript: string) => {
  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      { role: 'system', content: EXTRACTION_SYSTEM_PROMPT },
      { role: 'user', content: transcript },
    ],
    response_format: { type: 'json_object' },
    temperature: 0.1,  // 抽出タスクなので低めに
  });

  return JSON.parse(response.choices[0].message.content);
};
```

### 入力例と出力例

**音声入力（文字起こし結果）**:
```
今日の現場、田中邸。エアコン設置完了。配管2メートル追加になった。
お客さんに確認済み。あと、次回室外機のカバーつける予定。
```

**抽出結果**:
```json
{
  "site_hint": "田中邸",
  "work_items": [
    {
      "description": "エアコン設置",
      "details": null,
      "quantity": 1,
      "unit": "式",
      "completed": true
    }
  ],
  "materials": [],
  "additional_work": [
    {
      "description": "配管追加",
      "reason": null,
      "approved": true,
      "quantity": 2,
      "unit": "m"
    }
  ],
  "notes": [
    "次回室外機カバー取付予定"
  ],
  "work_time": null
}
```

## 4. 品目マッチング

抽出された作業内容と、ユーザーの品目テンプレートをマッチングして単価を補完。

```typescript
const matchItemTemplates = async (
  extractedItems: ExtractedItem[],
  userTemplates: ItemTemplate[]
) => {
  const matched = extractedItems.map(item => {
    // キーワードマッチング
    const template = userTemplates.find(t =>
      t.keywords.some(keyword =>
        item.description.includes(keyword) ||
        keyword.includes(item.description)
      )
    );

    if (template) {
      return {
        ...item,
        unit_price: template.unit_price,
        tax_rate: template.tax_rate,
        template_id: template.id,
        matched: true,
      };
    }

    // マッチしない場合はそのまま（単価は手動入力）
    return {
      ...item,
      unit_price: null,
      matched: false,
    };
  });

  return matched;
};
```

## 5. エラーハンドリング

### ネットワークエラー時

```typescript
const processVoiceWithRetry = async (audioUri: string, maxRetries = 3) => {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await processVoice(audioUri);
    } catch (error) {
      if (i === maxRetries - 1) {
        // オフライン保存して後で再試行
        await saveForLaterProcessing(audioUri);
        throw new Error('音声処理に失敗しました。オンライン復帰後に再試行します。');
      }
      await delay(1000 * (i + 1)); // 指数バックオフ
    }
  }
};
```

### 認識失敗時のフォールバック

```typescript
// 音声認識が不十分な場合、手動入力フォームを表示
if (!extractedData.work_items.length && !extractedData.site_hint) {
  return {
    type: 'manual_input_required',
    transcript: transcript,
    message: '音声から作業内容を抽出できませんでした。手動で入力してください。',
  };
}
```

## コスト見積もり

| 処理 | 単価 | 1回あたり | 月100回 |
|------|------|----------|---------|
| Whisper (30秒音声) | $0.006/分 | $0.003 | $0.30 |
| GPT-4o (入力500トークン) | $0.005/1K | $0.0025 | $0.25 |
| GPT-4o (出力200トークン) | $0.015/1K | $0.003 | $0.30 |
| **合計** | | ~$0.01 | **~$1.00** |

※MVP段階では十分に低コスト
