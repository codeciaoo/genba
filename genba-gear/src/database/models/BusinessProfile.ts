/**
 * BusinessProfile Model
 * 事業者情報（屋号、インボイス番号など）
 */
import { Model } from '@nozbe/watermelondb';
import { field, text, date, readonly } from '@nozbe/watermelondb/decorators';
import { TableNames } from '../schema';

export default class BusinessProfile extends Model {
  static table = TableNames.BUSINESS_PROFILES;

  // サーバー同期用ID
  @text('server_id') serverId!: string | null;

  // 事業者情報
  @text('business_name') businessName!: string;
  @text('representative_name') representativeName!: string | null;
  @text('postal_code') postalCode!: string | null;
  @text('address') address!: string | null;
  @text('phone') phone!: string | null;
  @text('email') email!: string | null;

  // インボイス制度対応
  @text('invoice_registration_number') invoiceRegistrationNumber!: string | null;

  // 同期フラグ
  @field('is_synced') isSynced!: boolean;

  // タイムスタンプ
  @readonly @date('created_at') createdAt!: Date;
  @date('updated_at') updatedAt!: Date;
}
