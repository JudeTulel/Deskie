import { app } from 'electron'
import { join } from 'path'
import { DatabaseSync } from 'node:sqlite'
import type {
  ModelInput,
  ModelStatus,
  ModelType,
  StoredModel,
  UserDetails,
  UserDetailsInput,
  ChatSession,
  ChatMessage,
  Subject,
  Document,
  Flashcard,
  Quiz,
  Activity
} from '../src/shared/models'

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

export function initDb(): void {
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
    // Column already exists
  }

  db.exec(`
    CREATE TABLE IF NOT EXISTS user_details (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      nickname TEXT NOT NULL,
      age TEXT,
      education_level TEXT,
      subjects TEXT,
      goal TEXT,
      onboarded_at INTEGER NOT NULL
    );
  `)

  db.exec(`
    CREATE TABLE IF NOT EXISTS chats (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      created_at INTEGER NOT NULL
    );
  `)

  db.exec(`
    CREATE TABLE IF NOT EXISTS chat_messages (
      id TEXT PRIMARY KEY,
      chat_id TEXT NOT NULL,
      role TEXT NOT NULL,
      content TEXT NOT NULL,
      attached_image_url TEXT,
      ocr_text TEXT,
      created_at INTEGER NOT NULL,
      FOREIGN KEY (chat_id) REFERENCES chats (id) ON DELETE CASCADE
    );
  `)

  db.exec(`
    CREATE TABLE IF NOT EXISTS subjects (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      emoji TEXT,
      color TEXT,
      created_at INTEGER NOT NULL
    );
  `)

  db.exec(`
    CREATE TABLE IF NOT EXISTS documents (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      path TEXT,
      type TEXT NOT NULL,
      ingest_date INTEGER NOT NULL,
      chunk_count INTEGER NOT NULL,
      subject_id TEXT,
      FOREIGN KEY (subject_id) REFERENCES subjects (id) ON DELETE SET NULL
    );
  `)

  db.exec(`
    CREATE TABLE IF NOT EXISTS flashcards (
      id TEXT PRIMARY KEY,
      subject_id TEXT NOT NULL,
      front TEXT NOT NULL,
      back TEXT NOT NULL,
      tags TEXT,
      interval INTEGER NOT NULL,
      ease REAL NOT NULL,
      reps INTEGER NOT NULL,
      due_date INTEGER NOT NULL,
      FOREIGN KEY (subject_id) REFERENCES subjects (id) ON DELETE CASCADE
    );
  `)

  db.exec(`
    CREATE TABLE IF NOT EXISTS quizzes (
      id TEXT PRIMARY KEY,
      subject_id TEXT NOT NULL,
      score INTEGER NOT NULL,
      total INTEGER NOT NULL,
      incorrect_answers TEXT,
      created_at INTEGER NOT NULL,
      FOREIGN KEY (subject_id) REFERENCES subjects (id) ON DELETE CASCADE
    );
  `)

  db.exec(`
    CREATE TABLE IF NOT EXISTS activities (
      id TEXT PRIMARY KEY,
      action TEXT NOT NULL,
      timestamp INTEGER NOT NULL
    );
  `)

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
  if (!db) initDb()
  return db!
}

// ── Models Operations ────────────────────────────────────────────────────────

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

// ── User Details Operations ──────────────────────────────────────────────────

const toSql = (v: unknown): string | number | null =>
  v === undefined ? null : (v as string | number | null)

export function getUserDetails(): UserDetails | null {
  const row = getDb().prepare('SELECT * FROM user_details WHERE id = 1').get() as any
  if (!row) return null
  return {
    nickname: row.nickname,
    age: row.age ?? undefined,
    educationLevel: row.education_level ?? undefined,
    subjects: row.subjects ? JSON.parse(row.subjects) : undefined,
    goal: row.goal ?? undefined,
    onboardedAt: row.onboarded_at
  }
}

export function saveUserDetails(input: UserDetailsInput): UserDetails {
  const now = Date.now()
  const existing = getDb().prepare('SELECT * FROM user_details WHERE id = 1').get() as any

  getDb()
    .prepare(
      `INSERT OR REPLACE INTO user_details (
        id, nickname, age, education_level, subjects, goal, onboarded_at
      ) VALUES (1, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      toSql(input.nickname),
      toSql(input.age ?? existing?.age),
      toSql(input.educationLevel ?? existing?.education_level),
      input.subjects !== undefined
        ? JSON.stringify(input.subjects)
        : toSql(existing?.subjects),
      toSql(input.goal ?? existing?.goal),
      now
    )

  return getUserDetails()!
}

// ── Chat History Operations ──────────────────────────────────────────────────

export function getChats(): ChatSession[] {
  return getDb()
    .prepare('SELECT * FROM chats ORDER BY created_at DESC')
    .all()
    .map((row: any) => ({
      id: row.id,
      title: row.title,
      createdAt: row.created_at
    }))
}

export function getChatMessages(chatId: string): ChatMessage[] {
  return getDb()
    .prepare('SELECT * FROM chat_messages WHERE chat_id = ? ORDER BY created_at ASC')
    .all(chatId)
    .map((row: any) => ({
      id: row.id,
      chatId: row.chat_id,
      role: row.role as 'user' | 'assistant',
      content: row.content,
      attachedImageUrl: row.attached_image_url ?? undefined,
      ocrText: row.ocr_text ?? undefined,
      createdAt: row.created_at
    }))
}

export function createChatSession(chatId: string, title: string): ChatSession {
  const now = Date.now()
  getDb()
    .prepare('INSERT OR IGNORE INTO chats (id, title, created_at) VALUES (?, ?, ?)')
    .run(chatId, title, now)

  const row = getDb().prepare('SELECT * FROM chats WHERE id = ?').get(chatId) as any
  return {
    id: row.id,
    title: row.title,
    createdAt: row.created_at
  }
}

export function saveChatMessage(msg: {
  id: string
  chatId: string
  role: 'user' | 'assistant'
  content: string
  attachedImageUrl?: string
  ocrText?: string
}): ChatMessage {
  const now = Date.now()
  const database = getDb()

  const existingChat = database.prepare('SELECT * FROM chats WHERE id = ?').get(msg.chatId)
  if (!existingChat) {
    const title = msg.content.substring(0, 30) || 'New Chat'
    createChatSession(msg.chatId, title)
  } else if (msg.role === 'user') {
    const chatDetails = existingChat as any
    if (chatDetails.title === 'New Chat' || chatDetails.title.startsWith('New Chat')) {
      const newTitle = msg.content.substring(0, 30) || 'Chat Session'
      database.prepare('UPDATE chats SET title = ? WHERE id = ?').run(newTitle, msg.chatId)
    }
  }

  database
    .prepare(
      `INSERT OR REPLACE INTO chat_messages (
        id, chat_id, role, content, attached_image_url, ocr_text, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      msg.id,
      msg.chatId,
      msg.role,
      msg.content,
      toSql(msg.attachedImageUrl),
      toSql(msg.ocrText),
      now
    )

  const row = database.prepare('SELECT * FROM chat_messages WHERE id = ?').get(msg.id) as any
  return {
    id: row.id,
    chatId: row.chat_id,
    role: row.role as 'user' | 'assistant',
    content: row.content,
    attachedImageUrl: row.attached_image_url ?? undefined,
    ocrText: row.ocr_text ?? undefined,
    createdAt: row.created_at
  }
}

export function deleteChatSession(chatId: string): void {
  const database = getDb()
  database.prepare('DELETE FROM chat_messages WHERE chat_id = ?').run(chatId)
  database.prepare('DELETE FROM chats WHERE id = ?').run(chatId)
}

// ── Subjects Operations ──────────────────────────────────────────────────────

export function getSubjects(): Subject[] {
  return getDb()
    .prepare('SELECT * FROM subjects ORDER BY created_at DESC')
    .all()
    .map((row: any) => ({
      id: row.id,
      name: row.name,
      emoji: row.emoji ?? '',
      color: row.color ?? '#9E97FF',
      createdAt: row.created_at
    }))
}

export function saveSubject(sub: Subject): Subject {
  const database = getDb()
  database
    .prepare(
      `INSERT OR REPLACE INTO subjects (
        id, name, emoji, color, created_at
      ) VALUES (?, ?, ?, ?, ?)`
    )
    .run(sub.id, sub.name, sub.emoji, sub.color, sub.createdAt)
  
  return sub
}

export function deleteSubject(id: string): void {
  const database = getDb()
  database.prepare('DELETE FROM subjects WHERE id = ?').run(id)
}

// ── Documents Operations ─────────────────────────────────────────────────────

export function getDocuments(): Document[] {
  return getDb()
    .prepare('SELECT * FROM documents ORDER BY ingest_date DESC')
    .all()
    .map((row: any) => ({
      id: row.id,
      name: row.name,
      path: row.path ?? undefined,
      type: row.type,
      ingestDate: row.ingest_date,
      chunkCount: row.chunk_count,
      subjectId: row.subject_id ?? undefined
    }))
}

export function saveDocument(doc: Document): Document {
  const database = getDb()
  database
    .prepare(
      `INSERT OR REPLACE INTO documents (
        id, name, path, type, ingest_date, chunk_count, subject_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
    .run(doc.id, doc.name, doc.path ?? null, doc.type, doc.ingestDate, doc.chunkCount, doc.subjectId ?? null)
  
  return doc
}

export function deleteDocument(id: string): void {
  const database = getDb()
  database.prepare('DELETE FROM documents WHERE id = ?').run(id)
}

// ── Flashcards Operations ────────────────────────────────────────────────────

export function getFlashcards(): Flashcard[] {
  return getDb()
    .prepare('SELECT * FROM flashcards ORDER BY due_date ASC')
    .all()
    .map((row: any) => ({
      id: row.id,
      subjectId: row.subject_id,
      front: row.front,
      back: row.back,
      tags: row.tags ? JSON.parse(row.tags) : [],
      interval: row.interval,
      ease: row.ease,
      reps: row.reps,
      dueDate: row.due_date
    }))
}

export function saveFlashcard(card: Flashcard): Flashcard {
  const database = getDb()
  database
    .prepare(
      `INSERT OR REPLACE INTO flashcards (
        id, subject_id, front, back, tags, interval, ease, reps, due_date
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      card.id,
      card.subjectId,
      card.front,
      card.back,
      card.tags ? JSON.stringify(card.tags) : null,
      card.interval,
      card.ease,
      card.reps,
      card.dueDate
    )
  
  return card
}

export function deleteFlashcard(id: string): void {
  const database = getDb()
  database.prepare('DELETE FROM flashcards WHERE id = ?').run(id)
}

// ── Quizzes Operations ───────────────────────────────────────────────────────

export function getQuizzes(): Quiz[] {
  return getDb()
    .prepare('SELECT * FROM quizzes ORDER BY created_at DESC')
    .all()
    .map((row: any) => ({
      id: row.id,
      subjectId: row.subject_id,
      score: row.score,
      total: row.total,
      incorrectAnswers: row.incorrect_answers ?? undefined,
      createdAt: row.created_at
    }))
}

export function saveQuiz(quiz: Quiz): Quiz {
  const database = getDb()
  database
    .prepare(
      `INSERT OR REPLACE INTO quizzes (
        id, subject_id, score, total, incorrect_answers, created_at
      ) VALUES (?, ?, ?, ?, ?, ?)`
    )
    .run(quiz.id, quiz.subjectId, quiz.score, quiz.total, quiz.incorrectAnswers ?? null, quiz.createdAt)
  
  return quiz
}

// ── Activities Operations ────────────────────────────────────────────────────

export function getActivities(): Activity[] {
  return getDb()
    .prepare('SELECT * FROM activities ORDER BY timestamp DESC LIMIT 50')
    .all()
    .map((row: any) => ({
      id: row.id,
      action: row.action,
      timestamp: row.timestamp
    }))
}

export function saveActivity(act: { action: string }): Activity {
  const database = getDb()
  const id = 'act-' + Math.random().toString(36).substring(2, 11)
  const timestamp = Date.now()
  database
    .prepare(
      `INSERT OR REPLACE INTO activities (
        id, action, timestamp
      ) VALUES (?, ?, ?)`
    )
    .run(id, act.action, timestamp)
  
  return { id, action: act.action, timestamp }
}