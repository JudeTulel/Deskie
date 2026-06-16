import { create } from 'zustand'
import type { ChatSession, ChatMessage } from '../../../shared/models'

type ChatState = {
  chats: ChatSession[]
  activeChatId: string | null
  chatMessages: ChatMessage[]
  loadingHistory: boolean
  loadChats: () => Promise<void>
  loadChatMessages: (chatId: string) => Promise<void>
  saveMessage: (msg: {
    id: string
    chatId: string
    role: 'user' | 'assistant'
    content: string
    attachedImageUrl?: string
    ocrText?: string
  }) => Promise<ChatMessage>
  createChat: (chatId: string, title: string) => Promise<void>
  deleteChat: (chatId: string) => Promise<void>
  startNewChat: () => void
}

export const useChatStore = create<ChatState>((set, get) => ({
  chats: [],
  activeChatId: null,
  chatMessages: [],
  loadingHistory: false,

  loadChats: async () => {
    try {
      const chats = await window.qvacAPI.getChats()
      set({ chats })
    } catch (err) {
      console.error('[CHAT STORE] Failed to load chats:', err)
    }
  },

  loadChatMessages: async (chatId) => {
    set({ loadingHistory: true, activeChatId: chatId })
    try {
      const messages = await window.qvacAPI.getChatMessages(chatId)
      set({ chatMessages: messages, loadingHistory: false })
    } catch (err) {
      console.error('[CHAT STORE] Failed to load chat messages:', err)
      set({ loadingHistory: false })
    }
  },

  saveMessage: async (msg) => {
    try {
      const savedMsg = await window.qvacAPI.saveChatMessage(msg)
      set((state) => {
        // Only append to active messages if it belongs to the active chat
        const matchesActive = state.activeChatId === msg.chatId
        
        // Check if message already exists in list (avoid duplicates on stream starts/updates)
        const exists = state.chatMessages.some((m) => m.id === savedMsg.id)
        let newMessages = state.chatMessages
        if (matchesActive) {
          if (exists) {
            newMessages = state.chatMessages.map((m) => (m.id === savedMsg.id ? savedMsg : m))
          } else {
            newMessages = [...state.chatMessages, savedMsg]
          }
        }
        return { chatMessages: newMessages }
      })

      // Refresh chats list to update titles or ordering
      await get().loadChats()
      return savedMsg
    } catch (err) {
      console.error('[CHAT STORE] Failed to save message:', err)
      throw err
    }
  },

  createChat: async (chatId, title) => {
    try {
      await window.qvacAPI.createChatSession(chatId, title)
      set({ activeChatId: chatId, chatMessages: [] })
      await get().loadChats()
    } catch (err) {
      console.error('[CHAT STORE] Failed to create chat session:', err)
    }
  },

  deleteChat: async (chatId) => {
    try {
      await window.qvacAPI.deleteChatSession(chatId)
      if (get().activeChatId === chatId) {
        set({ activeChatId: null, chatMessages: [] })
      }
      await get().loadChats()
    } catch (err) {
      console.error('[CHAT STORE] Failed to delete chat:', err)
    }
  },

  startNewChat: () => {
    set({ activeChatId: null, chatMessages: [] })
  }
}))
