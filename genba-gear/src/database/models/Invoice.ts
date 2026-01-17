/**
 * Invoice Model
 * 請求書
 */
import { Model } from '@nozbe/watermelondb';
import { field, text, date, readonly, relation, json } from '@nozbe/watermelondb/decorators';
import { Relation } from '@nozbe/watermelondb';
import { TableNames } from '../schema';
import type Site from './Site';

// 請求書明細の型
export interface InvoiceItem {
  description: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  amount: number;
  taxRate: number;
}

// 税率別内訳の型
export interface TaxBreakdown {
  [rate: string]: number; // "10": 5000, "8": 800
}

export type InvoiceStatus = 'draft' | 'sent' | 'paid';

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

const sanitizeObject = (raw: unknown): Record<string, unknown> => {
  if (!raw) return {};
  if (typeof raw === 'object' && raw !== null) return raw as Record<string, unknown>;
  if (typeof raw === 'string') {
    try {
      return JSON.parse(raw);
    } catch {
      return {};
    }
  }
  return {};
};

export default class Invoice extends Model {
  static table = TableNames.INVOICES;

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

  // 請求書番号
  @text('invoice_number') invoiceNumber!: string;

  // 日付
  @date('issue_date') issueDate!: Date;
  @date('due_date') dueDate!: Date | null;

  // 明細
  @json('items', sanitizeArray) items!: InvoiceItem[];

  // 金額
  @field('subtotal') subtotal!: number;
  @field('tax_amount') taxAmount!: number;
  @field('total_amount') totalAmount!: number;

  // 税率別内訳
  @json('tax_breakdown', sanitizeObject) taxBreakdown!: TaxBreakdown;

  // ステータス
  @text('status') status!: InvoiceStatus;

  // 送付・支払日時
  @date('sent_at') sentAt!: Date | null;
  @date('paid_at') paidAt!: Date | null;

  // PDF
  @text('pdf_url') pdfUrl!: string | null;

  // 備考
  @text('notes') notes!: string | null;

  // 同期フラグ
  @field('is_synced') isSynced!: boolean;

  // タイムスタンプ
  @readonly @date('created_at') createdAt!: Date;
  @date('updated_at') updatedAt!: Date;
}
