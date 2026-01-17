/**
 * WatermelonDB Database Instance
 *
 * データベースの初期化と提供を行う。
 * React コンポーネントからは DatabaseProvider を使用してアクセス。
 */
import { Database } from '@nozbe/watermelondb';
import LokiJSAdapter from '@nozbe/watermelondb/adapters/lokijs';
import { schema } from './schema';
import { modelClasses } from './models';

// アダプタの作成（LokiJS - React Native/Web共通）
const adapter = new LokiJSAdapter({
  schema,
  useWebWorker: false,
  useIncrementalIndexedDB: true,
  dbName: 'genba_gear_db',
});

// データベースインスタンスの作成
export const database = new Database({
  adapter,
  modelClasses,
});

// データベースのリセット（開発用）
export async function resetDatabase(): Promise<void> {
  await database.write(async () => {
    await database.unsafeResetDatabase();
  });
}

// 接続テスト用
export async function testDatabaseConnection(): Promise<boolean> {
  try {
    // 簡単なクエリを実行して接続を確認
    await database.get('sites').query().fetchCount();
    return true;
  } catch (error) {
    console.error('Database connection test failed:', error);
    return false;
  }
}

export { schema } from './schema';
export * from './models';
export { DatabaseProvider, useDatabase } from './DatabaseProvider';
