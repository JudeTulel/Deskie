import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * Mock electron so the real preload script can be imported in jsdom.
 * `exposeInMainWorld` is what actually puts qvacAPI on `window`, so the object
 * captured from it IS the bridge contract the renderer relies on.
 */
const bridge = vi.hoisted(() => ({
  exposeInMainWorld: vi.fn(),
  invoke: vi.fn(),
  on: vi.fn(),
  removeListener: vi.fn()
}))

vi.mock('electron', () => ({
  contextBridge: { exposeInMainWorld: bridge.exposeInMainWorld },
  ipcRenderer: {
    invoke: bridge.invoke,
    on: bridge.on,
    removeListener: bridge.removeListener
  }
}))

type BridgeApi = Record<string, (...args: any[]) => any>

describe('preload IPC contract', () => {
  let api: BridgeApi

  beforeAll(async () => {
    await import('../src/preload/index')
    expect(bridge.exposeInMainWorld).toHaveBeenCalledWith('qvacAPI', expect.any(Object))
    api = bridge.exposeInMainWorld.mock.calls[0][1] as BridgeApi
  })

  beforeEach(() => {
    // clearMocks in the config clears call history; re-seed a default IPC reply.
    bridge.invoke.mockResolvedValue([])
  })

  it('exposes the complete expected qvacAPI surface on the window bridge', () => {
    const expected = [
      'loadModel', 'infer', 'onCompletionStream', 'unloadModel', 'runOCR',
      'selectImage', 'selectFiles', 'getModelState', 'saveModel', 'setActiveModel',
      'getUserDetails', 'saveUserDetails', 'getChats', 'getChatMessages',
      'createChatSession', 'saveChatMessage', 'deleteChatSession', 'getSubjects',
      'saveSubject', 'deleteSubject', 'getDocuments', 'saveDocument', 'deleteDocument',
      'getFlashcards', 'saveFlashcard', 'deleteFlashcard', 'generateFlashcards',
      'getQuizzes', 'saveQuiz', 'generateQuiz', 'getActivities', 'saveActivity',
      'ragIngest', 'ragSearch', 'transcribeAudio', 'downloadModel', 'cancelDownload',
      'onDownloadProgress'
    ]
    // Check the required core surface rather than exact equality: the bridge is
    // allowed to grow new methods (e.g. scrapeUrl / transcribeAudioBlob).
    expected.forEach((key) => expect(typeof api[key], key).toBe('function'))
    Object.entries(api).forEach(([key, fn]) => expect(typeof fn, key).toBe('function'))
  })

  it('routes subject, document, flashcard, quiz and activity getters to the right channels', async () => {
    await api.getSubjects()
    expect(bridge.invoke).toHaveBeenCalledWith('get-subjects')
    await api.getDocuments()
    expect(bridge.invoke).toHaveBeenCalledWith('get-documents')
    await api.getFlashcards()
    expect(bridge.invoke).toHaveBeenCalledWith('get-flashcards')
    await api.getQuizzes()
    expect(bridge.invoke).toHaveBeenCalledWith('get-quizzes')
    await api.getActivities()
    expect(bridge.invoke).toHaveBeenCalledWith('get-activities')
    await api.getModelState()
    expect(bridge.invoke).toHaveBeenCalledWith('get-model-state')
    await api.getUserDetails()
    expect(bridge.invoke).toHaveBeenCalledWith('get-user-details')
    await api.getChats()
    expect(bridge.invoke).toHaveBeenCalledWith('get-chats')
  })

  it('forwards arguments through to the corresponding IPC channel', async () => {
    await api.saveFlashcard({ id: 'fc-1' })
    expect(bridge.invoke).toHaveBeenCalledWith('save-flashcard', { id: 'fc-1' })

    await api.ragIngest({ text: 'hello', subjectId: 's1' })
    expect(bridge.invoke).toHaveBeenCalledWith('rag-ingest', {
      text: 'hello',
      subjectId: 's1'
    })

    await api.transcribeAudio({ filePath: '/tmp/audio.wav', subjectId: 's1' })
    expect(bridge.invoke).toHaveBeenCalledWith('transcribe-audio', {
      filePath: '/tmp/audio.wav',
      subjectId: 's1'
    })

    await api.deleteSubject('s1')
    expect(bridge.invoke).toHaveBeenCalledWith('delete-subject', 's1')
  })

  it('onCompletionStream forwards streamed tokens to the callback', () => {
    const cb = vi.fn()
    api.onCompletionStream(cb)

    expect(bridge.on).toHaveBeenCalledWith('completion-stream', expect.any(Function))
    const handler = bridge.on.mock.calls[bridge.on.mock.calls.length - 1][1]
    handler({}, 'a token')
    expect(cb).toHaveBeenCalledWith('a token')
  })

  it('onDownloadProgress forwards progress and returns an unsubscribe function', () => {
    const cb = vi.fn()
    const unsubscribe = api.onDownloadProgress(cb)

    expect(bridge.on).toHaveBeenCalledWith('download-progress', expect.any(Function))
    const handler = bridge.on.mock.calls[bridge.on.mock.calls.length - 1][1]
    const progress = {
      downloadId: 'd1',
      percentage: 50,
      downloaded: 5,
      total: 10,
      downloadKey: 'key'
    }
    handler({}, progress)
    expect(cb).toHaveBeenCalledWith(progress)

    unsubscribe()
    expect(bridge.removeListener).toHaveBeenCalledWith('download-progress', handler)
  })
})
