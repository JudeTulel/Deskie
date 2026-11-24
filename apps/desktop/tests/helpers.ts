import { vi } from 'vitest'
import type { Flashcard } from '../src/shared/models'

/**
 * A fully stubbed `window.qvacAPI` for renderer-store tests.
 * Every method is a vi.fn so tests can assert the IPC-shaped calls the stores make.
 */
export function createMockQvacApi() {
  const ok = { success: true }
  return {
    // models
    getModelState: vi.fn(async () => ({ models: [], activeModel: null })),
    saveModel: vi.fn(async () => ({ models: [], activeModel: null })),
    setActiveModel: vi.fn(async () => ({ models: [], activeModel: null })),
    loadModel: vi.fn(async () => 'loaded'),
    unloadModel: vi.fn(async () => 'unloaded'),
    infer: vi.fn(async () => {}),
    onCompletionStream: vi.fn(),
    runOCR: vi.fn(async () => []),
    selectImage: vi.fn(async () => null),
    selectFiles: vi.fn(async () => []),
    // user details
    getUserDetails: vi.fn(async () => null),
    saveUserDetails: vi.fn(async (d: any) => ({ ...d, onboardedAt: Date.now() })),
    // chats
    getChats: vi.fn(async () => []),
    getChatMessages: vi.fn(async () => []),
    createChatSession: vi.fn(async (c: any) => c),
    saveChatMessage: vi.fn(async (m: any) => ({ ...m, createdAt: Date.now() })),
    deleteChatSession: vi.fn(async () => ok),
    // subjects
    getSubjects: vi.fn(async () => []),
    saveSubject: vi.fn(async (s: any) => s),
    deleteSubject: vi.fn(async () => ok),
    // documents
    getDocuments: vi.fn(async () => []),
    saveDocument: vi.fn(async (d: any) => d),
    deleteDocument: vi.fn(async () => ok),
    // flashcards
    getFlashcards: vi.fn(async () => []),
    saveFlashcard: vi.fn(async (card: Flashcard) => card),
    deleteFlashcard: vi.fn(async () => ok),
    generateFlashcards: vi.fn(async () => []),
    // quizzes
    getQuizzes: vi.fn(async () => []),
    saveQuiz: vi.fn(async (q: any) => q),
    generateQuiz: vi.fn(async () => []),
    // activities
    getActivities: vi.fn(async () => []),
    saveActivity: vi.fn(async (a: { action: string }) => ({
      id: 'act-1',
      action: a.action,
      timestamp: Date.now()
    })),
    // rag / audio
    ragIngest: vi.fn(async () => ({
      success: true,
      document: {
        id: 'doc-1',
        name: 'doc',
        type: 'text',
        ingestDate: Date.now(),
        chunkCount: 1
      }
    })),
    ragSearch: vi.fn(async () => []),
    transcribeAudio: vi.fn(async () => ({ text: '' })),
    // downloads
    downloadModel: vi.fn(async () => ok),
    cancelDownload: vi.fn(async () => ok),
    onDownloadProgress: vi.fn(() => () => {})
  }
}

export type MockQvacApi = ReturnType<typeof createMockQvacApi>

/** Installs the stub on the jsdom `window` and returns it. */
export function installMockQvacApi(): MockQvacApi {
  const api = createMockQvacApi()
  ;(window as unknown as { qvacAPI: unknown }).qvacAPI = api
  return api
}

/** A baseline Flashcard with SM-2 defaults that individual tests can override. */
export function makeFlashcard(overrides: Partial<Flashcard> = {}): Flashcard {
  return {
    id: 'fc-test',
    subjectId: 'subj-test',
    front: 'Front?',
    back: 'Back',
    tags: [],
    interval: 0,
    ease: 2.5,
    reps: 0,
    dueDate: 0,
    ...overrides
  }
}
