/**
 * useRepositories Hook
 *
 * 各リポジトリのインスタンスを取得するカスタムフック。
 */
import { useMemo } from 'react';
import { useDatabase } from '../database/DatabaseProvider';
import {
  SiteRepository,
  WorkRecordRepository,
  DailyReportRepository,
  InvoiceRepository,
} from '../database/repositories';

/**
 * 現場リポジトリを取得
 */
export function useSiteRepository(): SiteRepository {
  const database = useDatabase();
  return useMemo(() => new SiteRepository(database), [database]);
}

/**
 * 作業記録リポジトリを取得
 */
export function useWorkRecordRepository(): WorkRecordRepository {
  const database = useDatabase();
  return useMemo(() => new WorkRecordRepository(database), [database]);
}

/**
 * 日報リポジトリを取得
 */
export function useDailyReportRepository(): DailyReportRepository {
  const database = useDatabase();
  return useMemo(() => new DailyReportRepository(database), [database]);
}

/**
 * 請求書リポジトリを取得
 */
export function useInvoiceRepository(): InvoiceRepository {
  const database = useDatabase();
  return useMemo(() => new InvoiceRepository(database), [database]);
}

/**
 * 全リポジトリをまとめて取得
 */
export function useRepositories() {
  const database = useDatabase();

  return useMemo(
    () => ({
      sites: new SiteRepository(database),
      workRecords: new WorkRecordRepository(database),
      dailyReports: new DailyReportRepository(database),
      invoices: new InvoiceRepository(database),
    }),
    [database]
  );
}
