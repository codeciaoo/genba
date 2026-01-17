#!/usr/bin/env node

/**
 * sync-kanban.js
 *
 * tasks/*.md ファイルを vibe-kanban 形式の kanban.json に変換する
 *
 * 使用方法:
 *   node scripts/sync-kanban.js
 *
 * 出力:
 *   kanban.json
 */

const fs = require('fs');
const path = require('path');

const TASKS_DIR = path.join(__dirname, '..', 'tasks');
const OUTPUT_FILE = path.join(__dirname, '..', 'kanban.json');

// ステータス変換マッピング
const STATUS_MAP = {
  '🔵': 'todo',
  '🟢': 'in_progress',
  '✅': 'done',
};

// 優先度変換マッピング
const PRIORITY_MAP = {
  'P0': 'critical',
  'P1': 'high',
  'P2': 'medium',
  'P3': 'low',
};

/**
 * マークダウンファイルをパースしてタスクオブジェクトを返す
 */
function parseTaskFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const fileName = path.basename(filePath, '.md');

  // README.md はスキップ
  if (fileName.toLowerCase() === 'readme') {
    return null;
  }

  // ID とタイトルを抽出: # #XXX タイトル
  const titleMatch = content.match(/^# #(\d+)\s+(.+)$/m);
  if (!titleMatch) {
    console.warn(`警告: ${fileName} からタイトルを抽出できませんでした`);
    return null;
  }

  const id = titleMatch[1];
  const title = titleMatch[2].trim();

  // ステータスを抽出
  const statusMatch = content.match(/## ステータス\s*\n+([^\n]+)/);
  let status = 'todo';
  if (statusMatch) {
    const statusLine = statusMatch[1].trim();
    for (const [emoji, statusValue] of Object.entries(STATUS_MAP)) {
      if (statusLine.startsWith(emoji)) {
        status = statusValue;
        break;
      }
    }
  }

  // 優先度を抽出
  const priorityMatch = content.match(/## 優先度\s*\n+([^\n]+)/);
  let priority = 'medium';
  if (priorityMatch) {
    const priorityLine = priorityMatch[1].trim();
    for (const [pLevel, pValue] of Object.entries(PRIORITY_MAP)) {
      if (priorityLine.includes(pLevel)) {
        priority = pValue;
        break;
      }
    }
  }

  // 依存を抽出
  const dependsMatch = content.match(/## 依存\s*\n+([\s\S]*?)(?=\n##|$)/);
  const dependencies = [];
  if (dependsMatch) {
    const dependsText = dependsMatch[1].trim();
    if (dependsText.toLowerCase() !== 'なし') {
      // #XXX 形式の依存を抽出
      const depMatches = dependsText.matchAll(/#(\d+)/g);
      for (const match of depMatches) {
        dependencies.push(match[1]);
      }
    }
  }

  // 概要を抽出
  const overviewMatch = content.match(/## 概要\s*\n+([\s\S]*?)(?=\n##|$)/);
  const description = overviewMatch ? overviewMatch[1].trim() : '';

  // ラベルを生成（技術スタックから）
  const labels = [];
  const techMatch = content.match(/## 技術スタック\s*\n+([\s\S]*?)(?=\n##|$)/);
  if (techMatch) {
    const techText = techMatch[1].trim();
    // 主要な技術をラベルとして抽出
    const techKeywords = ['React Native', 'Expo', 'TypeScript', 'Astro', 'Tailwind', 'Supabase', 'WatermelonDB', 'OpenAI'];
    for (const keyword of techKeywords) {
      if (techText.includes(keyword)) {
        labels.push(keyword.toLowerCase().replace(/\s+/g, '-'));
      }
    }
  }

  return {
    id,
    task: `#${id} ${title}`,
    status,
    priority,
    labels,
    dependencies,
    description,
  };
}

/**
 * メイン処理
 */
function main() {
  console.log('📁 tasks/*.md を読み込み中...');

  // tasks ディレクトリ内の .md ファイルを取得
  const files = fs.readdirSync(TASKS_DIR)
    .filter(f => f.endsWith('.md'))
    .map(f => path.join(TASKS_DIR, f))
    .sort();

  console.log(`   ${files.length} ファイルを検出`);

  // 各ファイルをパース
  const tasks = [];
  for (const filePath of files) {
    const task = parseTaskFile(filePath);
    if (task) {
      tasks.push(task);
    }
  }

  console.log(`   ${tasks.length} タスクをパース完了`);

  // ステータスごとに分類
  const kanban = {
    todo: [],
    in_progress: [],
    done: [],
  };

  for (const task of tasks) {
    const { status, ...taskData } = task;
    taskData.status = status; // vibe-kanban はタスク内にも status を持つ
    kanban[status].push(taskData);
  }

  // IDでソート
  for (const column of Object.values(kanban)) {
    column.sort((a, b) => parseInt(a.id) - parseInt(b.id));
  }

  // 統計を表示
  console.log('\n📊 統計:');
  console.log(`   Todo:        ${kanban.todo.length}`);
  console.log(`   In Progress: ${kanban.in_progress.length}`);
  console.log(`   Done:        ${kanban.done.length}`);

  // kanban.json に出力
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(kanban, null, 2), 'utf-8');
  console.log(`\n✅ ${OUTPUT_FILE} を生成しました`);
}

main();
