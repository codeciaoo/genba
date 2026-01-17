/**
 * OpenAI API Client
 * Whisper音声認識 + GPT-4o-mini構造化抽出
 */
import { StructuredWorkData } from '@/features/voice/types';
import {
  WHISPER_NOISE_FILTERING_PROMPT,
  EXTRACTION_SYSTEM_PROMPT,
} from './prompts';

// 環境変数からAPIキーを取得（Expo用）
const OPENAI_API_KEY = process.env.EXPO_PUBLIC_OPENAI_API_KEY;

if (!OPENAI_API_KEY) {
  console.warn('EXPO_PUBLIC_OPENAI_API_KEY が設定されていません');
}

/**
 * 騒音フィルタリング付き音声文字起こし（Whisper API）
 */
export async function transcribeWithNoiseFiltering(
  audioUri: string
): Promise<string> {
  if (!OPENAI_API_KEY) {
    throw new Error('OpenAI API キーが設定されていません');
  }

  // FormDataを作成
  const formData = new FormData();

  // React NativeのFormData用にBlobライクなオブジェクトを追加
  formData.append('file', {
    uri: audioUri,
    type: 'audio/m4a',
    name: 'recording.m4a',
  } as unknown as Blob);

  formData.append('model', 'whisper-1');
  formData.append('language', 'ja');
  formData.append('prompt', WHISPER_NOISE_FILTERING_PROMPT);

  const response = await fetch(
    'https://api.openai.com/v1/audio/transcriptions',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: formData,
    }
  );

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(
      `Whisper API エラー: ${response.status} - ${error.error?.message || '不明なエラー'}`
    );
  }

  const result = await response.json();
  return result.text;
}

/**
 * 文字起こしテキストを構造化データに変換（GPT-4o-mini）
 */
export async function structureWorkData(
  transcript: string
): Promise<StructuredWorkData> {
  if (!OPENAI_API_KEY) {
    throw new Error('OpenAI API キーが設定されていません');
  }

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: EXTRACTION_SYSTEM_PROMPT },
        { role: 'user', content: transcript },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.3,
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(
      `GPT API エラー: ${response.status} - ${error.error?.message || '不明なエラー'}`
    );
  }

  const result = await response.json();
  const content = result.choices[0]?.message?.content;

  if (!content) {
    throw new Error('GPT APIからの応答が空です');
  }

  const parsed = JSON.parse(content) as StructuredWorkData;

  // "today"を実際の日付に変換
  if (parsed.date === 'today') {
    parsed.date = new Date().toISOString().split('T')[0];
  }

  // デフォルト値の設定
  return {
    date: parsed.date || new Date().toISOString().split('T')[0],
    location: parsed.location || '現場',
    tasks: parsed.tasks || [],
    materials: parsed.materials || [],
    notes: parsed.notes || [],
    weatherHint: parsed.weatherHint,
  };
}

/**
 * 音声ファイルを文字起こしして構造化（一括処理）
 */
export async function processVoiceToStructuredData(
  audioUri: string
): Promise<{ transcript: string; structuredData: StructuredWorkData }> {
  // 1. 音声を文字起こし
  const transcript = await transcribeWithNoiseFiltering(audioUri);

  // 2. 構造化データに変換
  const structuredData = await structureWorkData(transcript);

  return { transcript, structuredData };
}
