/**
 * InvoiceRepository
 *
 * 請求書データのCRUD操作を提供。
 */
import { Database, Q } from '@nozbe/watermelondb';
import { Observable } from 'rxjs';
import { BaseRepository } from './BaseRepository';
import Invoice, { InvoiceItem, TaxBreakdown, InvoiceStatus } from '../models/Invoice';
import { TableNames } from '../schema';
import {
  setRawTimestamp,
  setRawJson,
  setCreatedTimestamps,
  setUpdatedTimestamp,
  getRaw,
} from '../helpers/rawHelpers';

export interface CreateInvoiceParams {
  siteId?: string;
  workRecordId?: string;
  invoiceNumber: string;
  issueDate: Date;
  dueDate?: Date;
  items: InvoiceItem[];
  subtotal: number;
  taxAmount: number;
  totalAmount: number;
  taxBreakdown?: TaxBreakdown;
  notes?: string;
}

export interface UpdateInvoiceParams {
  siteId?: string;
  dueDate?: Date;
  items?: InvoiceItem[];
  subtotal?: number;
  taxAmount?: number;
  totalAmount?: number;
  taxBreakdown?: TaxBreakdown;
  status?: InvoiceStatus;
  notes?: string;
  pdfUrl?: string;
}

export class InvoiceRepository extends BaseRepository<Invoice> {
  protected tableName = TableNames.INVOICES;

  constructor(database: Database) {
    super(database);
  }

  /**
   * 請求書を作成
   */
  async create(params: CreateInvoiceParams): Promise<Invoice> {
    return this.database.write(async () => {
      return this.collection.create((invoice) => {
        invoice.siteId = params.siteId || null;
        invoice.workRecordId = params.workRecordId || null;
        invoice.invoiceNumber = params.invoiceNumber;
        setRawTimestamp(invoice, 'issue_date', params.issueDate);
        setRawTimestamp(invoice, 'due_date', params.dueDate || null);
        setRawJson(invoice, 'items', params.items);
        invoice.subtotal = params.subtotal;
        invoice.taxAmount = params.taxAmount;
        invoice.totalAmount = params.totalAmount;
        setRawJson(invoice, 'tax_breakdown', params.taxBreakdown || {});
        invoice.status = 'draft';
        setRawTimestamp(invoice, 'sent_at', null);
        setRawTimestamp(invoice, 'paid_at', null);
        invoice.pdfUrl = null;
        invoice.notes = params.notes || null;
        invoice.isSynced = false;
        setCreatedTimestamps(invoice);
      });
    });
  }

  /**
   * ステータスで絞り込み
   */
  async findByStatus(status: InvoiceStatus): Promise<Invoice[]> {
    return this.collection
      .query(
        Q.where('status', status),
        Q.sortBy('issue_date', Q.desc)
      )
      .fetch();
  }

  /**
   * 下書きを取得
   */
  async findDrafts(): Promise<Invoice[]> {
    return this.findByStatus('draft');
  }

  /**
   * 送付済みを取得
   */
  async findSent(): Promise<Invoice[]> {
    return this.findByStatus('sent');
  }

  /**
   * 支払済みを取得
   */
  async findPaid(): Promise<Invoice[]> {
    return this.findByStatus('paid');
  }

  /**
   * 現場IDで検索
   */
  async findBySiteId(siteId: string): Promise<Invoice[]> {
    return this.collection
      .query(
        Q.where('site_id', siteId),
        Q.sortBy('issue_date', Q.desc)
      )
      .fetch();
  }

  /**
   * 請求書番号で検索
   */
  async findByInvoiceNumber(invoiceNumber: string): Promise<Invoice | null> {
    const results = await this.collection
      .query(Q.where('invoice_number', invoiceNumber))
      .fetch();
    return results.length > 0 ? results[0] : null;
  }

  /**
   * 日付範囲で検索
   */
  async findByDateRange(startDate: Date, endDate: Date): Promise<Invoice[]> {
    return this.collection
      .query(
        Q.where('issue_date', Q.gte(startDate.getTime())),
        Q.where('issue_date', Q.lte(endDate.getTime())),
        Q.sortBy('issue_date', Q.desc)
      )
      .fetch();
  }

  /**
   * 今月の請求書を取得
   */
  async findThisMonth(): Promise<Invoice[]> {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    return this.findByDateRange(startOfMonth, endOfMonth);
  }

  /**
   * 最新の請求書を取得
   */
  async findRecent(limit: number = 10): Promise<Invoice[]> {
    return this.collection
      .query(Q.sortBy('issue_date', Q.desc), Q.take(limit))
      .fetch();
  }

  /**
   * 請求書を監視（リアルタイム更新）
   */
  observeRecent(limit: number = 20): Observable<Invoice[]> {
    return this.collection
      .query(Q.sortBy('issue_date', Q.desc), Q.take(limit))
      .observe();
  }

  /**
   * 送付済みにする
   */
  async markAsSent(id: string): Promise<Invoice | null> {
    const invoice = await this.findById(id);
    if (!invoice) return null;

    await this.database.write(async () => {
      await invoice.update((inv) => {
        inv.status = 'sent';
        setRawTimestamp(inv, 'sent_at', Date.now());
        inv.isSynced = false;
        setUpdatedTimestamp(inv);
      });
    });

    return invoice;
  }

  /**
   * 支払済みにする
   */
  async markAsPaid(id: string): Promise<Invoice | null> {
    const invoice = await this.findById(id);
    if (!invoice) return null;

    await this.database.write(async () => {
      await invoice.update((inv) => {
        inv.status = 'paid';
        setRawTimestamp(inv, 'paid_at', Date.now());
        inv.isSynced = false;
        setUpdatedTimestamp(inv);
      });
    });

    return invoice;
  }

  /**
   * 次の請求書番号を生成
   * フォーマット: INV-YYYY-NNNN
   */
  async generateNextInvoiceNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `INV-${year}-`;

    // 今年の請求書を取得
    const thisYearInvoices = await this.collection
      .query(Q.where('invoice_number', Q.like(`${prefix}%`)))
      .fetch();

    let maxNumber = 0;
    for (const invoice of thisYearInvoices) {
      const numPart = invoice.invoiceNumber.replace(prefix, '');
      const num = parseInt(numPart, 10);
      if (!isNaN(num) && num > maxNumber) {
        maxNumber = num;
      }
    }

    const nextNumber = (maxNumber + 1).toString().padStart(4, '0');
    return `${prefix}${nextNumber}`;
  }

  /**
   * PDF URLを設定
   */
  async setPdfUrl(id: string, pdfUrl: string): Promise<Invoice | null> {
    return this.update(id, { pdfUrl });
  }
}
