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
