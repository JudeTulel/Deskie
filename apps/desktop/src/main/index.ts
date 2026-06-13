import { app, BrowserWindow, ipcMain } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import {
  LLAMA_3_2_1B_INST_Q4_0,
  loadModel,
  unloadModel,
  completion
} from '@qvac/sdk'

app.commandLine.appendSwitch('no-sandbox')

let win: BrowserWindow | null = null
let modelId: string | null = null

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
  ipcMain.handle('load-model', async () => {
    modelId = await loadModel({
      modelSrc: LLAMA_3_2_1B_INST_Q4_0,
      modelType: 'llm',
      onProgress: (progress) => console.log(progress)
    })
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
    if (!modelId) throw new Error('Model not loaded.')
    await unloadModel({ modelId })
    modelId = null
    return 'model unloaded'
  })
}

app.whenReady().then(() => {
  electronApp.setAppUserModelId('com.electron')
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })
  createWindow()
  setupHandlers()
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
