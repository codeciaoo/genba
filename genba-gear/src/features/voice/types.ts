/**
 * Voice Feature Types
 * 音声入力機能の型定義
 */

// GPS位置情報
export interface GPSLocation {
  latitude: number;
  longitude: number;
  accuracy: number | null;
  timestamp: number;
}

// 天気情報
export interface WeatherData {
  description: string;
  temperature: number;
  humidity: number;
}

// AI抽出データ
export interface StructuredWorkData {
  date: string;
  location: string;
  tasks: {
    description: string;
    hours?: number;
    completed: boolean;
  }[];
  materials: {
    name: string;
    quantity: string;
    unit?: string;
  }[];
  notes: string[];
  weatherHint?: string;
}

// 音声処理の状態
export type VoiceProcessingState =
  | 'idle'
  | 'recording'
  | 'processing'
  | 'transcribing'
  | 'extracting'
  | 'completed'
  | 'error';

// 音声処理の結果
export interface VoiceProcessingResult {
  success: boolean;
  workRecordId?: string;
  transcript?: string;
  structuredData?: StructuredWorkData;
  location?: GPSLocation;
  weather?: WeatherData;
  error?: string;
  queued?: boolean;
}

// 録音設定
export const RECORDING_CONFIG = {
  MIN_DURATION_MS: 3000,  // 最小3秒
  MAX_DURATION_MS: 30000, // 最大30秒
  AUDIO_QUALITY: 'HIGH' as const,
} as const;
