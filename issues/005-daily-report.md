# #005 簡易日報生成（GPS+天気）

## 概要

ボイス入力データからGPS/天気情報を統合し、法規準拠のPDF日報を1タップで生成する機能を実装する。

## ステータス

🔵 Todo

## 優先度

P0（MVP必須）

## 依存

- #004 騒音耐性AIボイス入力

## 参照スキル

- `genba-app-architecture` - 日報生成フロー
- `voice-to-document` - 構造化データ

## タスク

### 1. 日報データモデル

```typescript
// src/features/report/types.ts
interface DailyReport {
  id: string;
  userId: string;
  workRecordId: string;
  customerId?: string;
  reportDate: string;        // YYYY-MM-DD
  content: ReportContent;
  pdfUrl?: string;
  timestampSignature?: string;
  status: 'draft' | 'finalized' | 'sent';
  createdAt: Date;
  updatedAt: Date;
}

interface ReportContent {
  // 基本情報
  siteName: string;          // 現場名
  weather: string;           // 天気
  temperature: number;       // 気温

  // 作業内容
  workItems: WorkItem[];

  // 位置情報
  gpsLocation: {
    latitude: number;
    longitude: number;
    address?: string;        // 逆ジオコーディング
  };

  // 特記事項
  notes?: string;

  // 安全確認
  safetyCheck: boolean;
}

interface WorkItem {
  workType: string;          // 作業種別
  details: string;           // 作業内容
  startTime?: string;        // 開始時刻
  endTime?: string;          // 終了時刻
  materials?: string[];      // 使用材料
  quantity?: string;         // 数量
}
```

### 2. 日報生成サービス

```typescript
// src/features/report/generateReport.ts
export async function generateDailyReport(
  workRecord: WorkRecord,
  userProfile: UserProfile
): Promise<DailyReport> {
  // 1. 構造化データから日報コンテンツ生成
  const content = buildReportContent(workRecord);

  // 2. 住所の逆ジオコーディング
  if (workRecord.gpsLocation) {
    content.gpsLocation.address = await reverseGeocode(
      workRecord.gpsLocation.latitude,
      workRecord.gpsLocation.longitude
    );
  }

  // 3. タイムスタンプ署名生成
  const timestampSignature = generateTimestamp(workRecord.recordedAt);

  return {
    id: generateId(),
    userId: userProfile.userId,
    workRecordId: workRecord.id,
    reportDate: formatDate(workRecord.recordedAt),
    content,
    timestampSignature,
    status: 'draft',
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}
```

### 3. PDF生成

```typescript
// src/features/report/pdfGenerator.ts
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

export async function generateReportPDF(
  report: DailyReport,
  userProfile: UserProfile
): Promise<string> {
  const html = buildReportHTML(report, userProfile);

  const { uri } = await Print.printToFileAsync({
    html,
    base64: false,
  });

  return uri;
}

function buildReportHTML(report: DailyReport, userProfile: UserProfile): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        body { font-family: 'Noto Sans JP', sans-serif; padding: 20px; }
        .header { text-align: center; border-bottom: 2px solid #147878; padding-bottom: 10px; }
        .title { font-size: 24px; font-weight: bold; color: #1a1f3d; }
        .section { margin: 20px 0; }
        .section-title { font-size: 16px; font-weight: bold; background: #f5f5f5; padding: 8px; }
        .row { display: flex; border-bottom: 1px solid #ddd; padding: 8px 0; }
        .label { width: 120px; font-weight: bold; }
        .value { flex: 1; }
        .footer { margin-top: 40px; text-align: right; font-size: 12px; color: #666; }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="title">作業日報</div>
        <div>${report.reportDate}</div>
      </div>

      <div class="section">
        <div class="section-title">基本情報</div>
        <div class="row">
          <div class="label">事業者名</div>
          <div class="value">${userProfile.businessName}</div>
        </div>
        <div class="row">
          <div class="label">現場名</div>
          <div class="value">${report.content.siteName}</div>
        </div>
        <div class="row">
          <div class="label">天気</div>
          <div class="value">${report.content.weather} / ${report.content.temperature}℃</div>
        </div>
        <div class="row">
          <div class="label">位置</div>
          <div class="value">${report.content.gpsLocation.address || '取得中...'}</div>
        </div>
      </div>

      <div class="section">
        <div class="section-title">作業内容</div>
        ${report.content.workItems.map(item => `
          <div class="row">
            <div class="label">${item.workType}</div>
            <div class="value">${item.details}</div>
          </div>
        `).join('')}
      </div>

      ${report.content.notes ? `
        <div class="section">
          <div class="section-title">特記事項</div>
          <div class="row">
            <div class="value">${report.content.notes}</div>
          </div>
        </div>
      ` : ''}

      <div class="footer">
        <div>タイムスタンプ: ${report.timestampSignature}</div>
        <div>GENBA GEAR で作成</div>
      </div>
    </body>
    </html>
  `;
}
```

### 4. 日報一覧画面

```typescript
// app/(tabs)/reports.tsx
// 日付別の日報一覧
// ステータスフィルター（下書き/確定/送信済み）
// PDF表示・共有
```

### 5. 日報詳細・編集画面

```typescript
// app/report/[id].tsx
// 日報内容の表示・編集
// PDF生成ボタン
// 共有ボタン（LINE、メール等）
```

## 実行コマンド

```bash
# 指示文
genba-app-architectureスキルを参照して、
簡易日報生成機能を実装してください。

作業対象: /Users/tsubasatahara/dev/codeciao/genba/genba-gear

1. 日報データモデル定義
2. 日報生成サービス
3. PDF生成（HTML→PDF）
4. 日報一覧画面
5. 日報詳細・編集画面
6. PDF共有機能
```

## 完了条件

- [ ] ボイス入力から日報が自動生成される
- [ ] GPS位置情報が日報に含まれる
- [ ] 天気情報が日報に含まれる
- [ ] タイムスタンプ署名が生成される
- [ ] PDFが正しく生成される
- [ ] 日報一覧が表示される
- [ ] 日報を編集できる
- [ ] PDFを共有できる（LINE、メール等）
- [ ] 下書き→確定のステータス管理ができる
