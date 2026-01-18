/**
 * DailyReportRepository
 *
 * 日報データのCRUD操作を提供。
 */
import { Database, Q } from '@nozbe/watermelondb';
import { Observable } from 'rxjs';
import { BaseRepository } from './BaseRepository';
import DailyReport from '../models/DailyReport';
import { WorkItem, Material } from '../models/WorkRecord';
import { TableNames } from '../schema';
import {
  setRawTimestamp,
  setRawJson,
  setCreatedTimestamps,
} from '../helpers/rawHelpers';

export interface CreateDailyReportParams {
  siteId?: string;
  workRecordId?: string;
  reportDate: Date;
  workItems: WorkItem[];
  materials?: Material[];
  additionalWork?: WorkItem[];
  workerName?: string;
  workHours?: number;
  weather?: string;
  temperature?: number;
  notes?: string;
}

export interface UpdateDailyReportParams {
  siteId?: string;
  workItems?: WorkItem[];
  materials?: Material[];
  additionalWork?: WorkItem[];
  workerName?: string;
  workHours?: number;
  weather?: string;
  temperature?: number;
  notes?: string;
  pdfUrl?: string;
}

export class DailyReportRepository extends BaseRepository<DailyReport> {
  protected tableName = TableNames.DAILY_REPORTS;

  constructor(database: Database) {
    super(database);
  }

  /**
   * 日報を作成
   */
  async create(params: CreateDailyReportParams): Promise<DailyReport> {
    return this.database.write(async () => {
      return this.collection.create((report) => {
        report.siteId = params.siteId || null;
        report.workRecordId = params.workRecordId || null;
        setRawTimestamp(report, 'report_date', params.reportDate);
        setRawJson(report, 'work_items', params.workItems);
        setRawJson(report, 'materials', params.materials || []);
        setRawJson(report, 'additional_work', params.additionalWork || []);
        report.workerName = params.workerName || null;
        report.workHours = params.workHours || null;
        report.weather = params.weather || null;
        report.temperature = params.temperature || null;
        report.notes = params.notes || null;
        report.pdfUrl = null;
        report.isSynced = false;
        setCreatedTimestamps(report);
      });
    });
  }

  /**
   * 日付で検索
   */
  async findByDate(date: Date): Promise<DailyReport[]> {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    return this.collection
      .query(
        Q.where('report_date', Q.gte(startOfDay.getTime())),
        Q.where('report_date', Q.lte(endOfDay.getTime()))
      )
      .fetch();
  }

  /**
   * 現場IDで検索
   */
  async findBySiteId(siteId: string): Promise<DailyReport[]> {
    return this.collection
      .query(
        Q.where('site_id', siteId),
        Q.sortBy('report_date', Q.desc)
      )
      .fetch();
  }

  /**
   * 作業記録IDで検索
   */
  async findByWorkRecordId(workRecordId: string): Promise<DailyReport | null> {
    const results = await this.collection
      .query(Q.where('work_record_id', workRecordId))
      .fetch();
    return results.length > 0 ? results[0] : null;
  }

  /**
   * 日付範囲で検索
   */
  async findByDateRange(startDate: Date, endDate: Date): Promise<DailyReport[]> {
    return this.collection
      .query(
        Q.where('report_date', Q.gte(startDate.getTime())),
        Q.where('report_date', Q.lte(endDate.getTime())),
        Q.sortBy('report_date', Q.desc)
      )
      .fetch();
  }

  /**
   * 今月の日報を取得
   */
  async findThisMonth(): Promise<DailyReport[]> {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    return this.findByDateRange(startOfMonth, endOfMonth);
  }

  /**
   * 最新の日報を取得
   */
  async findRecent(limit: number = 10): Promise<DailyReport[]> {
    return this.collection
      .query(Q.sortBy('report_date', Q.desc), Q.take(limit))
      .fetch();
  }

  /**
   * 日報を監視（リアルタイム更新）
   */
  observeRecent(limit: number = 20): Observable<DailyReport[]> {
    return this.collection
      .query(Q.sortBy('report_date', Q.desc), Q.take(limit))
      .observe();
  }

  /**
   * PDF URLを設定
   */
  async setPdfUrl(id: string, pdfUrl: string): Promise<DailyReport | null> {
    return this.update(id, { pdfUrl });
  }
}
