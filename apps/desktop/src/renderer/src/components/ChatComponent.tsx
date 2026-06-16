// ChatComponent.tsx
import { useEffect, useRef, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import { useModelStore } from '../stores/modelStore'
import { useChatStore } from '../stores/chatStore'
import book from '../assets/images/book.png'

type Message = {
  role: 'user' | 'assistant'
  content: string
  attachedImageUrl?: string
  ocrText?: string
}

interface ChatComponentProps {
  className?: string
  maxHeight?: string
  onMessageSent?: (message: string) => void
}

export function ChatComponent({ className = '', maxHeight = '400px', onMessageSent }: ChatComponentProps) {
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [showHistory, setShowHistory] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  const [attachedImage, setAttachedImage] = useState<{ path: string; previewUrl: string } | null>(null)
  const [ocrLoading, setOcrLoading] = useState(false)
  const [ocrText, setOcrText] = useState<string | null>(null)
  
  const { activeModel, hydrate: hydrateModels } = useModelStore()
  const {
    chats,
    activeChatId,
    chatMessages,
    loadChats,
    loadChatMessages,
    saveMessage,
    deleteChat
  } = useChatStore()

  const assistantResponseRef = useRef('')

  useEffect(() => {
    window.qvacAPI.onCompletionStream((token) => {
      if (token === '') {
        setProcessing(false)
        onMessageSent?.('')
        
        // Save the finished assistant message to SQLite DB
        const currentChatId = useChatStore.getState().activeChatId || ''
        const assistantMsgId = 'msg-' + Math.random().toString(36).substring(2, 11)
        saveMessage({
          id: assistantMsgId,
          chatId: currentChatId,
          role: 'assistant',
          content: assistantResponseRef.current
        })
      } else {
        assistantResponseRef.current += token
        setMessages(prev => {
          const updated = [...prev]
          if (updated.length > 0) {
            updated[updated.length - 1].content += token
          }
          return updated
        })
      }
    })

    hydrateModels()
    loadChats()
  }, [])

  // Start a new chat if none is active
  useEffect(() => {
    if (!activeChatId) {
      const newChatId = 'req-' + Math.random().toString(36).substring(2, 11)
      useChatStore.setState({ activeChatId: newChatId, chatMessages: [] })
    }
  }, [activeChatId])

  // Sync messages from store chatMessages
  useEffect(() => {
    setMessages(
      chatMessages.map((m) => ({
        role: m.role,
        content: m.content,
        attachedImageUrl: m.attachedImageUrl,
        ocrText: m.ocrText
      }))
    )
  }, [chatMessages])

  useEffect(() => {
    let cancelled = false

    setLoading(true)
    window.qvacAPI
      .loadModel(activeModel?.localPath ?? activeModel?.assetId ?? activeModel?.assetSrc)
      .then(() => {
        if (!cancelled) setLoading(false)
      })
      .catch((error) => {
        console.error('[LLM] Failed to load active model:', error)
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
      window.qvacAPI.unloadModel()
    }
  }, [activeModel?.id])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleAttachClick = async () => {
    try {
      const selected = await window.qvacAPI.selectImage()
      if (!selected) return

      setAttachedImage({ path: selected.path, previewUrl: selected.previewUrl })
      setOcrLoading(true)
      setOcrText(null)

      try {
        const results = await window.qvacAPI.runOCR(selected.path)
        if (results && results.length > 0) {
          const text = results.map(b => b.text).join('\n')
          setOcrText(text)
        } else {
          setOcrText('(No text detected)')
        }
      } catch (err) {
        console.error('OCR processing failed:', err)
        setOcrText('(OCR failed to process image)')
      } finally {
        setOcrLoading(false)
      }
    } catch (err) {
      console.error('[OCR] Selection failed:', err)
    }
  }

  const handleRemoveAttachment = () => {
    setAttachedImage(null)
    setOcrText(null)
  }

  const handleSend = (): void => {
    if ((!input.trim() && !attachedImage) || processing || loading || ocrLoading) return

    const userMessage: Message = {
      role: 'user',
      content: input,
      attachedImageUrl: attachedImage?.previewUrl || undefined,
      ocrText: ocrText || undefined
    }

    const currentChatId = activeChatId || 'req-' + Math.random().toString(36).substring(2, 11)
    if (!activeChatId) {
      useChatStore.setState({ activeChatId: currentChatId })
    }

    const userMsgId = 'msg-' + Math.random().toString(36).substring(2, 11)
    saveMessage({
      id: userMsgId,
      chatId: currentChatId,
      role: 'user',
      content: input,
      attachedImageUrl: attachedImage?.previewUrl || undefined,
      ocrText: ocrText || undefined
    })

    assistantResponseRef.current = ''
    setMessages(prev => [...prev, userMessage, { role: 'assistant', content: '' }])

    // Convert history for LLM, prepending OCR text context to user message
    const formattedHistory = [
      { role: 'system', content: 'You are a helpful assistant.' },
      ...messages.map(msg => ({
        role: msg.role,
        content: msg.content
      })),
      {
        role: 'user',
        content: ocrText
          ? `[Attached Image OCR Text: "${ocrText}"]\n\n${input}`
          : input
      }
    ]

    window.qvacAPI.infer(formattedHistory)
    setInput('')
    setAttachedImage(null)
    setOcrText(null)
    setProcessing(true)
    onMessageSent?.(input)
  }

  return (
    <div className={`flex flex-col relative ${className}`}>
      {/* Chat Header */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-zinc-800 rounded-t-lg relative z-30">
        <div className="flex items-center gap-2">
          {/* History Icon (Placeholder from assets folder) */}
          <img
            src={book}
            onClick={() => setShowHistory(!showHistory)}
            className="w-4 h-4 cursor-pointer opacity-75 hover:opacity-100 hover:scale-105 transition-all brightness-0 invert"
            alt="Chat History"
            title="Chat History"
          />
          <h2 className="text-xs font-semibold">Deskmate AI</h2>
        </div>
        <span className="flex items-center gap-1.5 text-[10px] text-zinc-400">
          <span className={`w-1.5 h-1.5 rounded-full ${loading ? 'bg-amber-400 animate-pulse' : 'bg-emerald-400'}`} />
          {loading ? 'Loading...' : activeModel?.name ?? 'Local AI Ready'}
        </span>
      </div>

      {/* History Slide-down Overlay */}
      {showHistory && (
        <div className="absolute top-[38px] left-0 right-0 z-20 bg-zinc-800 border-b border-zinc-700 max-h-60 overflow-y-auto p-3 flex flex-col gap-2 shadow-lg animate-fadeIn">
          <div className="flex items-center justify-between pb-2 border-b border-zinc-700/60">
            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Previous Chats</span>
            <button
              onClick={() => {
                const newChatId = 'req-' + Math.random().toString(36).substring(2, 11)
                useChatStore.setState({ activeChatId: newChatId, chatMessages: [] })
                setShowHistory(false)
              }}
              className="text-[10px] font-semibold text-indigo-400 hover:text-indigo-300 transition-colors px-2 py-0.5 rounded bg-indigo-500/10 hover:bg-indigo-500/20"
            >
              + New Chat
            </button>
          </div>
          {chats.length === 0 ? (
            <div className="text-center text-zinc-500 text-xs py-4 font-mono">No previous chats.</div>
          ) : (
            <div className="flex flex-col gap-1">
              {chats.map((chat) => (
                <div
                  key={chat.id}
                  onClick={() => {
                    loadChatMessages(chat.id)
                    setShowHistory(false)
                  }}
                  className={`flex items-center justify-between p-2 rounded-lg text-xs cursor-pointer transition-colors group/item ${
                    activeChatId === chat.id
                      ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/30'
                      : 'bg-zinc-900/40 text-zinc-300 hover:bg-zinc-700/50'
                  }`}
                >
                  <div className="flex-1 min-w-0 pr-2">
                    <p className="font-medium truncate">{chat.title}</p>
                    <p className="text-[9px] text-zinc-500 mt-0.5">
                      {new Date(chat.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      deleteChat(chat.id)
                    }}
                    className="p-1 text-zinc-500 hover:text-red-400 transition-colors opacity-0 group-hover/item:opacity-100"
                    title="Delete Chat"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Messages Container */}
      <div 
        className="flex-1 overflow-y-auto px-3 py-2 space-y-2 bg-zinc-900/50"
        style={{ maxHeight, minHeight: '200px' }}
      >
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="flex gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-zinc-600 animate-bounce [animation-delay:0ms]" />
              <span className="w-1.5 h-1.5 rounded-full bg-zinc-600 animate-bounce [animation-delay:150ms]" />
              <span className="w-1.5 h-1.5 rounded-full bg-zinc-600 animate-bounce [animation-delay:300ms]" />
            </div>
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center text-zinc-500 text-xs py-8">
            Ask me about your studies! 📚
          </div>
        ) : (
          messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              {msg.role === 'user' ? (
                <div className="max-w-[80%] flex flex-col gap-1.5 items-end">
                  {msg.attachedImageUrl && (
                    <img
                      src={msg.attachedImageUrl}
                      alt="User attachment"
                      className="w-32 h-auto max-h-32 object-cover rounded-lg border border-indigo-500/30 shadow-md animate-fadeIn"
                    />
                  )}
                  {msg.content && (
                    <div className="px-3 py-1.5 rounded-xl text-xs bg-indigo-600 text-white rounded-br-sm whitespace-pre-wrap">
                      {msg.content}
                    </div>
                  )}
                </div>
              ) : (
                <div className="max-w-[80%] px-3 py-1.5 rounded-xl text-xs bg-zinc-800 text-zinc-100 rounded-bl-sm prose prose-invert prose-xs max-w-none">
                  <ReactMarkdown>{msg.content}</ReactMarkdown>
                </div>
              )}
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input Area */}
      <div className="p-2 border-t border-zinc-800 bg-zinc-900 rounded-b-lg">
        {/* Attached Image Preview Card */}
        {attachedImage && (
          <div className="mb-2 p-2 rounded-lg bg-zinc-800/80 border border-zinc-700/50 flex items-center justify-between gap-3 relative animate-fadeIn">
            <div className="flex items-center gap-3 min-w-0">
              <div className="relative w-12 h-12 flex-shrink-0">
                <img
                  src={attachedImage.previewUrl}
                  alt="Attached"
                  className="w-full h-full object-cover rounded-lg border border-zinc-700"
                />
                {ocrLoading && (
                  <div className="absolute inset-0 bg-black/70 rounded-lg flex items-center justify-center">
                    <svg className="animate-spin h-5 w-5 text-indigo-400" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                  </div>
                )}
              </div>
              
              <div className="flex-1 min-w-0">
                <p className="text-[10px] text-zinc-400 font-medium truncate">
                  {attachedImage.path.split(/[\\/]/).pop()}
                </p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className={`w-1.5 h-1.5 rounded-full ${ocrLoading ? 'bg-amber-400 animate-pulse' : 'bg-emerald-400'}`} />
                  <span className="text-[10px] text-zinc-500 font-medium">
                    {ocrLoading ? 'Extracting text (OCR)...' : 'Text extracted!'}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1.5 flex-shrink-0">
              {!ocrLoading && ocrText && ocrText !== '(No text detected)' && ocrText !== '(OCR failed to process image)' && (
                <button
                  type="button"
                  onClick={() => setInput(prev => prev + (prev ? ' ' : '') + ocrText)}
                  title="Insert extracted text into input"
                  className="px-2 py-1 rounded bg-zinc-700 hover:bg-zinc-600 border border-zinc-600 text-zinc-300 text-[10px] font-medium transition-colors"
                >
                  Insert Text
                </button>
              )}
              <button
                type="button"
                onClick={handleRemoveAttachment}
                className="p-1 rounded-full hover:bg-zinc-700 text-zinc-400 hover:text-zinc-200 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        )}

        <div className="flex gap-2 items-center">
          {/* Attachment Button */}
          <button
            type="button"
            onClick={handleAttachClick}
            disabled={processing || loading || ocrLoading}
            title="Attach image for OCR"
            className="p-2 rounded-lg bg-zinc-800 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700 transition-colors disabled:opacity-40"
          >
            <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
            </svg>
          </button>

          <input
            type="text"
            className="flex-1 rounded-lg bg-zinc-800 px-3 py-1.5 text-xs outline-none placeholder:text-zinc-500 focus:ring-1 focus:ring-indigo-500/50"
            placeholder={ocrLoading ? "Extracting text..." : "Ask Deskmate..."}
            value={input}
            onChange={e => setInput(e.target.value)}
            disabled={ocrLoading}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                handleSend()
              }
            }}
          />
          <button
            type="button"
            onClick={handleSend}
            disabled={processing || loading || ocrLoading}
            className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-500 transition-colors disabled:opacity-40"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  )
}
