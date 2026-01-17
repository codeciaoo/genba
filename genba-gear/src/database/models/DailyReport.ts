/**
 * DailyReport Model
 * 日報
 */
import { Model } from '@nozbe/watermelondb';
import { field, text, date, readonly, relation, json } from '@nozbe/watermelondb/decorators';
import { Relation } from '@nozbe/watermelondb';
import { TableNames } from '../schema';
import type Site from './Site';
import type { WorkItem, Material } from './WorkRecord';

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

export default class DailyReport extends Model {
  static table = TableNames.DAILY_REPORTS;

  static associations = {
    sites: { type: 'belongs_to' as const, key: 'site_id' },
  };

  // サーバー同期用ID
  @text('server_id') serverId!: string | null;

  // 現場への参照
  @text('site_id') siteId!: string | null;
  @relation('sites', 'site_id') site!: Relation<Site>;

  // 作業記録への参照
  @text('work_record_id') workRecordId!: string | null;

  // 日報日付
  @date('report_date') reportDate!: Date;

  // 作業内容
  @json('work_items', sanitizeArray) workItems!: WorkItem[];
  @json('materials', sanitizeArray) materials!: Material[];
  @json('additional_work', sanitizeArray) additionalWork!: WorkItem[];

  // 作業者情報
  @text('worker_name') workerName!: string | null;
  @field('work_hours') workHours!: number | null;

  // 天気
  @text('weather') weather!: string | null;
  @field('temperature') temperature!: number | null;

  // 備考
  @text('notes') notes!: string | null;

  // PDF
  @text('pdf_url') pdfUrl!: string | null;

  // 同期フラグ
  @field('is_synced') isSynced!: boolean;

  // タイムスタンプ
  @readonly @date('created_at') createdAt!: Date;
  @date('updated_at') updatedAt!: Date;
}
