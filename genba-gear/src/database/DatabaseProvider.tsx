/**
 * DatabaseProvider
 *
 * WatermelonDBのDatabaseインスタンスをReactコンテキストで提供する。
 */
import React, { createContext, useContext, ReactNode } from 'react';
import { Database } from '@nozbe/watermelondb';
import { database } from './index';

// Context
const DatabaseContext = createContext<Database | null>(null);

// Provider Props
interface DatabaseProviderProps {
  children: ReactNode;
}

/**
 * DatabaseProvider Component
 * アプリのルートで使用し、配下のコンポーネントでuseDatabase()が使えるようになる
 */
export function DatabaseProvider({ children }: DatabaseProviderProps): React.JSX.Element {
  return (
    <DatabaseContext.Provider value={database}>
      {children}
    </DatabaseContext.Provider>
  );
}

/**
 * useDatabase Hook
 * WatermelonDBのDatabaseインスタンスを取得する
 */
export function useDatabase(): Database {
  const context = useContext(DatabaseContext);
  if (!context) {
    throw new Error('useDatabase must be used within a DatabaseProvider');
  }
  return context;
}
