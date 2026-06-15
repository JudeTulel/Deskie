import { create } from 'zustand'
import type { ModelInput, StoredModel } from '../../../shared/models'

type ModelState = {
  models: StoredModel[]
  activeModel: StoredModel | null
  hydrated: boolean
  hydrate: () => Promise<void>
  saveModel: (model: ModelInput) => Promise<void>
  setActiveModel: (id: string) => Promise<void>
}

function applyModelState(
  set: (state: Partial<ModelState>) => void,
  payload: { models: StoredModel[]; activeModel: StoredModel | null }
): void {
  set({
    models: payload.models,
    activeModel: payload.activeModel,
    hydrated: true
  })
}

export const useModelStore = create<ModelState>((set) => ({
  models: [],
  activeModel: null,
  hydrated: false,
  hydrate: async () => {
    const payload = await window.qvacAPI.getModelState()
    applyModelState(set, payload)
  },
  saveModel: async (model) => {
    const payload = await window.qvacAPI.saveModel(model)
    applyModelState(set, payload)
  },
  setActiveModel: async (id) => {
    const payload = await window.qvacAPI.setActiveModel(id)
    applyModelState(set, payload)
  }
}))
