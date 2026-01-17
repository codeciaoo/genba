/**
 * WatermelonDB Schema Definition
 *
 * オフラインファーストのローカルDBスキーマ。
 * Supabaseとの同期用にserver_idとis_syncedフィールドを持つ。
 */
import { appSchema, tableSchema } from '@nozbe/watermelondb';

export const schema = appSchema({
  version: 1,
  tables: [
    // 事業者情報
    tableSchema({
      name: 'business_profiles',
      columns: [
        { name: 'server_id', type: 'string', isOptional: true },
        { name: 'business_name', type: 'string' },
        { name: 'representative_name', type: 'string', isOptional: true },
        { name: 'postal_code', type: 'string', isOptional: true },
        { name: 'address', type: 'string', isOptional: true },
        { name: 'phone', type: 'string', isOptional: true },
        { name: 'email', type: 'string', isOptional: true },
        { name: 'invoice_registration_number', type: 'string', isOptional: true },
        { name: 'is_synced', type: 'boolean' },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
      ],
    }),

    // 振込先
    tableSchema({
      name: 'bank_accounts',
      columns: [
        { name: 'server_id', type: 'string', isOptional: true },
        { name: 'bank_name', type: 'string' },
        { name: 'branch_name', type: 'string' },
        { name: 'account_type', type: 'string' },
        { name: 'account_number', type: 'string' },
        { name: 'account_holder', type: 'string' },
        { name: 'is_default', type: 'boolean' },
        { name: 'is_synced', type: 'boolean' },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
      ],
    }),

    // 品目テンプレート
    tableSchema({
      name: 'item_templates',
      columns: [
        { name: 'server_id', type: 'string', isOptional: true },
        { name: 'name', type: 'string' },
        { name: 'description', type: 'string', isOptional: true },
        { name: 'unit', type: 'string' },
        { name: 'unit_price', type: 'number' },
        { name: 'tax_rate', type: 'number' },
        { name: 'category', type: 'string', isOptional: true },
        { name: 'keywords', type: 'string' }, // JSON array
        { name: 'sort_order', type: 'number' },
        { name: 'is_active', type: 'boolean' },
        { name: 'is_synced', type: 'boolean' },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
      ],
    }),

    // 現場/顧客
    tableSchema({
      name: 'sites',
      columns: [
        { name: 'server_id', type: 'string', isOptional: true },
        { name: 'name', type: 'string' },
        { name: 'client_name', type: 'string', isOptional: true },
        { name: 'client_type', type: 'string' },
        { name: 'postal_code', type: 'string', isOptional: true },
        { name: 'address', type: 'string', isOptional: true },
        { name: 'contact_name', type: 'string', isOptional: true },
        { name: 'contact_phone', type: 'string', isOptional: true },
        { name: 'contact_email', type: 'string', isOptional: true },
        { name: 'latitude', type: 'number', isOptional: true },
        { name: 'longitude', type: 'number', isOptional: true },
        { name: 'notes', type: 'string', isOptional: true },
        { name: 'is_active', type: 'boolean' },
        { name: 'is_synced', type: 'boolean' },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
      ],
    }),

    // 作業記録
    tableSchema({
      name: 'work_records',
      columns: [
        { name: 'server_id', type: 'string', isOptional: true },
        { name: 'site_id', type: 'string', isIndexed: true, isOptional: true },
        { name: 'recorded_at', type: 'number', isIndexed: true },
        { name: 'voice_file_url', type: 'string', isOptional: true },
        { name: 'voice_transcript', type: 'string', isOptional: true },
        { name: 'extracted_data', type: 'string', isOptional: true }, // JSON
        { name: 'work_items', type: 'string' }, // JSON
        { name: 'materials', type: 'string' }, // JSON
        { name: 'additional_work', type: 'string' }, // JSON
        { name: 'work_start_time', type: 'string', isOptional: true },
        { name: 'work_end_time', type: 'string', isOptional: true },
        { name: 'notes', type: 'string', isOptional: true },
        { name: 'status', type: 'string' },
        { name: 'is_synced', type: 'boolean' },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
      ],
    }),

    // 請求書
    tableSchema({
      name: 'invoices',
      columns: [
        { name: 'server_id', type: 'string', isOptional: true },
        { name: 'site_id', type: 'string', isIndexed: true, isOptional: true },
        { name: 'work_record_id', type: 'string', isOptional: true },
        { name: 'invoice_number', type: 'string' },
        { name: 'issue_date', type: 'number', isIndexed: true },
        { name: 'due_date', type: 'number', isOptional: true },
        { name: 'items', type: 'string' }, // JSON
        { name: 'subtotal', type: 'number' },
        { name: 'tax_amount', type: 'number' },
        { name: 'total_amount', type: 'number' },
        { name: 'tax_breakdown', type: 'string' }, // JSON
        { name: 'status', type: 'string', isIndexed: true },
        { name: 'sent_at', type: 'number', isOptional: true },
        { name: 'paid_at', type: 'number', isOptional: true },
        { name: 'pdf_url', type: 'string', isOptional: true },
        { name: 'notes', type: 'string', isOptional: true },
        { name: 'is_synced', type: 'boolean' },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
      ],
    }),

    // 日報
    tableSchema({
      name: 'daily_reports',
      columns: [
        { name: 'server_id', type: 'string', isOptional: true },
        { name: 'site_id', type: 'string', isIndexed: true, isOptional: true },
        { name: 'work_record_id', type: 'string', isOptional: true },
        { name: 'report_date', type: 'number', isIndexed: true },
        { name: 'work_items', type: 'string' }, // JSON
        { name: 'materials', type: 'string' }, // JSON
        { name: 'additional_work', type: 'string' }, // JSON
        { name: 'worker_name', type: 'string', isOptional: true },
        { name: 'work_hours', type: 'number', isOptional: true },
        { name: 'weather', type: 'string', isOptional: true },
        { name: 'temperature', type: 'number', isOptional: true },
        { name: 'notes', type: 'string', isOptional: true },
        { name: 'pdf_url', type: 'string', isOptional: true },
        { name: 'is_synced', type: 'boolean' },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
      ],
    }),

    // 音声処理キュー（オフライン時の音声処理待ち行列）
    tableSchema({
      name: 'voice_queue',
      columns: [
        { name: 'audio_uri', type: 'string' },
        { name: 'metadata', type: 'string' }, // JSON
        { name: 'status', type: 'string' }, // pending/processing/completed/failed
        { name: 'error_message', type: 'string', isOptional: true },
        { name: 'retry_count', type: 'number' },
        { name: 'created_at', type: 'number' },
      ],
    }),
  ],
});

// テーブル名の定数
export const TableNames = {
  BUSINESS_PROFILES: 'business_profiles',
  BANK_ACCOUNTS: 'bank_accounts',
  ITEM_TEMPLATES: 'item_templates',
  SITES: 'sites',
  WORK_RECORDS: 'work_records',
  INVOICES: 'invoices',
  DAILY_REPORTS: 'daily_reports',
  VOICE_QUEUE: 'voice_queue',
} as const;

export type TableName = (typeof TableNames)[keyof typeof TableNames];
