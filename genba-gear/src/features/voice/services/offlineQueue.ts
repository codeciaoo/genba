/**
 * Offline Queue Service
 * オフライン時の音声処理キュー管理
 */
import { Database, Q } from '@nozbe/watermelondb';
import VoiceQueue, { VoiceQueueMetadata, VoiceQueueStatus } from '@/database/models/VoiceQueue';
import { TableNames } from '@/database/schema';
import { GPSLocation } from '../types';

export class OfflineQueueService {
  private database: Database;

  constructor(database: Database) {
    this.database = database;
  }

  private get collection() {
    return this.database.get<VoiceQueue>(TableNames.VOICE_QUEUE);
  }

  /**
   * オフラインキューに音声を追加
   */
  async enqueue(
    audioUri: string,
    metadata: { siteId?: string; siteName?: string; location?: GPSLocation }
  ): Promise<VoiceQueue> {
    return this.database.write(async () => {
      return this.collection.create((record) => {
        record.audioUri = audioUri;
        // @ts-ignore - JSON型
        record._raw.metadata = JSON.stringify({
          siteId: metadata.siteId,
          siteName: metadata.siteName,
          recordedAt: Date.now(),
          location: metadata.location,
        });
        record.status = 'pending';
        record.errorMessage = null;
        record.retryCount = 0;
        // @ts-ignore
        record._raw.created_at = Date.now();
      });
    });
  }

  /**
   * 処理待ちのキューを取得
   */
  async getPendingItems(): Promise<VoiceQueue[]> {
    return this.collection
      .query(
        Q.where('status', 'pending'),
        Q.sortBy('created_at', Q.asc)
      )
      .fetch();
  }

  /**
   * 失敗したキューを取得（リトライ対象）
   */
  async getFailedItems(maxRetryCount: number = 3): Promise<VoiceQueue[]> {
    return this.collection
      .query(
        Q.where('status', 'failed'),
        Q.where('retry_count', Q.lt(maxRetryCount)),
        Q.sortBy('created_at', Q.asc)
      )
      .fetch();
  }

  /**
   * キューのステータスを更新
   */
  async updateStatus(
    id: string,
    status: VoiceQueueStatus,
    errorMessage?: string
  ): Promise<void> {
    const item = await this.collection.find(id);
    await this.database.write(async () => {
      await item.update((record) => {
        record.status = status;
        record.errorMessage = errorMessage || null;
        if (status === 'failed') {
          record.retryCount = record.retryCount + 1;
        }
      });
    });
  }

  /**
   * 処理開始をマーク
   */
  async markProcessing(id: string): Promise<void> {
    await this.updateStatus(id, 'processing');
  }

  /**
   * 処理完了をマーク
   */
  async markCompleted(id: string): Promise<void> {
    await this.updateStatus(id, 'completed');
  }

  /**
   * 処理失敗をマーク
   */
  async markFailed(id: string, errorMessage: string): Promise<void> {
    await this.updateStatus(id, 'failed', errorMessage);
  }

  /**
   * キューから削除
   */
  async remove(id: string): Promise<void> {
    const item = await this.collection.find(id);
    await this.database.write(async () => {
      await item.destroyPermanently();
    });
  }

  /**
   * 完了したキューをクリーンアップ
   */
  async cleanupCompleted(): Promise<number> {
    const completed = await this.collection
      .query(Q.where('status', 'completed'))
      .fetch();

    await this.database.write(async () => {
      for (const item of completed) {
        await item.destroyPermanently();
      }
    });

    return completed.length;
  }

  /**
   * キューの件数を取得
   */
  async getQueueCounts(): Promise<{
    pending: number;
    processing: number;
    failed: number;
    completed: number;
  }> {
    const [pending, processing, failed, completed] = await Promise.all([
      this.collection.query(Q.where('status', 'pending')).fetchCount(),
      this.collection.query(Q.where('status', 'processing')).fetchCount(),
      this.collection.query(Q.where('status', 'failed')).fetchCount(),
      this.collection.query(Q.where('status', 'completed')).fetchCount(),
    ]);

    return { pending, processing, failed, completed };
  }
}
