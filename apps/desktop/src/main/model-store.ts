import {
  initDb,
  getModels as dbGetModels,
  getActiveModel as dbGetActiveModel,
  upsertModel as dbUpsertModel,
  setActiveModel as dbSetActiveModel
} from '../../lib/db'
import type { ModelInput, StoredModel } from '../shared/models'

export function initModelStore(): void {
  initDb()
}

export function getModels(): StoredModel[] {
  return dbGetModels()
}

export function getActiveModel(): StoredModel | null {
  return dbGetActiveModel()
}

export function upsertModel(input: ModelInput): StoredModel {
  return dbUpsertModel(input)
}

export function setActiveModel(id: string): StoredModel {
  return dbSetActiveModel(id)
}
