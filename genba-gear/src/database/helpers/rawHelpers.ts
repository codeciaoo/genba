/**
 * WatermelonDB _raw アクセスヘルパー
 *
 * _rawへのアクセスを型安全に行うためのヘルパー関数群。
 * Model._raw はprivate扱いだが、create/update内でのセットは許容される。
 */
import { Model } from '@nozbe/watermelondb';

// _raw の型（任意のフィールドにアクセス可能）
type RawData = Record<string, unknown>;

/**
 * _raw を取得
 */
export function getRaw<T extends Model>(model: T): RawData {
  return (model as unknown as { _raw: RawData })._raw;
}

/**
 * _raw に数値（timestamp）をセット
 */
export function setRawTimestamp<T extends Model>(
  model: T,
  field: string,
  value: Date | number | null
): void {
  const raw = getRaw(model);
  if (value === null) {
    raw[field] = null;
  } else if (value instanceof Date) {
    raw[field] = value.getTime();
  } else {
    raw[field] = value;
  }
}

/**
 * _raw にJSON文字列をセット
 */
export function setRawJson<T extends Model>(
  model: T,
  field: string,
  value: unknown
): void {
  const raw = getRaw(model);
  raw[field] = value !== undefined && value !== null ? JSON.stringify(value) : null;
}

/**
 * created_at, updated_at をセット（作成時用）
 */
export function setCreatedTimestamps<T extends Model>(model: T): void {
  const now = Date.now();
  const raw = getRaw(model);
  raw.created_at = now;
  raw.updated_at = now;
}

/**
 * updated_at をセット（更新時用）
 */
export function setUpdatedTimestamp<T extends Model>(model: T): void {
  const raw = getRaw(model);
  raw.updated_at = Date.now();
}

/**
 * 同期フラグをセット
 */
export function setSyncFlags<T extends Model>(
  model: T,
  options: { isSynced?: boolean; serverId?: string }
): void {
  const raw = getRaw(model);
  if (options.isSynced !== undefined) {
    raw.is_synced = options.isSynced;
  }
  if (options.serverId !== undefined) {
    raw.server_id = options.serverId;
  }
}
