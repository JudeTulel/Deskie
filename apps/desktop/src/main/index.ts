import { app, BrowserWindow, ipcMain, dialog } from 'electron'
import { join } from 'path'
import * as fs from 'fs'
import * as path from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import {
  loadModel,
  unloadModel,
  completion,
  ocr,
  OCR_LATIN_RECOGNIZER_1,
  EMBEDDINGGEMMA_300M_Q4_0,
  downloadAsset,
  cancel,
  getModelInfo,
  ragIngest,
  ragSearch,
  transcribe
} from '@qvac/sdk'
import mammoth from 'mammoth'
import { PDFParse } from 'pdf-parse'
import { getActiveModel, getModels, initModelStore, setActiveModel, upsertModel } from './model-store'
import {
  getUserDetails,
  saveUserDetails,
  getChats,
  getChatMessages,
  saveChatMessage,
  createChatSession,
  deleteChatSession,
  getSubjects,
  saveSubject,
  deleteSubject,
  getDocuments,
  saveDocument,
  deleteDocument,
  getFlashcards,
  saveFlashcard,
  deleteFlashcard,
  getQuizzes,
  saveQuiz,
  getActivities,
  saveActivity
} from '../../lib/db'
import type { ModelInput, StoredModel } from '../shared/models'

app.commandLine.appendSwitch('no-sandbox')

let win: BrowserWindow | null = null

// ── LLM model state (for completions) ─────────────────────────────────────────
let modelId: string | null = null
let loadModelPromise: Promise<string> | null = null
let modelClientCount = 0
let loadedModelSrc: string | null = null

// ── Embedding model state (for RAG ingest/search) ─────────────────────────────
let embeddingModelId: string | null = null
let loadEmbeddingPromise: Promise<string> | null = null

async function getCachedModelPath(modelSrc: string): Promise<string | undefined> {
  try {
    const info = await getModelInfo({ name: modelSrc })
    return info.cacheFiles.find((file) => file.isCached)?.path
  } catch (error) {
    console.warn('[MODEL] Could not resolve cached model path:', error)
    return undefined
  }
}

async function extractTextFromFile(filePath: string): Promise<string> {
  const ext = path.extname(filePath).toLowerCase()
  if (ext === '.txt' || ext === '.md' || ext === '.json' || ext === '.html' || ext === '.xml') {
    return await fs.promises.readFile(filePath, 'utf8')
  } else if (ext === '.docx') {
    const result = await mammoth.extractRawText({ path: filePath })
    return result.value
  } else if (ext === '.pdf') {
    const dataBuffer = await fs.promises.readFile(filePath)
    const parser = new PDFParse({ data: dataBuffer })
    const result = await parser.getText()
    await parser.destroy()
    return result.text
  } else {
    throw new Error(`Unsupported file type for text extraction: ${ext}`)
  }
}

// Ensures the LLM (completion) model is loaded, reusing any in-flight promise
async function ensureLLMLoaded(modelSrc: string): Promise<string> {
  if (modelId && loadedModelSrc === modelSrc) {
    return modelId
  }

  if (modelId && loadedModelSrc !== modelSrc) {
    console.log('[LLM] Different model requested, unloading previous.')
    await unloadModel({ modelId })
    modelId = null
    loadedModelSrc = null
  }

  if (loadModelPromise) {
    console.log('[LLM] Load already in progress, waiting...')
    return await loadModelPromise
  }

  console.log('[LLM] Loading model:', modelSrc)
  loadModelPromise = loadModel({
    modelSrc,
    modelType: 'llamacpp-completion'
  })
    .then((id) => {
      modelId = id
      loadedModelSrc = modelSrc
      return id
    })
    .finally(() => {
      loadModelPromise = null
    })

  return await loadModelPromise
}

// Ensures the embedding model is loaded, reusing any in-flight promise
async function ensureEmbeddingLoaded(): Promise<string> {
  if (embeddingModelId) {
    return embeddingModelId
  }

  if (loadEmbeddingPromise) {
    console.log('[EMBED] Load already in progress, waiting...')
    return await loadEmbeddingPromise
  }

  console.log('[EMBED] Loading embedding model:', EMBEDDINGGEMMA_300M_Q4_0)
  loadEmbeddingPromise = loadModel({
    modelSrc: EMBEDDINGGEMMA_300M_Q4_0,
  })
    .then((id) => {
      embeddingModelId = id
      return id
    })
    .finally(() => {
      loadEmbeddingPromise = null
    })

  return await loadEmbeddingPromise
}

async function runOCRInternal(imagePath: string): Promise<{ text: string; bbox?: any; confidence?: number }[]> {
  console.log(`[OCR] Loading OCR model: ${OCR_LATIN_RECOGNIZER_1}`)
  const ocrModelId = await loadModel({
    modelSrc: OCR_LATIN_RECOGNIZER_1,
    modelConfig: {
      langList: ['en'],
      useGPU: true,
      timeout: 30000,
      magRatio: 1.5,
      defaultRotationAngles: [90, 180, 270],
      contrastRetry: false,
      lowConfidenceThreshold: 0.5,
      recognizerBatchSize: 1
    }
  })

  try {
    console.log(`[OCR] Running OCR on: ${imagePath}`)
    const { blocks } = ocr({
      modelId: ocrModelId,
      image: imagePath,
      options: { paragraph: false }
    })
    const result = await blocks
    console.log(`[OCR] OCR finished. Extracted ${result.length} blocks.`)
    return result
  } catch (error) {
    console.error('[OCR] Error during OCR processing:', error)
    throw error
  } finally {
    console.log('[OCR] Unloading OCR model...')
    await unloadModel({ modelId: ocrModelId })
  }
}

function createWindow(): void {
  win = new BrowserWindow({
    height: 670,
    show: false,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  win.on('ready-to-show', () => win!.show())

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    win.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    win.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

function setupHandlers(): void {
  // ── Native File Picker ────────────────────────────────────────────────────
  ipcMain.handle('select-files', async (_event, filters?: { name: string; extensions: string[] }[]) => {
    if (!win) return []
    const defaultFilters = filters || [
      { name: 'Documents', extensions: ['pdf', 'docx', 'txt', 'md', 'json', 'html', 'xml'] },
      { name: 'Images', extensions: ['jpg', 'jpeg', 'png', 'bmp'] },
      { name: 'Audio', extensions: ['mp3', 'wav', 'ogg', 'm4a', 'flac'] },
      { name: 'All Files', extensions: ['*'] }
    ]
    const result = await dialog.showOpenDialog(win, {
      properties: ['openFile', 'multiSelections'],
      filters: defaultFilters
    })
    if (result.canceled) return []
    return result.filePaths
  })

  ipcMain.handle('get-model-state', async () => ({
    models: getModels(),
    activeModel: getActiveModel()
  }))

  ipcMain.handle('get-user-details', async () => {
    return getUserDetails()
  })

  ipcMain.handle('save-user-details', async (_event, details) => {
    return saveUserDetails(details)
  })

  ipcMain.handle('get-chats', async () => {
    return getChats()
  })

  ipcMain.handle('get-chat-messages', async (_event, chatId: string) => {
    return getChatMessages(chatId)
  })

  ipcMain.handle('create-chat-session', async (_event, chatId: string, title: string) => {
    return createChatSession(chatId, title)
  })

  ipcMain.handle('save-chat-message', async (_event, msg) => {
    return saveChatMessage(msg)
  })

  ipcMain.handle('delete-chat-session', async (_event, chatId: string) => {
    deleteChatSession(chatId)
    return { success: true }
  })

  // ── Subjects Handlers ──────────────────────────────────────────────────────
  ipcMain.handle('get-subjects', async () => {
    return getSubjects()
  })

  ipcMain.handle('save-subject', async (_event, sub) => {
    return saveSubject(sub)
  })

  ipcMain.handle('delete-subject', async (_event, id: string) => {
    deleteSubject(id)
    return { success: true }
  })

  // ── Documents Handlers ─────────────────────────────────────────────────────
  ipcMain.handle('get-documents', async () => {
    return getDocuments()
  })

  ipcMain.handle('save-document', async (_event, doc) => {
    return saveDocument(doc)
  })

  ipcMain.handle('delete-document', async (_event, id: string) => {
    deleteDocument(id)
    return { success: true }
  })

  // ── Flashcards Handlers ────────────────────────────────────────────────────
  ipcMain.handle('get-flashcards', async () => {
    return getFlashcards()
  })

  ipcMain.handle('save-flashcard', async (_event, card) => {
    return saveFlashcard(card)
  })

  ipcMain.handle('delete-flashcard', async (_event, id: string) => {
    deleteFlashcard(id)
    return { success: true }
  })

  // ── Quizzes Handlers ───────────────────────────────────────────────────────
  ipcMain.handle('get-quizzes', async () => {
    return getQuizzes()
  })

  ipcMain.handle('save-quiz', async (_event, quiz) => {
    return saveQuiz(quiz)
  })

  // ── Activities Handlers ────────────────────────────────────────────────────
  ipcMain.handle('get-activities', async () => {
    return getActivities()
  })

  ipcMain.handle('save-activity', async (_event, act) => {
    return saveActivity(act)
  })

  // ── QVAC SDK RAG Ingestion Handler ─────────────────────────────────────────
  ipcMain.handle('rag-ingest', async (_event, { filePath, text, subjectId, docName }) => {
    const activeModel = getActiveModel()
    const modelSrc = activeModel?.localPath ?? activeModel?.assetId ?? activeModel?.assetSrc
    if (!modelSrc) throw new Error('No active model selected. Please select a model in Settings.')

    // Ensure both models are ready in parallel
    const [, embedId] = await Promise.all([
      ensureLLMLoaded(modelSrc),
      ensureEmbeddingLoaded()
    ])

    let docText = text || ''
    let name = docName || 'Untitled Document'
    let fileType = 'txt'

    if (filePath) {
      name = path.basename(filePath)
      const ext = path.extname(filePath).toLowerCase().replace('.', '')
      fileType = ['jpeg', 'jpg', 'png', 'bmp'].includes(ext) ? 'image' : ext

      if (fileType === 'image') {
        const ocrResults = await runOCRInternal(filePath)
        docText = ocrResults.map(b => b.text).join('\n')
      } else {
        docText = await extractTextFromFile(filePath)
      }
    }

    if (!docText.trim()) {
      throw new Error('No text could be extracted from this file.')
    }

    const workspaceName = subjectId || 'default-workspace'
    console.log(`[RAG] Ingesting "${name}" into workspace "${workspaceName}" (${docText.length} chars)`)

    // ragIngest uses the embedding model, not the LLM
    const ingestResult = await ragIngest({
      modelId: embedId,
      documents: [docText],
      workspace: workspaceName,
      chunkOpts: {
        chunkSize: 256,
        chunkOverlap: 50
      }
    })

    const chunkCount = ingestResult.processed?.length || 1

    const docId = 'doc-' + Math.random().toString(36).substring(2, 11)
    const newDoc = saveDocument({
      id: docId,
      name,
      path: filePath ?? undefined,
      type: fileType,
      ingestDate: Date.now(),
      chunkCount,
      subjectId
    })

    saveActivity({ action: `Ingested document "${name}" into subject.` })

    return { success: true, document: newDoc }
  })

  // ── QVAC SDK RAG Search Handler ────────────────────────────────────────────
  ipcMain.handle('rag-search', async (_event, { query, subjectId, topK = 5 }) => {
    const activeModel = getActiveModel()
    const modelSrc = activeModel?.localPath ?? activeModel?.assetId ?? activeModel?.assetSrc
    if (!modelSrc) throw new Error('No active model selected.')

    // Ensure both models are ready in parallel
    const [, embedId] = await Promise.all([
      ensureLLMLoaded(modelSrc),
      ensureEmbeddingLoaded()
    ])

    const workspaceName = subjectId || 'default-workspace'
    console.log(`[RAG] Searching workspace "${workspaceName}" for "${query}"`)

    // ragSearch also uses the embedding model to vectorise the query
    const results = await ragSearch({
      modelId: embedId,
      query,
      topK,
      workspace: workspaceName
    })

    return results
  })

  // ── QVAC SDK Audio Transcription Handler ───────────────────────────────────
  ipcMain.handle('transcribe-audio', async (_event, { filePath, subjectId: _subjectId }) => {
    const models = getModels()
    const whisperModel: StoredModel | undefined =
      models.find(m => m.type === 'Speech' && m.isActive) ||
      models.find(m => m.type === 'Speech')

    const src = whisperModel?.localPath ?? whisperModel?.assetId ?? whisperModel?.assetSrc ??
      'https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-tiny.bin'

    console.log(`[Whisper] Loading speech model: ${src}`)
    const whisperModelId = await loadModel({
      modelSrc: src,
      modelType: 'whisper'
    })

    try {
      console.log(`[Whisper] Transcribing: ${filePath}`)
      const text = await transcribe({
        modelId: whisperModelId,
        audioChunk: filePath
      })
      saveActivity({ action: `Transcribed audio and generated text.` })
      return { text }
    } finally {
      console.log('[Whisper] Unloading speech model...')
      await unloadModel({ modelId: whisperModelId })
    }
  })

  ipcMain.handle('save-model', async (_event, input: ModelInput) => {
    upsertModel(input)
    return {
      models: getModels(),
      activeModel: getActiveModel()
    }
  })

  ipcMain.handle('set-active-model', async (_event, id: string) => {
    let activeModel = setActiveModel(id)
    if (!activeModel.localPath) {
      const localPath = await getCachedModelPath(activeModel.assetSrc)
      if (localPath) {
        activeModel = upsertModel({ ...activeModel, localPath, isActive: true })
      }
    }
    const nextModelSrc = activeModel.localPath ?? activeModel.assetId ?? activeModel.assetSrc

    if (modelId && loadedModelSrc !== nextModelSrc) {
      await unloadModel({ modelId })
      modelId = null
      loadedModelSrc = null
    }

    return {
      models: getModels(),
      activeModel
    }
  })

  ipcMain.handle('load-model', async (_event, modelSrc?: string) => {
    modelClientCount += 1
    const activeModel = getActiveModel()
    const src = modelSrc ?? activeModel?.localPath ?? activeModel?.assetId ?? activeModel?.assetSrc
    if (!src) throw new Error('No active model selected.')
    await ensureLLMLoaded(src)
    return 'model loaded'
  })

  ipcMain.handle('infer', async (_event, history) => {
    if (!modelId) throw new Error('Model not loaded.')

    const result = completion({ modelId, history, stream: true })
    for await (const token of result.tokenStream) {
      win?.webContents.send('completion-stream', token)
    }
    win?.webContents.send('completion-stream', '')
  })

  ipcMain.handle('unload-model', async () => {
    modelClientCount = Math.max(0, modelClientCount - 1)

    if (loadModelPromise) {
      await loadModelPromise
    }

    if (modelClientCount > 0) {
      console.log('[LLM] Model still in use, skipping unload.')
      return 'model unloaded'
    }

    if (!modelId) {
      console.log('[LLM] Model already unloaded.')
      return 'model unloaded'
    }

    await unloadModel({ modelId })
    modelId = null
    loadedModelSrc = null
    return 'model unloaded'
  })

  ipcMain.handle('run-ocr', async (_event, imagePath: string) => {
    console.log(`[OCR] Loading OCR model: ${OCR_LATIN_RECOGNIZER_1}`)
    const ocrModelId = await loadModel({
      modelSrc: OCR_LATIN_RECOGNIZER_1,
      modelConfig: {
        langList: ['en'],
        useGPU: true,
        timeout: 30000,
        magRatio: 1.5,
        defaultRotationAngles: [90, 180, 270],
        contrastRetry: false,
        lowConfidenceThreshold: 0.5,
        recognizerBatchSize: 1
      }
    })

    try {
      console.log(`[OCR] Running OCR on: ${imagePath}`)
      const { blocks } = ocr({
        modelId: ocrModelId,
        image: imagePath,
        options: { paragraph: false }
      })
      const result = await blocks
      console.log(`[OCR] OCR finished. Extracted ${result.length} blocks.`)
      return result
    } catch (error) {
      console.error('[OCR] Error during OCR processing:', error)
      throw error
    } finally {
      console.log('[OCR] Unloading OCR model...')
      await unloadModel({ modelId: ocrModelId })
    }
  })

  ipcMain.handle('select-image', async () => {
    if (!win) return null

    const result = await dialog.showOpenDialog(win, {
      properties: ['openFile'],
      filters: [{ name: 'Images', extensions: ['jpg', 'jpeg', 'png', 'bmp'] }]
    })

    if (result.canceled || result.filePaths.length === 0) return null

    const filePath = result.filePaths[0]
    try {
      const ext = path.extname(filePath).toLowerCase().replace('.', '')
      const mimeType = ext === 'png' ? 'image/png' : ext === 'bmp' ? 'image/bmp' : 'image/jpeg'
      const data = await fs.promises.readFile(filePath)
      const dataUrl = `data:${mimeType};base64,${data.toString('base64')}`
      return { path: filePath, previewUrl: dataUrl }
    } catch (err) {
      console.error('[OCR] Failed to read selected image:', err)
      throw err
    }
  })

  // ── Model Download ──────────────────────────────────────────────────────────
  const activeDownloads = new Map<string, string>()

  ipcMain.handle('download-model', async (_event, assetSrc: string, downloadId: string) => {
    console.log(`[DOWNLOAD] Starting download: ${assetSrc}`)

    const op = downloadAsset({
      assetSrc,
      onProgress: (progress) => {
        win?.webContents.send('download-progress', {
          downloadId,
          percentage: progress.percentage ?? 0,
          downloaded: progress.downloaded ?? 0,
          total: progress.total ?? 0,
          downloadKey: progress.downloadKey ?? ''
        })
      }
    })

    activeDownloads.set(downloadId, op.requestId)

    try {
      const assetId = await op
      const localPath = await getCachedModelPath(assetSrc)
      activeDownloads.delete(downloadId)
      console.log(`[DOWNLOAD] Completed: ${assetId}`)
      return { success: true, assetId, localPath }
    } catch (err: any) {
      activeDownloads.delete(downloadId)
      if (err?.name === 'InferenceCancelledError') {
        console.log(`[DOWNLOAD] Cancelled: ${downloadId}`)
        return { success: false, cancelled: true }
      }
      console.error(`[DOWNLOAD] Failed:`, err)
      throw err
    }
  })

  ipcMain.handle('cancel-download', async (_event, downloadId: string) => {
    const requestId = activeDownloads.get(downloadId)
    if (!requestId) return { success: false, reason: 'not-found' }
    try {
      await cancel({ requestId })
      activeDownloads.delete(downloadId)
      return { success: true }
    } catch (err) {
      console.error('[DOWNLOAD] Cancel error:', err)
      return { success: false, reason: String(err) }
    }
  })
}

app.whenReady().then(() => {
  electronApp.setAppUserModelId('com.electron')
  initModelStore()
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })
  createWindow()
  setupHandlers()

  // Pre-download & warm up the embedding model in the background
  // so it's ready before the user tries to ingest anything
  console.log('[EMBED] Pre-loading embedding model on startup...')
  ensureEmbeddingLoaded()
    .then(() => console.log('[EMBED] Embedding model ready.'))
    .catch((err) => console.warn('[EMBED] Background embedding preload failed:', err))
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})