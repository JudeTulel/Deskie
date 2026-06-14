import { app } from 'electron'
import { join } from 'path'
import { DatabaseSync } from 'node:sqlite'
import type { ModelInput, ModelStatus, ModelType, StoredModel } from '../shared/models'

const DEFAULT_MODEL_SRC =
  'https://huggingface.co/bartowski/Llama-3.2-1B-Instruct-GGUF/resolve/main/Llama-3.2-1B-Instruct-Q4_0.gguf'

let db: DatabaseSync | null = null

function modelIdFromSrc(assetSrc: string): string {
  return Buffer.from(assetSrc).toString('base64url')
}

function rowToModel(row: any): StoredModel {
  return {
    id: row.id,
    name: row.name,
    assetSrc: row.asset_src,
    assetId: row.asset_id ?? undefined,
    localPath: row.local_path ?? undefined,
    type: row.type,
    status: row.status,
    isActive: Boolean(row.is_active),
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }
}

export function initModelStore(): void {
  if (db) return

  db = new DatabaseSync(join(app.getPath('userData'), 'deskie.sqlite'))
  db.exec(`
    CREATE TABLE IF NOT EXISTS models (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      asset_src TEXT NOT NULL UNIQUE,
      asset_id TEXT,
      local_path TEXT,
      type TEXT NOT NULL DEFAULT 'LLM',
      status TEXT NOT NULL DEFAULT 'available',
      is_active INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );
  `)
  try {
    db.exec('ALTER TABLE models ADD COLUMN local_path TEXT')
  } catch {
    // Existing databases already have this column after the first migration.
  }

  const count = db.prepare('SELECT COUNT(*) AS count FROM models').get() as { count: number }
  if (count.count === 0) {
    upsertModel({
      id: modelIdFromSrc(DEFAULT_MODEL_SRC),
      name: 'Llama 3.2 1B (Q4_0)',
      assetSrc: DEFAULT_MODEL_SRC,
      type: 'LLM',
      status: 'available',
      isActive: true
    })
  }
}

function getDb(): DatabaseSync {
  if (!db) initModelStore()
  return db!
}

export function getModels(): StoredModel[] {
  return getDb()
    .prepare('SELECT * FROM models ORDER BY is_active DESC, updated_at DESC')
    .all()
    .map(rowToModel)
}

export function getActiveModel(): StoredModel | null {
  const row = getDb().prepare('SELECT * FROM models WHERE is_active = 1 LIMIT 1').get()
  return row ? rowToModel(row) : null
}

export function upsertModel(input: ModelInput): StoredModel {
  const now = Date.now()
  const id = input.id ?? modelIdFromSrc(input.assetSrc)
  const existing = getDb().prepare('SELECT * FROM models WHERE id = ? OR asset_src = ? LIMIT 1').get(id, input.assetSrc)
  const createdAt = existing ? rowToModel(existing).createdAt : now
  const isActive = input.isActive ? 1 : existing ? Number((existing as any).is_active) : 0

  getDb()
    .prepare(
      `INSERT OR REPLACE INTO models (
        id, name, asset_src, asset_id, local_path, type, status, is_active, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      id,
      input.name,
      input.assetSrc,
      input.assetId ?? (existing as any)?.asset_id ?? null,
      input.localPath ?? (existing as any)?.local_path ?? null,
      input.type ?? ((existing as any)?.type as ModelType | undefined) ?? 'LLM',
      input.status ?? ((existing as any)?.status as ModelStatus | undefined) ?? 'available',
      isActive,
      createdAt,
      now
    )

  if (input.isActive) setActiveModel(id)

  return rowToModel(getDb().prepare('SELECT * FROM models WHERE id = ?').get(id))
}

export function setActiveModel(id: string): StoredModel {
  const database = getDb()
  const row = database.prepare('SELECT * FROM models WHERE id = ?').get(id)
  if (!row) throw new Error(`Model not found: ${id}`)

  database.prepare('UPDATE models SET is_active = 0').run()
  database.prepare('UPDATE models SET is_active = 1, updated_at = ? WHERE id = ?').run(Date.now(), id)
  return rowToModel(database.prepare('SELECT * FROM models WHERE id = ?').get(id))
}
