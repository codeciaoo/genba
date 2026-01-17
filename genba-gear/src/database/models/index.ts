/**
 * WatermelonDB Models Index
 */
import BusinessProfile from './BusinessProfile';
import BankAccount from './BankAccount';
import ItemTemplate from './ItemTemplate';
import Site from './Site';
import WorkRecord from './WorkRecord';
import Invoice from './Invoice';
import DailyReport from './DailyReport';
import VoiceQueue from './VoiceQueue';

// モデルクラスの配列（DB初期化時に使用）
export const modelClasses = [
  BusinessProfile,
  BankAccount,
  ItemTemplate,
  Site,
  WorkRecord,
  Invoice,
  DailyReport,
  VoiceQueue,
];

// 個別エクスポート
export {
  BusinessProfile,
  BankAccount,
  ItemTemplate,
  Site,
  WorkRecord,
  Invoice,
  DailyReport,
  VoiceQueue,
};

// 型のエクスポート
export type { ClientType } from './Site';
export type { WorkItem, Material, ExtractedData, WorkRecordStatus } from './WorkRecord';
export type { InvoiceItem, TaxBreakdown, InvoiceStatus } from './Invoice';
export type { VoiceQueueMetadata, VoiceQueueStatus } from './VoiceQueue';
