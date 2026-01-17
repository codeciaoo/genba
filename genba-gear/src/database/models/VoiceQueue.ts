/**
 * VoiceQueue Model
 * 音声処理キュー（オフライン時の音声処理待ち行列）
 */
import { Model } from '@nozbe/watermelondb';
import { field, text, date, readonly, json } from '@nozbe/watermelondb/decorators';
import { TableNames } from '../schema';

// メタデータの型
export interface VoiceQueueMetadata {
  siteId?: string;
  siteName?: string;
  recordedAt: number;
}

export type VoiceQueueStatus = 'pending' | 'processing' | 'completed' | 'failed';

const sanitizeMetadata = (raw: unknown): VoiceQueueMetadata | null => {
  if (!raw) return null;
  if (typeof raw === 'object' && raw !== null) return raw as VoiceQueueMetadata;
  if (typeof raw === 'string') {
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }
  return null;
};

export default class VoiceQueue extends Model {
  static table = TableNames.VOICE_QUEUE;

  // 音声ファイルのURI
  @text('audio_uri') audioUri!: string;

  // メタデータ
  @json('metadata', sanitizeMetadata) metadata!: VoiceQueueMetadata | null;

  // ステータス
  @text('status') status!: VoiceQueueStatus;

  // エラーメッセージ
  @text('error_message') errorMessage!: string | null;

  // リトライ回数
  @field('retry_count') retryCount!: number;

  // 作成日時
  @readonly @date('created_at') createdAt!: Date;
}
