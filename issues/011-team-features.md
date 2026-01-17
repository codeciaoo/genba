# #011 チームプラン機能

## 概要

中規模チーム（5-50人）向けのチーム管理機能を実装する。メンバー管理、データ共有、集約レポートなど。

## ステータス

🔵 Todo

## 優先度

P2（v2）

## 依存

- #010 熱中症/安全アラート

## 参照スキル

- `genba-app-architecture` - チーム機能

## タスク

### 1. チームデータモデル

```typescript
interface Team {
  id: string;
  name: string;
  ownerId: string;
  plan: 'free_trial' | 'team';
  trialEndsAt?: Date;
  memberCount: number;
  maxMembers: number; // 50人まで
}

interface TeamMember {
  id: string;
  teamId: string;
  userId: string;
  role: 'owner' | 'admin' | 'member';
  permissions: TeamPermissions;
}
```

### 2. チーム作成・招待

```typescript
export async function createTeam(name: string, ownerId: string): Promise<Team> {
  const team = {
    name,
    ownerId,
    plan: 'free_trial',
    trialEndsAt: addDays(new Date(), 30), // 30日無料トライアル
    maxMembers: 50,
  };
  // ...
}

export async function inviteMember(teamId: string, email: string, role: 'admin' | 'member') {
  const inviteCode = generateInviteCode();
  await sendInviteEmail(email, inviteCode);
}
```

### 3. データ共有・アクセス制御

- チームメンバー間でのデータ閲覧
- 役割ベースの権限管理

### 4. チーム集約レポート

```typescript
interface TeamDailySummary {
  date: string;
  totalWorkRecords: number;
  memberSummaries: MemberSummary[];
}
```

### 5. 課金管理（Stripe連携）

- 月額¥3,000のサブスクリプション
- 30日無料トライアル

## 完了条件

- [ ] チームを作成できる
- [ ] メンバーを招待できる
- [ ] 役割・権限を設定できる
- [ ] チーム集約レポートが生成される
- [ ] 30日無料トライアルが動作する
- [ ] Stripe決済で月額¥3,000が課金される
