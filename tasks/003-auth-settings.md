# #003 認証・ユーザー設定

## 概要

Supabase Authを使用したシンプルなメール/パスワード認証機能と、ユーザープロファイル・事業者情報の設定画面を実装する。

## ステータス

🔵 Todo

## 優先度

P0（MVP必須）

## 依存

- #002 データ層（WatermelonDB + Supabase）

## 参照スキル

- `genba-app-architecture` - 認証フロー、ユーザーモデル

## タスク

### 1. Supabase Auth設定（メール/パスワード認証）

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

  const signIn = async (email: string, password: string) => {
    return supabase.auth.signInWithPassword({ email, password });
  };

  const signUp = async (email: string, password: string) => {
    return supabase.auth.signUp({ email, password });
  };

  const signOut = async () => {
    return supabase.auth.signOut();
  };

  return { user, session, loading, signIn, signUp, signOut };
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
| ログイン | `app/auth/login.tsx` | メールアドレス＋パスワード入力 |
| 新規登録 | `app/auth/register.tsx` | 屋号・メール・パスワード入力 |
| 初期設定 | `app/auth/onboarding.tsx` | 住所・インボイス番号（任意、スキップ可） |

```typescript
// app/auth/login.tsx
export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { signIn } = useAuth();

  const handleLogin = async () => {
    try {
      const { error } = await signIn(email, password);
      if (error) throw error;
      router.replace('/(tabs)/');
    } catch (error) {
      Alert.alert('エラー', 'ログインに失敗しました');
    }
  };

  return (
    <View>
      <Text>メールアドレス</Text>
      <TextInput
        value={email}
        onChangeText={setEmail}
        placeholder="example@email.com"
        keyboardType="email-address"
        autoCapitalize="none"
      />

      <Text>パスワード</Text>
      <TextInput
        value={password}
        onChangeText={setPassword}
        placeholder="パスワード"
        secureTextEntry
      />

      <Button title="ログイン" onPress={handleLogin} />
      <Link href="/auth/register">新規登録はこちら</Link>
    </View>
  );
}
```

```typescript
// app/auth/register.tsx
export default function RegisterScreen() {
  const [businessName, setBusinessName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { signUp } = useAuth();

  const handleRegister = async () => {
    try {
      const { data, error } = await signUp(email, password);
      if (error) throw error;

      // ユーザープロファイル作成
      await supabase.from('user_profiles').insert({
        user_id: data.user!.id,
        business_name: businessName,
      });

      // 初期設定画面へ
      router.replace('/auth/onboarding');
    } catch (error) {
      Alert.alert('エラー', '登録に失敗しました');
    }
  };

  return (
    <View>
      <Text>屋号（事業者名）</Text>
      <TextInput value={businessName} onChangeText={setBusinessName} />

      <Text>メールアドレス</Text>
      <TextInput
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
      />

      <Text>パスワード</Text>
      <TextInput
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />

      <Button title="登録する" onPress={handleRegister} />
      <Link href="/auth/login">ログインはこちら</Link>
    </View>
  );
}
```

```typescript
// app/auth/onboarding.tsx
export default function OnboardingScreen() {
  const [address, setAddress] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');

  const handleComplete = async () => {
    await updateUserProfile({ address, invoiceRegistrationNumber: invoiceNumber });
    router.replace('/(tabs)/');
  };

  const handleSkip = () => {
    router.replace('/(tabs)/');
  };

  return (
    <View>
      <Text>住所（任意）</Text>
      <TextInput value={address} onChangeText={setAddress} />

      <Text>インボイス登録番号（任意）</Text>
      <TextInput
        value={invoiceNumber}
        onChangeText={setInvoiceNumber}
        placeholder="T1234567890123"
      />

      <Button title="完了" onPress={handleComplete} />
      <Button title="あとで設定" onPress={handleSkip} variant="secondary" />
    </View>
  );
}
```

### 6. 品目テンプレート管理

| 画面 | パス | 説明 |
|------|------|------|
| 品目一覧 | `app/settings/templates/index.tsx` | 登録済み品目リスト |
| 品目編集 | `app/settings/templates/[id].tsx` | 品目の追加/編集 |

```typescript
// src/features/settings/types.ts
interface ItemTemplate {
  id: string;
  name: string;              // 品目名
  unit: string;              // 単位（式、個、m、時間など）
  unitPrice: number;         // 単価（税抜）
  taxRate: 10 | 8;           // 税率（標準10%/軽減8%）
  category?: string;         // カテゴリ（任意）
  voiceKeywords?: string[];  // 音声認識キーワード（任意）
}
```

```typescript
// app/settings/templates/index.tsx
export default function ItemTemplatesScreen() {
  const { data: templates } = useItemTemplates();

  return (
    <View>
      <FlatList
        data={templates}
        renderItem={({ item }) => (
          <TouchableOpacity onPress={() => router.push(`/settings/templates/${item.id}`)}>
            <Text>{item.name}</Text>
            <Text>¥{item.unitPrice.toLocaleString()} / {item.unit}</Text>
          </TouchableOpacity>
        )}
      />
      <FAB onPress={() => router.push('/settings/templates/new')} icon="+" />
    </View>
  );
}
```

```typescript
// app/settings/templates/[id].tsx
export default function EditTemplateScreen() {
  const { id } = useLocalSearchParams();
  const [name, setName] = useState('');
  const [unit, setUnit] = useState('');
  const [unitPrice, setUnitPrice] = useState('');
  const [taxRate, setTaxRate] = useState<10 | 8>(10);

  const handleSave = async () => {
    await saveItemTemplate({
      id: id === 'new' ? undefined : id,
      name,
      unit,
      unitPrice: Number(unitPrice),
      taxRate,
    });
    router.back();
  };

  return (
    <View>
      <Text>品目名</Text>
      <TextInput value={name} onChangeText={setName} placeholder="エアコン設置" />

      <Text>単位</Text>
      <TextInput value={unit} onChangeText={setUnit} placeholder="式" />

      <Text>単価（税抜）</Text>
      <TextInput value={unitPrice} onChangeText={setUnitPrice} keyboardType="numeric" />

      <Text>税率</Text>
      <RadioGroup
        value={taxRate}
        onChange={setTaxRate}
        options={[
          { label: '10%（標準）', value: 10 },
          { label: '8%（軽減）', value: 8 },
        ]}
      />

      <Button title="保存" onPress={handleSave} />
    </View>
  );
}
```

### 7. RLSポリシー

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

-- item_templates: 自分の品目のみアクセス可能
CREATE POLICY "Users can manage own templates"
  ON item_templates FOR ALL
  USING (auth.uid() = user_id);
```

## 実行コマンド

```bash
# 指示文
genba-app-architectureスキルを参照して、
認証機能とユーザー設定画面を実装してください。

作業対象: /Users/tsubasatahara/dev/codeciao/genba/genba-gear

1. Supabase Auth設定（メール/パスワード）
2. 認証フック実装
3. ログイン/新規登録画面
4. 初期設定（オンボーディング）画面
5. ユーザープロファイル設定画面
6. 振込先口座設定画面
7. 品目テンプレート管理画面
8. RLSポリシー設定
```

## 完了条件

- [ ] Supabase Auth設定が完了している
- [ ] メール/パスワードでログインできる
- [ ] 新規登録ができる
- [ ] 初期設定（オンボーディング）画面が表示される
- [ ] オンボーディングをスキップできる
- [ ] ユーザープロファイルを編集できる
- [ ] インボイス登録番号を設定できる
- [ ] 振込先口座を登録できる
- [ ] 品目テンプレートを登録・編集・削除できる
- [ ] RLSポリシーが設定されている
- [ ] 認証状態がアプリ全体で共有される
