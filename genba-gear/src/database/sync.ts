/**
 * WatermelonDB Sync Engine
 *
 * Supabaseとの双方向同期を行う。
 * - pullChanges: Supabaseから最新データを取得
 * - pushChanges: ローカルの変更をSupabaseにプッシュ
 */
import { synchronize } from '@nozbe/watermelondb/sync';
import { Database, Q } from '@nozbe/watermelondb';
import { supabase } from '../../services/supabase/client';
import { TableNames } from './schema';

// 同期対象のテーブル（voice_queueは同期しない）
const SYNC_TABLES = [
  TableNames.BUSINESS_PROFILES,
  TableNames.BANK_ACCOUNTS,
  TableNames.ITEM_TEMPLATES,
  TableNames.SITES,
  TableNames.WORK_RECORDS,
  TableNames.INVOICES,
  TableNames.DAILY_REPORTS,
] as const;

// 同期結果の型
export interface SyncResult {
  success: boolean;
  error?: string;
  pulledCount: number;
  pushedCount: number;
}

// Supabaseからのレスポンス型
interface PullResponse {
  changes: Record<string, {
    created: unknown[];
    updated: unknown[];
    deleted: string[];
  }>;
  timestamp: number;
}

/**
 * Last Write Winsで競合を解決
 */
function resolveConflict(local: { updated_at: string }, remote: { updated_at: string }): 'local' | 'remote' {
  const localTime = new Date(local.updated_at).getTime();
  const remoteTime = new Date(remote.updated_at).getTime();
  return remoteTime > localTime ? 'remote' : 'local';
}

/**
 * サーバーから変更を取得
 */
async function pullChanges(lastPulledAt: number | null): Promise<PullResponse> {
  const { data: session } = await supabase.auth.getSession();
  if (!session?.session?.user) {
    throw new Error('Not authenticated');
  }

  const userId = session.session.user.id;
  const timestamp = lastPulledAt ? new Date(lastPulledAt).toISOString() : null;
  const changes: PullResponse['changes'] = {};

  for (const tableName of SYNC_TABLES) {
    let query = supabase
      .from(tableName)
      .select('*')
      .eq('user_id', userId);

    if (timestamp) {
      query = query.gt('updated_at', timestamp);
    }

    const { data, error } = await query;

    if (error) {
      console.error(`Error pulling ${tableName}:`, error);
      continue;
    }

    // WatermelonDB形式に変換
    const created: unknown[] = [];
    const updated: unknown[] = [];

    for (const record of data || []) {
      const wmRecord = convertToWatermelonFormat(tableName, record);

      // lastPulledAtがnullの場合は全て新規
      if (!lastPulledAt) {
        created.push(wmRecord);
      } else {
        // created_atがlastPulledAt以降なら新規、そうでなければ更新
        const createdTime = new Date(record.created_at).getTime();
        if (createdTime > lastPulledAt) {
          created.push(wmRecord);
        } else {
          updated.push(wmRecord);
        }
      }
    }

    changes[tableName] = {
      created,
      updated,
      deleted: [], // 削除は後で実装
    };
  }

  return {
    changes,
    timestamp: Date.now(),
  };
}

/**
 * サーバーにデータを変換（Supabase -> WatermelonDB）
 */
function convertToWatermelonFormat(tableName: string, record: Record<string, unknown>): Record<string, unknown> {
  const base = {
    id: record.id as string,
    server_id: record.id as string,
    is_synced: true,
    created_at: new Date(record.created_at as string).getTime(),
    updated_at: new Date(record.updated_at as string).getTime(),
  };

  // テーブルごとの変換
  switch (tableName) {
    case TableNames.BUSINESS_PROFILES:
      return {
        ...base,
        business_name: record.business_name,
        representative_name: record.representative_name,
        postal_code: record.postal_code,
        address: record.address,
        phone: record.phone,
        email: record.email,
        invoice_registration_number: record.invoice_registration_number,
      };

    case TableNames.BANK_ACCOUNTS:
      return {
        ...base,
        bank_name: record.bank_name,
        branch_name: record.branch_name,
        account_type: record.account_type,
        account_number: record.account_number,
        account_holder: record.account_holder,
        is_default: record.is_default,
      };

    case TableNames.ITEM_TEMPLATES:
      return {
        ...base,
        name: record.name,
        description: record.description,
        unit: record.unit,
        unit_price: record.unit_price,
        tax_rate: record.tax_rate,
        category: record.category,
        keywords: JSON.stringify(record.keywords || []),
        sort_order: record.sort_order,
        is_active: record.is_active,
      };

    case TableNames.SITES:
      return {
        ...base,
        name: record.name,
        client_name: record.client_name,
        client_type: record.client_type,
        postal_code: record.postal_code,
        address: record.address,
        contact_name: record.contact_name,
        contact_phone: record.contact_phone,
        contact_email: record.contact_email,
        latitude: record.latitude,
        longitude: record.longitude,
        notes: record.notes,
        is_active: record.is_active,
      };

    case TableNames.WORK_RECORDS:
      return {
        ...base,
        site_id: record.site_id,
        recorded_at: new Date(record.recorded_at as string).getTime(),
        voice_file_url: record.voice_file_url,
        voice_transcript: record.voice_transcript,
        extracted_data: JSON.stringify(record.extracted_data),
        work_items: JSON.stringify(record.work_items || []),
        materials: JSON.stringify(record.materials || []),
        additional_work: JSON.stringify(record.additional_work || []),
        work_start_time: record.work_start_time,
        work_end_time: record.work_end_time,
        notes: record.notes,
        status: record.status,
      };

    case TableNames.INVOICES:
      return {
        ...base,
        site_id: record.site_id,
        work_record_id: record.work_record_id,
        invoice_number: record.invoice_number,
        issue_date: new Date(record.issue_date as string).getTime(),
        due_date: record.due_date ? new Date(record.due_date as string).getTime() : null,
        items: JSON.stringify(record.items || []),
        subtotal: record.subtotal,
        tax_amount: record.tax_amount,
        total_amount: record.total_amount,
        tax_breakdown: JSON.stringify(record.tax_breakdown || {}),
        status: record.status,
        sent_at: record.sent_at ? new Date(record.sent_at as string).getTime() : null,
        paid_at: record.paid_at ? new Date(record.paid_at as string).getTime() : null,
        pdf_url: record.pdf_url,
        notes: record.notes,
      };

    case TableNames.DAILY_REPORTS:
      return {
        ...base,
        site_id: record.site_id,
        work_record_id: record.work_record_id,
        report_date: new Date(record.report_date as string).getTime(),
        work_items: JSON.stringify(record.work_items || []),
        materials: JSON.stringify(record.materials || []),
        additional_work: JSON.stringify(record.additional_work || []),
        worker_name: record.worker_name,
        work_hours: record.work_hours,
        weather: record.weather,
        temperature: record.temperature,
        notes: record.notes,
        pdf_url: record.pdf_url,
      };

    default:
      return base;
  }
}

/**
 * ローカルの変更をサーバーにプッシュ
 */
async function pushChanges(
  changes: Record<string, { created: unknown[]; updated: unknown[]; deleted: string[] }>
): Promise<void> {
  const { data: session } = await supabase.auth.getSession();
  if (!session?.session?.user) {
    throw new Error('Not authenticated');
  }

  const userId = session.session.user.id;

  for (const [tableName, tableChanges] of Object.entries(changes)) {
    // 新規レコードの挿入
    if (tableChanges.created.length > 0) {
      const records = tableChanges.created.map((record) =>
        convertToSupabaseFormat(tableName, record as Record<string, unknown>, userId)
      );

      const { error } = await supabase.from(tableName).insert(records);
      if (error) {
        console.error(`Error pushing created ${tableName}:`, error);
      }
    }

    // 更新レコード
    for (const record of tableChanges.updated) {
      const supabaseRecord = convertToSupabaseFormat(
        tableName,
        record as Record<string, unknown>,
        userId
      );
      const serverId = (record as Record<string, unknown>).server_id as string;

      if (serverId) {
        const { error } = await supabase
          .from(tableName)
          .update(supabaseRecord)
          .eq('id', serverId);

        if (error) {
          console.error(`Error pushing updated ${tableName}:`, error);
        }
      }
    }

    // 削除（論理削除の場合はis_activeをfalseに）
    // 現在は物理削除を実装しない
  }
}

/**
 * WatermelonDBからSupabase形式に変換
 */
function convertToSupabaseFormat(
  tableName: string,
  record: Record<string, unknown>,
  userId: string
): Record<string, unknown> {
  const base: Record<string, unknown> = {
    user_id: userId,
    updated_at: new Date().toISOString(),
  };

  // server_idがあれば使用、なければ新規UUID
  if (record.server_id) {
    base.id = record.server_id;
  }

  switch (tableName) {
    case TableNames.BUSINESS_PROFILES:
      return {
        ...base,
        business_name: record.business_name,
        representative_name: record.representative_name,
        postal_code: record.postal_code,
        address: record.address,
        phone: record.phone,
        email: record.email,
        invoice_registration_number: record.invoice_registration_number,
      };

    case TableNames.BANK_ACCOUNTS:
      return {
        ...base,
        bank_name: record.bank_name,
        branch_name: record.branch_name,
        account_type: record.account_type,
        account_number: record.account_number,
        account_holder: record.account_holder,
        is_default: record.is_default,
      };

    case TableNames.ITEM_TEMPLATES:
      return {
        ...base,
        name: record.name,
        description: record.description,
        unit: record.unit,
        unit_price: record.unit_price,
        tax_rate: record.tax_rate,
        category: record.category,
        keywords: parseJsonField(record.keywords),
        sort_order: record.sort_order,
        is_active: record.is_active,
      };

    case TableNames.SITES:
      return {
        ...base,
        name: record.name,
        client_name: record.client_name,
        client_type: record.client_type,
        postal_code: record.postal_code,
        address: record.address,
        contact_name: record.contact_name,
        contact_phone: record.contact_phone,
        contact_email: record.contact_email,
        latitude: record.latitude,
        longitude: record.longitude,
        notes: record.notes,
        is_active: record.is_active,
      };

    case TableNames.WORK_RECORDS:
      return {
        ...base,
        site_id: record.site_id,
        recorded_at: new Date(record.recorded_at as number).toISOString(),
        voice_file_url: record.voice_file_url,
        voice_transcript: record.voice_transcript,
        extracted_data: parseJsonField(record.extracted_data),
        work_items: parseJsonField(record.work_items),
        materials: parseJsonField(record.materials),
        additional_work: parseJsonField(record.additional_work),
        work_start_time: record.work_start_time,
        work_end_time: record.work_end_time,
        notes: record.notes,
        status: record.status,
      };

    case TableNames.INVOICES:
      return {
        ...base,
        site_id: record.site_id,
        work_record_id: record.work_record_id,
        invoice_number: record.invoice_number,
        issue_date: new Date(record.issue_date as number).toISOString().split('T')[0],
        due_date: record.due_date
          ? new Date(record.due_date as number).toISOString().split('T')[0]
          : null,
        items: parseJsonField(record.items),
        subtotal: record.subtotal,
        tax_amount: record.tax_amount,
        total_amount: record.total_amount,
        tax_breakdown: parseJsonField(record.tax_breakdown),
        status: record.status,
        sent_at: record.sent_at ? new Date(record.sent_at as number).toISOString() : null,
        paid_at: record.paid_at ? new Date(record.paid_at as number).toISOString() : null,
        pdf_url: record.pdf_url,
        notes: record.notes,
      };

    case TableNames.DAILY_REPORTS:
      return {
        ...base,
        site_id: record.site_id,
        work_record_id: record.work_record_id,
        report_date: new Date(record.report_date as number).toISOString().split('T')[0],
        work_items: parseJsonField(record.work_items),
        materials: parseJsonField(record.materials),
        additional_work: parseJsonField(record.additional_work),
        worker_name: record.worker_name,
        work_hours: record.work_hours,
        weather: record.weather,
        temperature: record.temperature,
        notes: record.notes,
        pdf_url: record.pdf_url,
      };

    default:
      return base;
  }
}

/**
 * JSONフィールドをパース
 */
function parseJsonField(value: unknown): unknown {
  if (typeof value === 'string') {
    try {
      return JSON.parse(value);
    } catch {
      return value;
    }
  }
  return value;
}

/**
 * データベースを同期
 */
export async function syncDatabase(database: Database): Promise<SyncResult> {
  let pulledCount = 0;
  let pushedCount = 0;

  try {
    await synchronize({
      database,
      pullChanges: async ({ lastPulledAt }) => {
        const result = await pullChanges(lastPulledAt ?? null);

        // プルした件数をカウント
        for (const tableChanges of Object.values(result.changes)) {
          pulledCount += tableChanges.created.length + tableChanges.updated.length;
        }

        return result;
      },
      pushChanges: async ({ changes }) => {
        // プッシュした件数をカウント
        for (const tableChanges of Object.values(changes) as Array<{
          created: unknown[];
          updated: unknown[];
          deleted: string[];
        }>) {
          pushedCount +=
            tableChanges.created.length +
            tableChanges.updated.length +
            tableChanges.deleted.length;
        }

        await pushChanges(changes);
      },
      migrationsEnabledAtVersion: 1,
    });

    return {
      success: true,
      pulledCount,
      pushedCount,
    };
  } catch (error) {
    console.error('Sync failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown sync error',
      pulledCount,
      pushedCount,
    };
  }
}

/**
 * 同期が必要かどうかを確認
 */
export async function hasPendingChanges(database: Database): Promise<boolean> {
  for (const tableName of SYNC_TABLES) {
    const count = await database
      .get(tableName)
      .query(Q.where('is_synced', false))
      .fetchCount();

    if (count > 0) {
      return true;
    }
  }
  return false;
}
