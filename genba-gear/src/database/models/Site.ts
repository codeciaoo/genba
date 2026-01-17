/**
 * Site Model
 * 現場/顧客情報
 */
import { Model } from '@nozbe/watermelondb';
import { field, text, date, readonly, children } from '@nozbe/watermelondb/decorators';
import { TableNames } from '../schema';
import type WorkRecord from './WorkRecord';
import type Invoice from './Invoice';
import type DailyReport from './DailyReport';

export type ClientType = 'individual' | 'company';

export default class Site extends Model {
  static table = TableNames.SITES;

  static associations = {
    work_records: { type: 'has_many' as const, foreignKey: 'site_id' },
    invoices: { type: 'has_many' as const, foreignKey: 'site_id' },
    daily_reports: { type: 'has_many' as const, foreignKey: 'site_id' },
  };

  // サーバー同期用ID
  @text('server_id') serverId!: string | null;

  // 現場情報
  @text('name') name!: string;
  @text('client_name') clientName!: string | null;
  @text('client_type') clientType!: ClientType;

  // 住所情報
  @text('postal_code') postalCode!: string | null;
  @text('address') address!: string | null;

  // 連絡先
  @text('contact_name') contactName!: string | null;
  @text('contact_phone') contactPhone!: string | null;
  @text('contact_email') contactEmail!: string | null;

  // GPS
  @field('latitude') latitude!: number | null;
  @field('longitude') longitude!: number | null;

  // 備考
  @text('notes') notes!: string | null;

  // 有効フラグ
  @field('is_active') isActive!: boolean;

  // 同期フラグ
  @field('is_synced') isSynced!: boolean;

  // タイムスタンプ
  @readonly @date('created_at') createdAt!: Date;
  @date('updated_at') updatedAt!: Date;

  // リレーション
  @children('work_records') workRecords!: WorkRecord[];
  @children('invoices') invoices!: Invoice[];
  @children('daily_reports') dailyReports!: DailyReport[];
}
