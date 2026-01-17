/**
 * BaseRepository
 *
 * 共通のCRUD操作を提供する基底リポジトリ。
 * 各モデル用リポジトリはこれを継承して使用。
 */
import { Database, Model, Q, Query } from '@nozbe/watermelondb';
import { Observable } from 'rxjs';

export interface CreateParams<T> {
  [key: string]: unknown;
}

export interface UpdateParams {
  [key: string]: unknown;
}

export abstract class BaseRepository<T extends Model> {
  protected database: Database;
  protected abstract tableName: string;

  constructor(database: Database) {
    this.database = database;
  }

  /**
   * コレクションを取得
   */
  protected get collection() {
    return this.database.get<T>(this.tableName);
  }

  /**
   * IDで1件取得
   */
  async findById(id: string): Promise<T | null> {
    try {
      return await this.collection.find(id);
    } catch {
      return null;
    }
  }

  /**
   * 全件取得
   */
  async findAll(): Promise<T[]> {
    return this.collection.query().fetch();
  }

  /**
   * クエリビルダーを取得
   */
  query(): Query<T> {
    return this.collection.query();
  }

  /**
   * 件数を取得
   */
  async count(): Promise<number> {
    return this.collection.query().fetchCount();
  }

  /**
   * 新規作成（サブクラスで実装）
   */
  abstract create(params: unknown): Promise<T>;

  /**
   * 更新
   */
  async update(id: string, params: UpdateParams): Promise<T | null> {
    const record = await this.findById(id);
    if (!record) return null;

    await this.database.write(async () => {
      await record.update((r) => {
        Object.entries(params).forEach(([key, value]) => {
          // @ts-ignore - 動的にプロパティをセット
          r[key] = value;
        });
        // 更新フラグを立てる
        // @ts-ignore
        r.isSynced = false;
        // @ts-ignore
        r.updatedAt = new Date();
      });
    });

    return record;
  }

  /**
   * 削除（物理削除）
   */
  async delete(id: string): Promise<boolean> {
    const record = await this.findById(id);
    if (!record) return false;

    await this.database.write(async () => {
      await record.destroyPermanently();
    });

    return true;
  }

  /**
   * 論理削除（is_activeをfalseに）
   */
  async softDelete(id: string): Promise<boolean> {
    const record = await this.findById(id);
    if (!record) return false;

    await this.database.write(async () => {
      await record.update((r) => {
        // @ts-ignore
        r.isActive = false;
        // @ts-ignore
        r.isSynced = false;
        // @ts-ignore
        r.updatedAt = new Date();
      });
    });

    return true;
  }

  /**
   * Observable（リアクティブ）でデータを監視
   */
  observe(): Observable<T[]> {
    return this.collection.query().observe();
  }

  /**
   * 未同期のレコードを取得
   */
  async findUnsynced(): Promise<T[]> {
    return this.collection
      .query(Q.where('is_synced', false))
      .fetch();
  }

  /**
   * 同期済みとしてマーク
   */
  async markAsSynced(id: string, serverId: string): Promise<void> {
    const record = await this.findById(id);
    if (!record) return;

    await this.database.write(async () => {
      await record.update((r) => {
        // @ts-ignore
        r.serverId = serverId;
        // @ts-ignore
        r.isSynced = true;
      });
    });
  }
}
