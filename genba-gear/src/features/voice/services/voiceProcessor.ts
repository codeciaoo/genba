/**
 * Voice Processor Service
 * 音声処理の全体フローを管理
 */
import { Database } from '@nozbe/watermelondb';
import * as Network from 'expo-network';
import { processVoiceToStructuredData } from '@/services/openai';
import { getCurrentLocation } from '@/services/location';
import { getWeather } from '@/services/weather';
import { WorkRecordRepository } from '@/database/repositories/WorkRecordRepository';
import { OfflineQueueService } from './offlineQueue';
import {
  VoiceProcessingResult,
  GPSLocation,
  WeatherData,
  StructuredWorkData,
} from '../types';

export class VoiceProcessorService {
  private database: Database;
  private workRecordRepository: WorkRecordRepository;
  private offlineQueue: OfflineQueueService;

  constructor(database: Database) {
    this.database = database;
    this.workRecordRepository = new WorkRecordRepository(database);
    this.offlineQueue = new OfflineQueueService(database);
  }

  /**
   * 音声ファイルを処理して作業記録を作成
   */
  async processVoiceInput(audioUri: string): Promise<VoiceProcessingResult> {
    try {
      // ネットワーク状態を確認
      const networkState = await Network.getNetworkStateAsync();
      const isOnline = networkState.isConnected && networkState.isInternetReachable;

      if (!isOnline) {
        // オフライン時はキューに追加
        const location = await getCurrentLocation();
        await this.offlineQueue.enqueue(audioUri, { location: location || undefined });
        return {
          success: false,
          queued: true,
          error: 'オフラインのため、キューに追加しました',
        };
      }

      // 1. GPS位置情報を並行取得開始
      const locationPromise = getCurrentLocation();

      // 2. 音声を処理（文字起こし + 構造化）
      const { transcript, structuredData } = await processVoiceToStructuredData(audioUri);

      // 3. GPS/天気取得
      const location = await locationPromise;
      let weather: WeatherData | null = null;

      if (location) {
        weather = await getWeather(location.latitude, location.longitude);
      }

      // 4. 作業記録を作成
      const workRecord = await this.createWorkRecord(
        audioUri,
        transcript,
        structuredData,
        location,
        weather
      );

      return {
        success: true,
        workRecordId: workRecord.id,
        transcript,
        structuredData,
        location: location || undefined,
        weather: weather || undefined,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '不明なエラー';

      // ネットワークエラーの場合はキューに追加
      if (this.isNetworkError(error)) {
        const location = await getCurrentLocation();
        await this.offlineQueue.enqueue(audioUri, { location: location || undefined });
        return {
          success: false,
          queued: true,
          error: 'ネットワークエラーのため、キューに追加しました',
        };
      }

      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * オフラインキューの処理
   */
  async processOfflineQueue(): Promise<{
    processed: number;
    failed: number;
  }> {
    const networkState = await Network.getNetworkStateAsync();
    if (!networkState.isConnected || !networkState.isInternetReachable) {
      return { processed: 0, failed: 0 };
    }

    const pendingItems = await this.offlineQueue.getPendingItems();
    const failedItems = await this.offlineQueue.getFailedItems();
    const allItems = [...pendingItems, ...failedItems];

    let processed = 0;
    let failed = 0;

    for (const item of allItems) {
      try {
        await this.offlineQueue.markProcessing(item.id);

        const result = await this.processVoiceInput(item.audioUri);

        if (result.success) {
          await this.offlineQueue.markCompleted(item.id);
          processed++;
        } else if (!result.queued) {
          await this.offlineQueue.markFailed(item.id, result.error || '処理に失敗しました');
          failed++;
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : '不明なエラー';
        await this.offlineQueue.markFailed(item.id, errorMessage);
        failed++;
      }
    }

    // 完了したキューをクリーンアップ
    await this.offlineQueue.cleanupCompleted();

    return { processed, failed };
  }

  /**
   * 作業記録を作成
   */
  private async createWorkRecord(
    audioUri: string,
    transcript: string,
    structuredData: StructuredWorkData,
    location: GPSLocation | null,
    weather: WeatherData | null
  ) {
    return this.workRecordRepository.create({
      voiceFileUrl: audioUri,
      voiceTranscript: transcript,
      extractedData: {
        siteName: structuredData.location,
        workItems: structuredData.tasks.map((task) => ({
          description: task.description,
          details: '',
          quantity: task.hours || 1,
          unit: '式',
          unitPrice: 0,
          taxRate: 10,
          completed: task.completed,
        })),
        materials: structuredData.materials.map((m) => ({
          name: m.name,
          quantity: m.quantity,
          unitPrice: undefined,
        })),
        additionalWork: [],
        notes: structuredData.notes.join('\n'),
      },
      workItems: structuredData.tasks.map((task) => ({
        description: task.description,
        details: '',
        quantity: task.hours || 1,
        unit: '式',
        unitPrice: 0,
        taxRate: 10,
        completed: task.completed,
      })),
      materials: structuredData.materials.map((m) => ({
        name: m.name,
        quantity: m.quantity,
        unitPrice: undefined,
      })),
      notes: structuredData.notes.join('\n'),
      status: 'draft',
      recordedAt: new Date(),
    });
  }

  /**
   * ネットワークエラーかどうかを判定
   */
  private isNetworkError(error: unknown): boolean {
    if (error instanceof Error) {
      const message = error.message.toLowerCase();
      return (
        message.includes('network') ||
        message.includes('fetch') ||
        message.includes('connection') ||
        message.includes('timeout')
      );
    }
    return false;
  }

  /**
   * キュー状態を取得
   */
  async getQueueStatus() {
    return this.offlineQueue.getQueueCounts();
  }
}
