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
  downloadAsset,
  cancel,
  getModelInfo
} from '@qvac/sdk'
import { getActiveModel, getModels, initModelStore, setActiveModel, upsertModel } from './model-store'
import type { ModelInput } from '../shared/models'

app.commandLine.appendSwitch('no-sandbox')

let win: BrowserWindow | null = null
let modelId: string | null = null
let loadModelPromise: Promise<string> | null = null
let modelClientCount = 0
let loadedModelSrc: string | null = null

async function getCachedModelPath(modelSrc: string): Promise<string | undefined> {
  try {
    const info = await getModelInfo({ name: modelSrc })
    return info.cacheFiles.find((file) => file.isCached)?.path
  } catch (error) {
    console.warn('[MODEL] Could not resolve cached model path:', error)
    return undefined
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
  ipcMain.handle('get-model-state', async () => ({
    models: getModels(),
    activeModel: getActiveModel()
  }))

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

    if (!src) {
      throw new Error('No active model selected.')
    }

    if (modelId && loadedModelSrc === src) {
      console.log('[LLM] Model already loaded, skipping load.')
      return 'model loaded'
    }

    if (modelId && loadedModelSrc !== src) {
      await unloadModel({ modelId })
      modelId = null
      loadedModelSrc = null
    }

    if (!loadModelPromise) {
      loadModelPromise = loadModel({
        modelSrc: src,
        modelType: 'llm',
        onProgress: (progress) => console.log(progress)
      })
        .then((loadedModelId) => {
          modelId = loadedModelId
          loadedModelSrc = src
          return loadedModelId
        })
        .finally(() => {
          loadModelPromise = null
        })
    } else {
      console.log('[LLM] Model load already in progress, waiting for it.')
    }

    await loadModelPromise
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
      console.log('[LLM] Model already unloaded, skipping unload.')
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
        options: {
          paragraph: false
        }
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

    if (result.canceled || result.filePaths.length === 0) {
      return null
    }

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

  // ── Model Download ──────────────────────────────────────────────────────
  const activeDownloads = new Map<string, string>() // downloadId → requestId

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
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
