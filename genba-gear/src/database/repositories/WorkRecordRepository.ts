/**
 * WorkRecordRepository
 *
 * 作業記録データのCRUD操作を提供。
 */
import { Database, Q } from '@nozbe/watermelondb';
import { Observable } from 'rxjs';
import { BaseRepository } from './BaseRepository';
import WorkRecord, {
  WorkItem,
  Material,
  ExtractedData,
  WorkRecordStatus,
} from '../models/WorkRecord';
import { TableNames } from '../schema';

export interface CreateWorkRecordParams {
  siteId?: string;
  recordedAt?: Date;
  voiceFileUrl?: string;
  voiceTranscript?: string;
  extractedData?: ExtractedData;
  workItems?: WorkItem[];
  materials?: Material[];
  additionalWork?: WorkItem[];
  workStartTime?: string;
  workEndTime?: string;
  notes?: string;
  status?: WorkRecordStatus;
}

export interface UpdateWorkRecordParams {
  siteId?: string;
  voiceTranscript?: string;
  extractedData?: ExtractedData;
  workItems?: WorkItem[];
  materials?: Material[];
  additionalWork?: WorkItem[];
  workStartTime?: string;
  workEndTime?: string;
  notes?: string;
  status?: WorkRecordStatus;
}

export class WorkRecordRepository extends BaseRepository<WorkRecord> {
  protected tableName = TableNames.WORK_RECORDS;

  constructor(database: Database) {
    super(database);
  }

  /**
   * 作業記録を作成
   */
  async create(params: CreateWorkRecordParams): Promise<WorkRecord> {
    return this.database.write(async () => {
      return this.collection.create((record) => {
        record.siteId = params.siteId || null;
        // @ts-ignore - WatermelonDBの日付型
        record._raw.recorded_at = (params.recordedAt || new Date()).getTime();
        record.voiceFileUrl = params.voiceFileUrl || null;
        record.voiceTranscript = params.voiceTranscript || null;
        // @ts-ignore - JSON型
        record._raw.extracted_data = params.extractedData
          ? JSON.stringify(params.extractedData)
          : null;
        // @ts-ignore
        record._raw.work_items = JSON.stringify(params.workItems || []);
        // @ts-ignore
        record._raw.materials = JSON.stringify(params.materials || []);
        // @ts-ignore
        record._raw.additional_work = JSON.stringify(params.additionalWork || []);
        record.workStartTime = params.workStartTime || null;
        record.workEndTime = params.workEndTime || null;
        record.notes = params.notes || null;
        record.status = params.status || 'draft';
        record.isSynced = false;
        // @ts-ignore
        record._raw.created_at = Date.now();
        // @ts-ignore
        record._raw.updated_at = Date.now();
      });
    });
  }

  /**
   * ステータスで絞り込み
   */
  async findByStatus(status: WorkRecordStatus): Promise<WorkRecord[]> {
    return this.collection
      .query(Q.where('status', status))
      .fetch();
  }

  /**
   * 下書きを取得
   */
  async findDrafts(): Promise<WorkRecord[]> {
    return this.findByStatus('draft');
  }

  /**
   * 現場IDで絞り込み
   */
  async findBySiteId(siteId: string): Promise<WorkRecord[]> {
    return this.collection
      .query(
        Q.where('site_id', siteId),
        Q.sortBy('recorded_at', Q.desc)
      )
      .fetch();
  }

  /**
   * 日付範囲で絞り込み
   */
  async findByDateRange(startDate: Date, endDate: Date): Promise<WorkRecord[]> {
    return this.collection
      .query(
        Q.where('recorded_at', Q.gte(startDate.getTime())),
        Q.where('recorded_at', Q.lte(endDate.getTime())),
        Q.sortBy('recorded_at', Q.desc)
      )
      .fetch();
  }

  /**
   * 今日の作業記録を取得
   */
  async findToday(): Promise<WorkRecord[]> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    return this.findByDateRange(today, tomorrow);
  }

  /**
   * 最新の作業記録を取得
   */
  async findRecent(limit: number = 10): Promise<WorkRecord[]> {
    return this.collection
      .query(Q.sortBy('recorded_at', Q.desc), Q.take(limit))
      .fetch();
  }

  /**
   * 作業記録を監視（リアルタイム更新）
   */
  observeRecent(limit: number = 20): Observable<WorkRecord[]> {
    return this.collection
      .query(Q.sortBy('recorded_at', Q.desc), Q.take(limit))
      .observe();
  }

  /**
   * ステータスを確定に変更
   */
  async confirm(id: string): Promise<WorkRecord | null> {
    return this.update(id, { status: 'confirmed' });
  }

  /**
   * 作業項目を更新
   */
  async updateWorkItems(id: string, workItems: WorkItem[]): Promise<WorkRecord | null> {
    const record = await this.findById(id);
    if (!record) return null;

    await this.database.write(async () => {
      await record.update((r) => {
        // @ts-ignore
        r._raw.work_items = JSON.stringify(workItems);
        r.isSynced = false;
        // @ts-ignore
        r._raw.updated_at = Date.now();
      });
    });

    return record;
  }
}
