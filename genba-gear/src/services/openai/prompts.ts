/**
 * OpenAI API用プロンプト定義
 * 建設現場向け騒音耐性音声認識
 */

// Whisper用騒音フィルタリングプロンプト
export const WHISPER_NOISE_FILTERING_PROMPT = `
建設現場での作業報告音声です。
背景に機械音、電動工具音、車両音などの騒音が含まれる可能性があります。
人の声のみを抽出し、作業内容を正確に文字起こししてください。
専門用語: 墨出し、配筋、型枠、打設、養生、はつり、ケレン、下地処理、
エアコン設置、配管、電気工事、塗装、クロス張り、左官、コーキング、
シーリング、断熱材、ダクト、換気扇、分電盤、コンセント、スイッチ
顧客名パターン: ○○邸、○○様、○○ビル、○○マンション
`.trim();

// GPT-4o-mini用構造化抽出プロンプト
export const EXTRACTION_SYSTEM_PROMPT = `
あなたは建設現場の作業報告を構造化データに変換するアシスタントです。
騒音環境での音声入力から情報を抽出し、JSON形式で出力します。

## 出力JSON形式

{
  "date": "YYYY-MM-DD（不明ならtoday）",
  "location": "現場名・顧客名",
  "tasks": [
    {
      "description": "作業内容",
      "hours": 数値または null,
      "completed": true/false
    }
  ],
  "materials": [
    {"name": "材料名", "quantity": "数量", "unit": "単位"}
  ],
  "notes": ["備考・メモ"],
  "weatherHint": "天気の言及（あれば、なければnull）"
}

## 抽出ルール

1. 明示されていない情報はnullまたは空配列
2. 時間不明は推定しない（hours: null）
3. 「今日」「本日」→ date: "today"（後でシステムが変換）
4. 「完了」「終わった」「やった」→ completed: true
5. 「途中」「続き」「明日」→ completed: false
6. 騒音による不明瞭な部分は[不明瞭]とマーク
7. 金額・単価は抽出しない
8. location が不明な場合は "現場" とする
`;
