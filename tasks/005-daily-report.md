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

### 4. 日報一覧画面（カレンダー/リストビュー）

```typescript
// app/(tabs)/reports.tsx
import { useState } from 'react';
import { Calendar } from 'react-native-calendars';

type ViewMode = 'calendar' | 'list';

export default function ReportsScreen() {
  const [viewMode, setViewMode] = useState<ViewMode>('calendar');
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<'all' | 'draft' | 'finalized' | 'sent'>('all');

  const { data: reports } = useReports({ statusFilter });

  // カレンダー用のマーク付き日付を生成
  const markedDates = useMemo(() => {
    const marks: Record<string, { marked: boolean; dotColor: string }> = {};
    reports?.forEach(report => {
      const color = report.status === 'draft' ? '#c77700' :
                    report.status === 'finalized' ? '#2d8a4e' : '#147878';
      marks[report.reportDate] = { marked: true, dotColor: color };
    });
    return marks;
  }, [reports]);

  return (
    <View className="flex-1 bg-background">
      {/* ビュー切替トグル */}
      <View className="flex-row p-4 border-b border-gray-300">
        <TouchableOpacity
          onPress={() => setViewMode('calendar')}
          className={`flex-1 py-2 rounded-l-lg ${viewMode === 'calendar' ? 'bg-primary' : 'bg-gray-200'}`}
        >
          <Text className={viewMode === 'calendar' ? 'text-white text-center' : 'text-center'}>
            カレンダー
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setViewMode('list')}
          className={`flex-1 py-2 rounded-r-lg ${viewMode === 'list' ? 'bg-primary' : 'bg-gray-200'}`}
        >
          <Text className={viewMode === 'list' ? 'text-white text-center' : 'text-center'}>
            リスト
          </Text>
        </TouchableOpacity>
      </View>

      {/* ステータスフィルター */}
      <ScrollView horizontal className="p-2 border-b border-gray-200">
        {['all', 'draft', 'finalized', 'sent'].map((status) => (
          <TouchableOpacity
            key={status}
            onPress={() => setStatusFilter(status as any)}
            className={`px-4 py-2 mr-2 rounded-full ${statusFilter === status ? 'bg-primary' : 'bg-gray-200'}`}
          >
            <Text className={statusFilter === status ? 'text-white' : ''}>
              {status === 'all' ? 'すべて' :
               status === 'draft' ? '下書き' :
               status === 'finalized' ? '確定' : '送信済'}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* カレンダービュー */}
      {viewMode === 'calendar' && (
        <View>
          <Calendar
            markedDates={markedDates}
            onDayPress={(day) => setSelectedDate(day.dateString)}
            theme={{
              todayTextColor: '#147878',
              selectedDayBackgroundColor: '#147878',
              arrowColor: '#147878',
            }}
          />
          {/* 選択日の日報リスト */}
          {selectedDate && (
            <ReportListForDate date={selectedDate} reports={reports} />
          )}
        </View>
      )}

      {/* リストビュー */}
      {viewMode === 'list' && (
        <FlatList
          data={reports}
          renderItem={({ item }) => (
            <ReportCard report={item} onPress={() => router.push(`/report/${item.id}`)} />
          )}
          keyExtractor={(item) => item.id}
        />
      )}
    </View>
  );
}

// 日報カードコンポーネント
function ReportCard({ report, onPress }: { report: DailyReport; onPress: () => void }) {
  const statusColors = {
    draft: 'bg-warning',
    finalized: 'bg-success',
    sent: 'bg-primary',
  };
  const statusLabels = {
    draft: '下書き',
    finalized: '確定',
    sent: '送信済',
  };

  return (
    <TouchableOpacity onPress={onPress} className="bg-white p-4 mx-4 my-2 rounded-lg border border-gray-300">
      <View className="flex-row justify-between items-center">
        <Text className="text-lg font-semibold">{report.content.siteName}</Text>
        <View className={`px-2 py-1 rounded ${statusColors[report.status]}`}>
          <Text className="text-white text-xs">{statusLabels[report.status]}</Text>
        </View>
      </View>
      <Text className="text-gray-600 mt-1">{report.reportDate}</Text>
      <Text className="text-gray-500 text-sm mt-1">
        {report.content.weather} / {report.content.temperature}℃
      </Text>
    </TouchableOpacity>
  );
}
```

**日報一覧画面仕様**:
- パス: `/(tabs)/reports`
- ビュー切替:
  - カレンダービュー: 月別カレンダー、日報がある日にドット表示
  - リストビュー: 日付降順のカード一覧
- ステータスフィルター: すべて / 下書き / 確定 / 送信済
- ドットカラー:
  - 下書き: `--genba-warning`（オレンジ）
  - 確定: `--genba-success`（緑）
  - 送信済: `--genba-teal-700`（ティール）
- 遷移先: 日報タップ → `/report/[id]`

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
- [ ] 日報一覧がカレンダービューで表示される
- [ ] 日報一覧がリストビューで表示される
- [ ] カレンダー/リストビューの切り替えができる
- [ ] ステータスでフィルタリングできる
- [ ] 日報を編集できる
- [ ] PDFを共有できる（LINE、メール等）
- [ ] 下書き→確定のステータス管理ができる
