import { create } from 'zustand'
import type { Subject, Document, Flashcard, Quiz, Activity } from '../../../shared/models'

export interface IngestionJob {
  id: string
  name: string
  stage: 'Extract' | 'Chunk' | 'Embed' | 'Index' | 'Done' | 'Error'
  percentage: number
  subjectId?: string
  error?: string
}

type StudyState = {
  subjects: Subject[]
  documents: Document[]
  flashcards: Flashcard[]
  quizzes: Quiz[]
  activities: Activity[]
  ingestionQueue: IngestionJob[]
  loading: boolean

  loadAll: () => Promise<void>
  
  // Subjects
  createSubject: (name: string, emoji: string, color: string) => Promise<Subject>
  deleteSubject: (id: string) => Promise<void>

  // Documents
  ingestFile: (filePath: string, subjectId: string) => Promise<void>
  ingestText: (title: string, text: string, subjectId: string) => Promise<void>
  deleteDocument: (id: string) => Promise<void>
  undoDocumentIngest: (docId: string) => Promise<void>

  // Flashcards
  createFlashcard: (subjectId: string, front: string, back: string, tags?: string[]) => Promise<Flashcard>
  deleteFlashcard: (id: string) => Promise<void>
  reviewFlashcard: (id: string, rating: number) => Promise<void> // rating: 1-5

  // Quizzes
  createQuiz: (subjectId: string, score: number, total: number, incorrectAnswers: string) => Promise<Quiz>

  // Audio Transcription
  transcribeLecture: (filePath: string, subjectId: string, onUpdate?: (text: string) => void) => Promise<string>
  
  // Activities
  addActivity: (action: string) => Promise<void>
}

export const useStudyStore = create<StudyState>((set, get) => ({
  subjects: [],
  documents: [],
  flashcards: [],
  quizzes: [],
  activities: [],
  ingestionQueue: [],
  loading: false,

  loadAll: async () => {
    set({ loading: true })
    try {
      const subjects = await window.qvacAPI.getSubjects()
      const documents = await window.qvacAPI.getDocuments()
      const flashcards = await window.qvacAPI.getFlashcards()
      const quizzes = await window.qvacAPI.getQuizzes()
      const activities = await window.qvacAPI.getActivities()
      set({ subjects, documents, flashcards, quizzes, activities })
    } catch (err) {
      console.error('[STUDY STORE] Failed to load data:', err)
    } finally {
      set({ loading: false })
    }
  },

  createSubject: async (name, emoji, color) => {
    const id = 'subj-' + Math.random().toString(36).substring(2, 11)
    const newSub: Subject = {
      id,
      name,
      emoji,
      color,
      createdAt: Date.now()
    }
    const saved = await window.qvacAPI.saveSubject(newSub)
    set((state) => ({ subjects: [saved, ...state.subjects] }))
    await get().addActivity(`Created new subject "${name}".`)
    return saved
  },

  deleteSubject: async (id) => {
    await window.qvacAPI.deleteSubject(id)
    set((state) => ({
      subjects: state.subjects.filter((s) => s.id !== id),
      documents: state.documents.filter((d) => d.subjectId !== id),
      flashcards: state.flashcards.filter((f) => f.subjectId !== id),
      quizzes: state.quizzes.filter((q) => q.subjectId !== id)
    }))
    await get().addActivity(`Deleted a subject.`)
  },

  ingestFile: async (filePath, subjectId) => {
    const fileName = filePath.split(/[\\/]/).pop() || 'File'
    const jobId = 'job-' + Math.random().toString(36).substring(2, 11)
    
    const newJob: IngestionJob = {
      id: jobId,
      name: fileName,
      stage: 'Extract',
      percentage: 10,
      subjectId
    }

    set((state) => ({ ingestionQueue: [newJob, ...state.ingestionQueue] }))

    const updateJobStage = (stage: IngestionJob['stage'], pct: number) => {
      set((state) => ({
        ingestionQueue: state.ingestionQueue.map((j) =>
          j.id === jobId ? { ...j, stage, percentage: pct } : j
        )
      }))
    }

    try {
      // Stage: Extracting text from document
      updateJobStage('Extract', 25)
      await new Promise((r) => setTimeout(r, 1000))

      // Stage: Chunking text
      updateJobStage('Chunk', 50)
      await new Promise((r) => setTimeout(r, 1000))

      // Stage: Generating Embeddings
      updateJobStage('Embed', 75)
      await new Promise((r) => setTimeout(r, 500))

      // Stage: Indexing vector database
      updateJobStage('Index', 90)

      // Invoke real SDK RAG Ingest
      const result = await window.qvacAPI.ragIngest({
        filePath,
        subjectId
      })

      if (result.success) {
        updateJobStage('Done', 100)
        set((state) => ({
          documents: [result.document, ...state.documents]
        }))
        // Refresh subjects/docs count
        const subjects = await window.qvacAPI.getSubjects()
        set({ subjects })
      } else {
        throw new Error('RAG Ingestion failed')
      }
    } catch (err: any) {
      console.error('[INGESTION] Failed:', err)
      set((state) => ({
        ingestionQueue: state.ingestionQueue.map((j) =>
          j.id === jobId ? { ...j, stage: 'Error', error: err.message || 'Ingestion failed' } : j
        )
      }))
    }
  },

  ingestText: async (title, text, subjectId) => {
    try {
      const result = await window.qvacAPI.ragIngest({
        text,
        subjectId,
        docName: title
      })

      if (result.success) {
        set((state) => ({
          documents: [result.document, ...state.documents]
        }))
        const subjects = await window.qvacAPI.getSubjects()
        set({ subjects })
      }
    } catch (err) {
      console.error('[INGEST] Text Ingestion failed:', err)
    }
  },

  deleteDocument: async (id) => {
    await window.qvacAPI.deleteDocument(id)
    set((state) => ({
      documents: state.documents.filter((d) => d.id !== id)
    }))
    const subjects = await window.qvacAPI.getSubjects()
    set({ subjects })
    await get().addActivity(`Deleted document.`)
  },

  undoDocumentIngest: async (docId) => {
    // In our simplified RAG model, we delete the document metadata and embeddings
    await get().deleteDocument(docId)
  },

  createFlashcard: async (subjectId, front, back, tags) => {
    const card: Flashcard = {
      id: 'fc-' + Math.random().toString(36).substring(2, 11),
      subjectId,
      front,
      back,
      tags: tags || [],
      interval: 0,
      ease: 2.5,
      reps: 0,
      dueDate: Date.now()
    }
    const saved = await window.qvacAPI.saveFlashcard(card)
    set((state) => ({ flashcards: [saved, ...state.flashcards] }))
    return saved
  },

  deleteFlashcard: async (id) => {
    await window.qvacAPI.deleteFlashcard(id)
    set((state) => ({
      flashcards: state.flashcards.filter((f) => f.id !== id)
    }))
  },

  reviewFlashcard: async (id, rating) => {
    const card = get().flashcards.find((f) => f.id === id)
    if (!card) return

    // SM-2 Spaced Repetition Algorithm
    let reps = card.reps
    let interval = card.interval
    let ease = card.ease

    if (rating >= 3) {
      if (reps === 0) {
        interval = 1
      } else if (reps === 1) {
        interval = 6
      } else {
        interval = Math.ceil(interval * ease)
      }
      reps += 1
    } else {
      reps = 0
      interval = 1
    }

    ease = ease + (0.1 - (5 - rating) * (0.08 + (5 - rating) * 0.02))
    if (ease < 1.3) ease = 1.3

    const updatedCard: Flashcard = {
      ...card,
      reps,
      interval,
      ease,
      dueDate: Date.now() + interval * 24 * 60 * 60 * 1000
    }

    const saved = await window.qvacAPI.saveFlashcard(updatedCard)
    set((state) => ({
      flashcards: state.flashcards.map((f) => (f.id === id ? saved : f))
    }))

    // Add activity log
    await get().addActivity(`Reviewed flashcard: Score ${rating}/5.`)
  },

  createQuiz: async (subjectId, score, total, incorrectAnswers) => {
    const quiz: Quiz = {
      id: 'qz-' + Math.random().toString(36).substring(2, 11),
      subjectId,
      score,
      total,
      incorrectAnswers,
      createdAt: Date.now()
    }
    const saved = await window.qvacAPI.saveQuiz(quiz)
    set((state) => ({ quizzes: [saved, ...state.quizzes] }))
    await get().addActivity(`Completed quiz: Scored ${score}/${total}.`)
    return saved
  },

  transcribeLecture: async (filePath, subjectId, onUpdate) => {
    try {
      onUpdate?.('Uploading file to speech model...')
      // Call the transcribe-audio handler in the main process
      const result = await window.qvacAPI.transcribeAudio({ filePath, subjectId })
      const text = result.text
      onUpdate?.('Transcription completed!')
      
      // Auto ingest transcription into vector store
      const docName = 'Transcript_' + new Date().toLocaleDateString().replace(/\//g, '-') + '.txt'
      await get().ingestText(docName, text, subjectId)
      
      return text
    } catch (err: any) {
      console.error('[SPEECH] Transcription failed:', err)
      onUpdate?.('Error: ' + (err.message || 'Transcription failed.'))
      throw err
    }
  },

  addActivity: async (action) => {
    const saved = await window.qvacAPI.saveActivity({ action })
    set((state) => ({ activities: [saved, ...state.activities.slice(0, 49)] }))
  }
}))
