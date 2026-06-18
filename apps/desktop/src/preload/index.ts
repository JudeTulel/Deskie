import { contextBridge, ipcRenderer } from 'electron'
import type { ModelInput, StoredModel, UserDetails, UserDetailsInput, ChatSession, ChatMessage, Subject, Document, Flashcard, Quiz, Activity } from '../shared/models'

type ModelStatePayload = {
  models: StoredModel[]
  activeModel: StoredModel | null
}

contextBridge.exposeInMainWorld('qvacAPI', {
  loadModel: (modelSrc?: string): Promise<string> => ipcRenderer.invoke('load-model', modelSrc),
  infer: (history: { role: string; content: string }[]): Promise<void> =>
    ipcRenderer.invoke('infer', history),
  onCompletionStream: (cb: (token: string) => void): void => {
    ipcRenderer.on('completion-stream', (_event, token) => cb(token))
  },
  unloadModel: (): Promise<string> => ipcRenderer.invoke('unload-model'),
  runOCR: (imagePath: string): Promise<{ text: string; bbox?: any; confidence?: number }[]> =>
    ipcRenderer.invoke('run-ocr', imagePath),
  selectImage: (): Promise<{ path: string; previewUrl: string } | null> =>
    ipcRenderer.invoke('select-image'),
  selectFiles: (filters?: { name: string; extensions: string[] }[]): Promise<string[]> =>
    ipcRenderer.invoke('select-files', filters),
  getModelState: (): Promise<ModelStatePayload> => ipcRenderer.invoke('get-model-state'),
  saveModel: (model: ModelInput): Promise<ModelStatePayload> => ipcRenderer.invoke('save-model', model),
  setActiveModel: (id: string): Promise<ModelStatePayload> => ipcRenderer.invoke('set-active-model', id),

  // User details
  getUserDetails: (): Promise<UserDetails | null> => ipcRenderer.invoke('get-user-details'),
  saveUserDetails: (details: UserDetailsInput): Promise<UserDetails> => ipcRenderer.invoke('save-user-details', details),

  // Chats
  getChats: (): Promise<ChatSession[]> => ipcRenderer.invoke('get-chats'),
  getChatMessages: (chatId: string): Promise<ChatMessage[]> => ipcRenderer.invoke('get-chat-messages', chatId),
  createChatSession: (chatId: string, title: string): Promise<ChatSession> => ipcRenderer.invoke('create-chat-session', chatId, title),
  saveChatMessage: (msg: { id: string; chatId: string; role: 'user' | 'assistant'; content: string; attachedImageUrl?: string; ocrText?: string }): Promise<ChatMessage> => ipcRenderer.invoke('save-chat-message', msg),
  deleteChatSession: (chatId: string): Promise<{ success: boolean }> => ipcRenderer.invoke('delete-chat-session', chatId),

  // Subjects
  getSubjects: (): Promise<Subject[]> => ipcRenderer.invoke('get-subjects'),
  saveSubject: (sub: Subject): Promise<Subject> => ipcRenderer.invoke('save-subject', sub),
  deleteSubject: (id: string): Promise<{ success: boolean }> => ipcRenderer.invoke('delete-subject', id),

  // Documents
  getDocuments: (): Promise<Document[]> => ipcRenderer.invoke('get-documents'),
  saveDocument: (doc: Document): Promise<Document> => ipcRenderer.invoke('save-document', doc),
  deleteDocument: (id: string): Promise<{ success: boolean }> => ipcRenderer.invoke('delete-document', id),

  // Flashcards
  getFlashcards: (): Promise<Flashcard[]> => ipcRenderer.invoke('get-flashcards'),
  saveFlashcard: (card: Flashcard): Promise<Flashcard> => ipcRenderer.invoke('save-flashcard', card),
  deleteFlashcard: (id: string): Promise<{ success: boolean }> => ipcRenderer.invoke('delete-flashcard', id),
  generateFlashcards: (params: { subjectId: string; count: number }): Promise<Array<{ front: string; back: string }>> =>
  ipcRenderer.invoke('generate-flashcards', params),

  
  // Quizzes
  getQuizzes: (): Promise<Quiz[]> => ipcRenderer.invoke('get-quizzes'),
  saveQuiz: (quiz: Quiz): Promise<Quiz> => ipcRenderer.invoke('save-quiz', quiz),
  generateQuiz: (params: { subjectId: string; count: number }): Promise<Array<{ question: string; options: string[]; answer: string }>> =>
  ipcRenderer.invoke('generate-quiz', params),
  // Activities
  getActivities: (): Promise<Activity[]> => ipcRenderer.invoke('get-activities'),
  saveActivity: (act: { action: string }): Promise<Activity> => ipcRenderer.invoke('save-activity', act),

  // QVAC RAG
  ragIngest: (params: { filePath?: string; text?: string; subjectId?: string; docName?: string }): Promise<{ success: boolean; document: Document }> =>
    ipcRenderer.invoke('rag-ingest', params),
  ragSearch: (params: { query: string; subjectId?: string; topK?: number }): Promise<any[]> =>
    ipcRenderer.invoke('rag-search', params),

  // Audio Transcription
  transcribeAudio: (params: { filePath: string; subjectId?: string }): Promise<{ text: string }> =>
    ipcRenderer.invoke('transcribe-audio', params),

  // Model download
  downloadModel: (
    assetSrc: string,
    downloadId: string,
    hfToken?: string
  ): Promise<{ success: boolean; assetId?: string; localPath?: string; cancelled?: boolean }> =>
    ipcRenderer.invoke('download-model', assetSrc, downloadId, hfToken),

  cancelDownload: (downloadId: string): Promise<{ success: boolean; reason?: string }> =>
    ipcRenderer.invoke('cancel-download', downloadId),

  onDownloadProgress: (
    cb: (data: {
      downloadId: string
      percentage: number
      downloaded: number
      total: number
      downloadKey: string
    }) => void
  ): (() => void) => {
    const handler = (_event: Electron.IpcRendererEvent, data: any) => cb(data)
    ipcRenderer.on('download-progress', handler)
    return () => ipcRenderer.removeListener('download-progress', handler)
  }
})
