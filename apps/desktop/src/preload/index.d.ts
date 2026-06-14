import type { ModelInput, StoredModel } from '../shared/models'

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
      getModelState: () => Promise<ModelStatePayload>
      saveModel: (model: ModelInput) => Promise<ModelStatePayload>
      setActiveModel: (id: string) => Promise<ModelStatePayload>
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

export {}
