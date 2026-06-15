import { contextBridge, ipcRenderer } from 'electron'
import type { ModelInput, StoredModel } from '../shared/models'

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
  getModelState: (): Promise<ModelStatePayload> => ipcRenderer.invoke('get-model-state'),
  saveModel: (model: ModelInput): Promise<ModelStatePayload> => ipcRenderer.invoke('save-model', model),
  setActiveModel: (id: string): Promise<ModelStatePayload> => ipcRenderer.invoke('set-active-model', id),

  // Model download
  downloadModel: (
    assetSrc: string,
    downloadId: string
  ): Promise<{ success: boolean; assetId?: string; localPath?: string; cancelled?: boolean }> =>
    ipcRenderer.invoke('download-model', assetSrc, downloadId),

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
