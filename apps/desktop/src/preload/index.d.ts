declare global {
  interface Window {
    qvacAPI: {
      loadModel: () => Promise<string>
      infer: (history: { role: string; content: string }[]) => Promise<void>
      onCompletionStream: (cb: (token: string) => void) => void
      unloadModel: () => Promise<string>
    }
  }
}

export {}