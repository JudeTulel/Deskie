import type { ModelInput, StoredModel, UserDetails, UserDetailsInput, ChatSession, ChatMessage, Subject, Document, Flashcard, Quiz, Activity } from '../shared/models'

type ModelStatePayload = {
  models: StoredModel[]
  activeModel: StoredModel | null
}

declare global {
  interface Window {
    qvacAPI: {
      loadModel: (modelSrc?: string) => Promise<string>
      infer: (history: { role: string; content: string }[]) => Promise<void>
      onCompletionStream: (cb: (token: string) => void) => void
      unloadModel: () => Promise<string>
      runOCR: (imagePath: string) => Promise<{ text: string; bbox?: any; confidence?: number }[]>
      selectImage: () => Promise<{ path: string; previewUrl: string } | null>
      selectFiles: (filters?: { name: string; extensions: string[] }[]) => Promise<string[]>
      getModelState: () => Promise<ModelStatePayload>
      saveModel: (model: ModelInput) => Promise<ModelStatePayload>
      setActiveModel: (id: string) => Promise<ModelStatePayload>
      getUserDetails: () => Promise<UserDetails | null>
      saveUserDetails: (details: UserDetailsInput) => Promise<UserDetails>
      getChats: () => Promise<ChatSession[]>
      getChatMessages: (chatId: string) => Promise<ChatMessage[]>
      createChatSession: (chatId: string, title: string) => Promise<ChatSession>
      saveChatMessage: (msg: { id: string; chatId: string; role: 'user' | 'assistant'; content: string; attachedImageUrl?: string; ocrText?: string }) => Promise<ChatMessage>
      deleteChatSession: (chatId: string) => Promise<{ success: boolean }>
      // Quiz Generation
      generateFlashcards: (params: { subjectId: string; count: number }) => Promise<Array<{ front: string; back: string }>>
      generateQuiz: (params: { subjectId: string; count: number }) => Promise<Array<{ question: string; options: string[]; answer: string }>>

      // Subjects
      getSubjects: () => Promise<Subject[]>
      saveSubject: (sub: Subject) => Promise<Subject>
      deleteSubject: (id: string) => Promise<{ success: boolean }>

      // Documents
      getDocuments: () => Promise<Document[]>
      saveDocument: (doc: Document) => Promise<Document>
      deleteDocument: (id: string) => Promise<{ success: boolean }>

      // Flashcards
      getFlashcards: () => Promise<Flashcard[]>
      saveFlashcard: (card: Flashcard) => Promise<Flashcard>
      deleteFlashcard: (id: string) => Promise<{ success: boolean }>

      // Quizzes
      getQuizzes: () => Promise<Quiz[]>
      saveQuiz: (quiz: Quiz) => Promise<Quiz>

      // Activities
      getActivities: () => Promise<Activity[]>
      saveActivity: (act: { action: string }) => Promise<Activity>

      // RAG
      ragIngest: (params: { filePath?: string; text?: string; subjectId?: string; docName?: string }) => Promise<{ success: boolean; document: Document }>
      ragSearch: (params: { query: string; subjectId?: string; topK?: number }) => Promise<any[]>

      // Audio Transcription
      transcribeAudio: (params: { filePath: string; subjectId?: string }) => Promise<{ text: string }>
      downloadModel: (
        assetSrc: string,
        downloadId: string
      ) => Promise<{ success: boolean; assetId?: string; localPath?: string; cancelled?: boolean }>
      cancelDownload: (downloadId: string) => Promise<{ success: boolean; reason?: string }>
      onDownloadProgress: (
        cb: (data: {
          downloadId: string
          percentage: number
          downloaded: number
          total: number
          downloadKey: string
        }) => void
      ) => () => void
    }
  }
}

export { }
