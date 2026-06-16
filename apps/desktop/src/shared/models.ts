export type ModelStatus = 'available' | 'queued' | 'downloading' | 'completed' | 'cancelled' | 'error'

export type ModelType = 'LLM' | 'Speech' | 'Other'

export interface StoredModel {
  id: string
  name: string
  assetSrc: string
  assetId?: string
  localPath?: string
  type: ModelType
  status: ModelStatus
  isActive: boolean
  createdAt: number
  updatedAt: number
}

export interface ModelInput {
  id?: string
  name: string
  assetSrc: string
  assetId?: string
  localPath?: string
  type?: ModelType
  status?: ModelStatus
  isActive?: boolean
}

export interface UserDetails {
  nickname: string
  name?: string
  surname?: string
  email?: string
  age?: string
  educationLevel?: string
  subjects?: string[]
  goal?: string
  onboardedAt: number
}

export interface UserDetailsInput {
  nickname: string
  name?: string
  surname?: string
  email?: string
  age?: string
  educationLevel?: string
  subjects?: string[]
  goal?: string
}

export interface ChatSession {
  id: string
  title: string
  createdAt: number
}

export interface ChatMessage {
  id: string
  chatId: string
  role: 'user' | 'assistant'
  content: string
  attachedImageUrl?: string
  ocrText?: string
  createdAt: number
}

export interface Subject {
  id: string
  name: string
  emoji: string
  color: string
  createdAt: number
}

export interface Document {
  id: string
  name: string
  path?: string
  type: string // 'pdf' | 'docx' | 'audio' | 'image'
  ingestDate: number
  chunkCount: number
  subjectId?: string
}

export interface Flashcard {
  id: string
  subjectId: string
  front: string
  back: string
  tags?: string[]
  interval: number
  ease: number
  reps: number
  dueDate: number
}

export interface Quiz {
  id: string
  subjectId: string
  score: number
  total: number
  incorrectAnswers?: string // JSON stringified array of incorrect questions/answers
  createdAt: number
}

export interface Activity {
  id: string
  action: string
  timestamp: number
}

