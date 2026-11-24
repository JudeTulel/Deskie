import { beforeEach, describe, expect, it } from 'vitest'
import { installMockQvacApi, type MockQvacApi } from './helpers'
import { useModelStore } from '../src/renderer/src/stores/modelStore'
import { useUserStore } from '../src/renderer/src/stores/userStore'
import { useChatStore } from '../src/renderer/src/stores/chatStore'

let api: MockQvacApi

beforeEach(() => {
  api = installMockQvacApi()
  useModelStore.setState({ models: [], activeModel: null, hydrated: false })
  useUserStore.setState({ userDetails: null, hydrated: false })
  useChatStore.setState({
    chats: [],
    activeChatId: null,
    chatMessages: [],
    loadingHistory: false
  })
})

describe('modelStore', () => {
  it('hydrate applies the model-state payload and marks the store hydrated', async () => {
    const model = {
      id: 'm1',
      name: 'Test model',
      assetSrc: 'hf:test/model',
      type: 'LLM' as const,
      status: 'completed' as const,
      isActive: true,
      createdAt: 1,
      updatedAt: 2
    }
    const payload = { models: [model], activeModel: model }
    api.getModelState.mockResolvedValue(payload as any)

    await useModelStore.getState().hydrate()

    expect(api.getModelState).toHaveBeenCalledTimes(1)
    expect(useModelStore.getState().models).toEqual([model])
    expect(useModelStore.getState().activeModel).toBe(model)
    expect(useModelStore.getState().hydrated).toBe(true)
  })

  it('saveModel and setActiveModel apply the payload returned over IPC', async () => {
    const payload = { models: [], activeModel: null }
    api.saveModel.mockResolvedValue(payload as any)
    api.setActiveModel.mockResolvedValue(payload as any)

    await useModelStore.getState().saveModel({ name: 'M', assetSrc: 'hf:x' })
    expect(api.saveModel).toHaveBeenCalledWith({ name: 'M', assetSrc: 'hf:x' })

    await useModelStore.getState().setActiveModel('m1')
    expect(api.setActiveModel).toHaveBeenCalledWith('m1')

    expect(useModelStore.getState().hydrated).toBe(true)
    expect(useModelStore.getState().activeModel).toBeNull()
  })
})

describe('userStore', () => {
  it('hydrate stores the details returned by IPC', async () => {
    const details = { nickname: 'Ada', onboardedAt: 123 }
    api.getUserDetails.mockResolvedValue(details as any)

    await useUserStore.getState().hydrate()

    expect(useUserStore.getState().userDetails).toEqual(details)
    expect(useUserStore.getState().hydrated).toBe(true)
  })

  it('hydrate still marks hydrated when IPC fails', async () => {
    const errorSpy = console.error
    console.error = () => {}
    api.getUserDetails.mockRejectedValue(new Error('offline'))

    try {
      await useUserStore.getState().hydrate()
      expect(useUserStore.getState().hydrated).toBe(true)
      expect(useUserStore.getState().userDetails).toBeNull()
    } finally {
      console.error = errorSpy
    }
  })
})

describe('chatStore', () => {
  it('saveMessage appends to the active chat, dedupes by id and ignores other chats', async () => {
    useChatStore.setState({ activeChatId: 'c1' })
    const msg = { id: 'm1', chatId: 'c1', role: 'user' as const, content: 'hello' }

    await useChatStore.getState().saveMessage(msg)
    expect(useChatStore.getState().chatMessages).toHaveLength(1)

    await useChatStore.getState().saveMessage({ ...msg, content: 'hello edited' })
    expect(useChatStore.getState().chatMessages).toHaveLength(1)
    expect(useChatStore.getState().chatMessages[0].content).toBe('hello edited')

    await useChatStore.getState().saveMessage({ ...msg, id: 'm2', chatId: 'c2' })
    expect(useChatStore.getState().chatMessages).toHaveLength(1)
  })

  it('startNewChat clears the active chat and its messages', () => {
    useChatStore.setState({
      activeChatId: 'c1',
      chatMessages: [
        { id: 'm1', chatId: 'c1', role: 'user', content: 'hi', createdAt: 1 }
      ]
    })

    useChatStore.getState().startNewChat()

    expect(useChatStore.getState().activeChatId).toBeNull()
    expect(useChatStore.getState().chatMessages).toEqual([])
  })
})
