# #003 認証・ユーザー設定

## 概要

Supabase Authを使用した認証機能と、ユーザープロファイル・事業者情報の設定画面を実装する。

## ステータス

🔵 Todo

## 優先度

P0（MVP必須）

## 依存

- #002 データ層（WatermelonDB + Supabase）

## 参照スキル

- `genba-app-architecture` - 認証フロー、ユーザーモデル

## タスク

### 1. Supabase Auth設定

```typescript
// src/services/supabase.ts
import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: {
      getItem: (key) => SecureStore.getItemAsync(key),
      setItem: (key, value) => SecureStore.setItemAsync(key, value),
      removeItem: (key) => SecureStore.deleteItemAsync(key),
    },
    autoRefreshToken: true,
    persistSession: true,
  },
});
```

### 2. 認証フック

```typescript
// src/hooks/useAuth.ts
import { useEffect, useState } from 'react';
import { supabase } from '@/services/supabase';
import type { User, Session } from '@supabase/supabase-js';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const signInWithEmail = async (email: string, password: string) => {
    return supabase.auth.signInWithPassword({ email, password });
  };

  const signUp = async (email: string, password: string) => {
    return supabase.auth.signUp({ email, password });
  };

  const signOut = async () => {
    return supabase.auth.signOut();
  };

  return { user, session, loading, signInWithEmail, signUp, signOut };
}
```

### 3. ユーザー設定画面

```typescript
// app/(tabs)/settings.tsx
interface UserProfile {
  businessName: string;           // 事業者名（必須）
  representativeName: string;     // 代表者名
  postalCode: string;             // 郵便番号
  address: string;                // 住所
  phone: string;                  // 電話番号
  email: string;                  // メールアドレス
  invoiceRegistrationNumber: string; // インボイス登録番号（T+13桁）
}
```

### 4. 振込先口座設定

```typescript
// src/features/settings/BankAccountForm.tsx
interface BankAccount {
  bankName: string;       // 銀行名
  branchName: string;     // 支店名
  accountType: 'ordinary' | 'checking'; // 普通/当座
  accountNumber: string;  // 口座番号
  accountHolder: string;  // 口座名義
  isDefault: boolean;     // デフォルト口座
}
```

### 5. 認証画面

| 画面 | パス | 説明 |
|------|------|------|
| ログイン | `app/auth/login.tsx` | メール/パスワードログイン |
| 新規登録 | `app/auth/signup.tsx` | メール/パスワード登録 |
| パスワードリセット | `app/auth/reset.tsx` | パスワードリセット |

### 6. RLSポリシー

```sql
-- user_profiles: 自分のプロファイルのみアクセス可能
CREATE POLICY "Users can view own profile"
  ON user_profiles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own profile"
  ON user_profiles FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own profile"
  ON user_profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- bank_accounts: 自分の口座のみアクセス可能
CREATE POLICY "Users can manage own bank accounts"
  ON bank_accounts FOR ALL
  USING (auth.uid() = user_id);
```

## 実行コマンド

```bash
# 指示文
genba-app-architectureスキルを参照して、
認証機能とユーザー設定画面を実装してください。

作業対象: /Users/tsubasatahara/dev/codeciao/genba/genba-gear

1. Supabase Auth設定
2. 認証フック実装
3. ログイン/サインアップ画面
4. ユーザープロファイル設定画面
5. 振込先口座設定画面
6. RLSポリシー設定
```

## 完了条件

- [ ] Supabase Auth設定が完了している
- [ ] メール/パスワードでログインできる
- [ ] 新規登録ができる
- [ ] ユーザープロファイルを編集できる
- [ ] インボイス登録番号を設定できる
- [ ] 振込先口座を登録できる
- [ ] RLSポリシーが設定されている
- [ ] 認証状態がアプリ全体で共有される
