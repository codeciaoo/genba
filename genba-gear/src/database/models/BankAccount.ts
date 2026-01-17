/**
 * BankAccount Model
 * 振込先口座情報
 */
import { Model } from '@nozbe/watermelondb';
import { field, text, date, readonly } from '@nozbe/watermelondb/decorators';
import { TableNames } from '../schema';

export default class BankAccount extends Model {
  static table = TableNames.BANK_ACCOUNTS;

  // サーバー同期用ID
  @text('server_id') serverId!: string | null;

  // 銀行情報
  @text('bank_name') bankName!: string;
  @text('branch_name') branchName!: string;
  @text('account_type') accountType!: '普通' | '当座';
  @text('account_number') accountNumber!: string;
  @text('account_holder') accountHolder!: string;

  // デフォルト口座フラグ
  @field('is_default') isDefault!: boolean;

  // 同期フラグ
  @field('is_synced') isSynced!: boolean;

  // タイムスタンプ
  @readonly @date('created_at') createdAt!: Date;
  @date('updated_at') updatedAt!: Date;
}
