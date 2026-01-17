/**
 * ItemTemplate Model
 * 品目テンプレート（よく使う作業項目と単価）
 */
import { Model } from '@nozbe/watermelondb';
import { field, text, date, readonly, json } from '@nozbe/watermelondb/decorators';
import { TableNames } from '../schema';

const sanitizeKeywords = (raw: unknown): string[] => {
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

export default class ItemTemplate extends Model {
  static table = TableNames.ITEM_TEMPLATES;

  // サーバー同期用ID
  @text('server_id') serverId!: string | null;

  // 品目情報
  @text('name') name!: string;
  @text('description') description!: string | null;
  @text('unit') unit!: string;
  @field('unit_price') unitPrice!: number;
  @field('tax_rate') taxRate!: number;
  @text('category') category!: string | null;

  // 音声認識マッチング用キーワード
  @json('keywords', sanitizeKeywords) keywords!: string[];

  // 表示順
  @field('sort_order') sortOrder!: number;

  // 有効フラグ
  @field('is_active') isActive!: boolean;

  // 同期フラグ
  @field('is_synced') isSynced!: boolean;

  // タイムスタンプ
  @readonly @date('created_at') createdAt!: Date;
  @date('updated_at') updatedAt!: Date;
}
