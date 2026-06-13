// ChatComponent.tsx
import { useEffect, useRef, useState } from 'react'
import ReactMarkdown from 'react-markdown'

type Message = { role: 'user' | 'assistant'; content: string }

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
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    window.qvacAPI.loadModel().then(() => setLoading(false))

    window.qvacAPI.onCompletionStream((token) => {
      if (token === '') {
        setProcessing(false)
        onMessageSent?.('')
      } else {
        setMessages(prev => {
          const updated = [...prev]
          updated[updated.length - 1].content += token
          return updated
        })
      }
    })

    return () => { window.qvacAPI.unloadModel() }
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = (): void => {
    if (!input.trim() || processing || loading) return

    const nextHistory: Message[] = [
      ...messages,
      { role: 'user', content: input }
    ]
    setMessages([...nextHistory, { role: 'assistant', content: '' }])
    window.qvacAPI.infer([
      { role: 'system', content: 'You are a helpful assistant.' },
      ...nextHistory
    ])
    setInput('')
    setProcessing(true)
    onMessageSent?.(input)
  }

  return (
    <div className={`flex flex-col ${className}`}>
      {/* Chat Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-zinc-800 rounded-t-lg">
        <h2 className="text-sm font-semibold">Deskmate AI</h2>
        <span className="flex items-center gap-1.5 text-xs text-zinc-400">
          <span className={`w-1.5 h-1.5 rounded-full ${loading ? 'bg-amber-400 animate-pulse' : 'bg-emerald-400'}`} />
          {loading ? 'Loading...' : 'Local AI Ready'}
        </span>
      </div>

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
                <div className="max-w-[80%] px-3 py-1.5 rounded-xl text-xs bg-indigo-600 text-white rounded-br-sm">
                  {msg.content}
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
        <div className="flex gap-2">
          <input
            type="text"
            className="flex-1 rounded-lg bg-zinc-800 px-3 py-1.5 text-xs outline-none placeholder:text-zinc-500 focus:ring-1 focus:ring-indigo-500/50"
            placeholder="Ask Deskmate..."
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                handleSend()
              }
            }}
          />
          <button
            onClick={handleSend}
            disabled={processing || loading}
            className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-500 transition-colors disabled:opacity-40"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  )
}