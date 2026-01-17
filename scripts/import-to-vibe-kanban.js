#!/usr/bin/env node

/**
 * import-to-vibe-kanban.js
 *
 * kanban.json を vibe-kanban の SQLite データベースにインポートする
 *
 * 使用方法:
 *   node scripts/import-to-vibe-kanban.js [project-name]
 *
 * 例:
 *   node scripts/import-to-vibe-kanban.js genba
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const KANBAN_FILE = path.join(__dirname, '..', 'kanban.json');
const DB_PATH = path.join(
  process.env.HOME,
  'Library/Application Support/ai.bloop.vibe-kanban/db.sqlite'
);

// vibe-kanban のステータスマッピング
const STATUS_MAP = {
  'todo': 'todo',
  'in_progress': 'inprogress',
  'done': 'done',
};

/**
 * SQLite コマンドを実行
 */
function sqlite(query) {
  const escaped = query.replace(/'/g, "'\"'\"'");
  const result = execSync(`sqlite3 "${DB_PATH}" '${escaped}'`, {
    encoding: 'utf-8',
  });
  return result.trim();
}

/**
 * UUID v4 を生成（バイナリ用16進数文字列）
 */
function generateUUID() {
  return crypto.randomUUID().replace(/-/g, '').toUpperCase();
}

/**
 * メイン処理
 */
function main() {
  const projectName = process.argv[2] || 'genba';

  console.log(`📁 ${KANBAN_FILE} を読み込み中...`);

  if (!fs.existsSync(KANBAN_FILE)) {
    console.error(`❌ ${KANBAN_FILE} が見つかりません`);
    console.error('   先に node scripts/sync-kanban.js を実行してください');
    process.exit(1);
  }

  if (!fs.existsSync(DB_PATH)) {
    console.error(`❌ vibe-kanban データベースが見つかりません: ${DB_PATH}`);
    console.error('   先に npx vibe-kanban を起動してください');
    process.exit(1);
  }

  const kanban = JSON.parse(fs.readFileSync(KANBAN_FILE, 'utf-8'));

  // プロジェクトIDを取得（最新のもの）
  console.log(`🔍 プロジェクト "${projectName}" を検索中...`);
  const projectResult = sqlite(
    `SELECT hex(id) FROM projects WHERE name = '${projectName}' ORDER BY created_at DESC LIMIT 1;`
  );

  if (!projectResult) {
    console.error(`❌ プロジェクト "${projectName}" が見つかりません`);
    console.error('   vibe-kanban でプロジェクトを作成してください');
    process.exit(1);
  }

  const projectId = projectResult;
  console.log(`   プロジェクトID: ${projectId}`);

  // 既存タスクを確認
  const existingTasks = sqlite(
    `SELECT title FROM tasks WHERE project_id = X'${projectId}';`
  );

  if (existingTasks) {
    console.log(`⚠️  既存タスクが ${existingTasks.split('\n').length} 件あります`);
    console.log('   既存タスクを削除しますか？ (Ctrl+C でキャンセル)');
    // 自動で削除
    sqlite(`DELETE FROM tasks WHERE project_id = X'${projectId}';`);
    console.log('   既存タスクを削除しました');
  }

  // タスクをインポート
  let count = 0;
  const now = new Date().toISOString().replace('T', ' ').replace('Z', '');

  for (const [status, tasks] of Object.entries(kanban)) {
    const vibeStatus = STATUS_MAP[status] || 'todo';

    for (const task of tasks) {
      const taskId = generateUUID();
      const title = task.task.replace(/'/g, "''");
      const description = (task.description || '').replace(/'/g, "''");

      const query = `
        INSERT INTO tasks (id, project_id, title, description, status, created_at, updated_at)
        VALUES (X'${taskId}', X'${projectId}', '${title}', '${description}', '${vibeStatus}', '${now}', '${now}');
      `.trim();

      try {
        sqlite(query);
        count++;
        console.log(`   ✓ ${task.task}`);
      } catch (error) {
        console.error(`   ✗ ${task.task}: ${error.message}`);
      }
    }
  }

  console.log(`\n✅ ${count} タスクをインポートしました`);
  console.log('   vibe-kanban を再起動してください: npx vibe-kanban');
}

main();
