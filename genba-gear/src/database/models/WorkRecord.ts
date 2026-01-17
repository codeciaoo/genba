/**
 * WorkRecord Model
 * 作業記録（音声入力の元データ）
 */
import { Model } from '@nozbe/watermelondb';
import { field, text, date, readonly, relation, json } from '@nozbe/watermelondb/decorators';
import { Relation } from '@nozbe/watermelondb';
import { TableNames } from '../schema';
import type Site from './Site';

// 作業項目の型
export interface WorkItem {
  description: string;
  details?: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  taxRate: number;
  completed: boolean;
  templateId?: string;
}

// 材料の型
export interface Material {
  name: string;
  quantity: string;
  unitPrice?: number;
}

// AI抽出データの型
export interface ExtractedData {
  siteName?: string;
  workItems: WorkItem[];
  materials: Material[];
  additionalWork: WorkItem[];
  notes?: string;
}

export type WorkRecordStatus = 'draft' | 'confirmed';

const sanitizeArray = (raw: unknown): unknown[] => {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  if (typeof raw === 'string') {
    try {
      return JSON.parse(raw);
    } catch {
      return [];
    }
  }
  return [];
};

const sanitizeObject = (raw: unknown): Record<string, unknown> | null => {
  if (!raw) return null;
  if (typeof raw === 'object' && raw !== null) return raw as Record<string, unknown>;
  if (typeof raw === 'string') {
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }
  return null;
};

export default class WorkRecord extends Model {
  static table = TableNames.WORK_RECORDS;

  static associations = {
    sites: { type: 'belongs_to' as const, key: 'site_id' },
  };

  // サーバー同期用ID
  @text('server_id') serverId!: string | null;

  // 現場への参照
  @text('site_id') siteId!: string | null;
  @relation('sites', 'site_id') site!: Relation<Site>;

  // 記録日時
  @date('recorded_at') recordedAt!: Date;

  // 音声データ
  @text('voice_file_url') voiceFileUrl!: string | null;
  @text('voice_transcript') voiceTranscript!: string | null;

  // AI抽出データ
  @json('extracted_data', sanitizeObject) extractedData!: ExtractedData | null;

  // 作業情報
  @json('work_items', sanitizeArray) workItems!: WorkItem[];
  @json('materials', sanitizeArray) materials!: Material[];
  @json('additional_work', sanitizeArray) additionalWork!: WorkItem[];

  // 作業時間
  @text('work_start_time') workStartTime!: string | null;
  @text('work_end_time') workEndTime!: string | null;

  // 備考
  @text('notes') notes!: string | null;

  // ステータス
  @text('status') status!: WorkRecordStatus;

  // 同期フラグ
  @field('is_synced') isSynced!: boolean;

  // タイムスタンプ
  @readonly @date('created_at') createdAt!: Date;
  @date('updated_at') updatedAt!: Date;
}
