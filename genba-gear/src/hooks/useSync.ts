/**
 * useSync Hook
 *
 * データベース同期機能を提供するカスタムフック。
 */
import { useState, useCallback, useEffect, useRef } from 'react';
import { useDatabase } from '../database/DatabaseProvider';
import { syncDatabase, hasPendingChanges, SyncResult } from '../database/sync';
import { supabase } from '../../services/supabase/client';

interface UseSyncResult {
  /** 同期中かどうか */
  isSyncing: boolean;
  /** 最後の同期結果 */
  lastSyncResult: SyncResult | null;
  /** 未同期の変更があるかどうか */
  hasPending: boolean;
  /** 同期を実行 */
  sync: () => Promise<SyncResult>;
  /** 最後の同期日時 */
  lastSyncedAt: Date | null;
}

/**
 * データベース同期フック
 * @param autoSync - 認証状態変更時に自動同期するか
 * @param intervalMs - 自動同期の間隔（ミリ秒）。0の場合は自動同期しない
 */
export function useSync(autoSync: boolean = true, intervalMs: number = 0): UseSyncResult {
  const database = useDatabase();
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncResult, setLastSyncResult] = useState<SyncResult | null>(null);
  const [hasPending, setHasPending] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // 同期を実行
  const sync = useCallback(async (): Promise<SyncResult> => {
    if (isSyncing) {
      return {
        success: false,
        error: 'Sync already in progress',
        pulledCount: 0,
        pushedCount: 0,
      };
    }

    setIsSyncing(true);

    try {
      const result = await syncDatabase(database);
      setLastSyncResult(result);

      if (result.success) {
        setLastSyncedAt(new Date());
        setHasPending(false);
      }

      return result;
    } finally {
      setIsSyncing(false);
    }
  }, [database, isSyncing]);

  // 未同期チェック
  const checkPending = useCallback(async () => {
    const pending = await hasPendingChanges(database);
    setHasPending(pending);
  }, [database]);

  // 認証状態変更時の自動同期
  useEffect(() => {
    if (!autoSync) return;

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_IN' && session) {
          // ログイン時に同期
          await sync();
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [autoSync, sync]);

  // 定期的な自動同期
  useEffect(() => {
    if (intervalMs <= 0) return;

    intervalRef.current = setInterval(async () => {
      const { data: session } = await supabase.auth.getSession();
      if (session?.session) {
        await sync();
      }
    }, intervalMs);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [intervalMs, sync]);

  // 初回の未同期チェック
  useEffect(() => {
    checkPending();
  }, [checkPending]);

  return {
    isSyncing,
    lastSyncResult,
    hasPending,
    sync,
    lastSyncedAt,
  };
}
