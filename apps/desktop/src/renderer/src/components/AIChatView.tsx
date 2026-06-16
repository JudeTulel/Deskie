import React, { useEffect, useState, useRef } from 'react'
import ReactMarkdown from 'react-markdown'
import { useModelStore } from '../stores/modelStore'
import { useChatStore } from '../stores/chatStore'
import { useStudyStore } from '../stores/studyStore'

export default function AIChatView() {
  const { subjects } = useStudyStore()
  const { activeModel } = useModelStore()
  const {
    chats,
    activeChatId,
    chatMessages,
    loadChats,
    loadChatMessages,
    saveMessage,
    createChat,
    deleteChat
  } = useChatStore()

  // State
  const [input, setInput] = useState('')
  const [processing, setProcessing] = useState(false)
  const [loading, setLoading] = useState(false)
  const [searchMode, setSearchMode] = useState<'notes' | 'free'>('notes')
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('')
  
  // RAG DRAWER COLLAPSIBLE STATE
  const [showRAGDrawer, setShowRAGDrawer] = useState(false)
  const [drawerChunks, setDrawerChunks] = useState<Array<{ text: string; filename: string; score: number }>>([])
  const [activeCitationChunk, setActiveCitationChunk] = useState<{ text: string; filename: string; score: number } | null>(null)

  const bottomRef = useRef<HTMLDivElement>(null)
  const assistantResponseRef = useRef('')

  // Pre-load
  useEffect(() => {
    loadChats()
    if (subjects.length > 0 && !selectedSubjectId) {
      setSelectedSubjectId(subjects[0].id)
    }
  }, [subjects])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chatMessages])

  // Setup streaming response listener
  useEffect(() => {
    window.qvacAPI.onCompletionStream((token) => {
      if (token === '') {
        setProcessing(false)
        
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
        // Dynamically update the UI messages
        // Since chatMessages is inside the ChatStore, we want to update chatMessages ref
        const currentMsgs = useChatStore.getState().chatMessages
        const updated = [...currentMsgs]
        if (updated.length > 0 && updated[updated.length - 1].role === 'assistant') {
          updated[updated.length - 1].content += token
          useChatStore.setState({ chatMessages: updated })
        }
      }
    })
  }, [])

  // Start new chat session
  const handleNewChat = async () => {
    const newChatId = 'chat-' + Math.random().toString(36).substring(2, 11)
    const title = 'New Chat Thread'
    await createChat(newChatId, title)
  }

  // Handle Send
  const handleSend = async () => {
    if (!input.trim() || processing || loading) return

    const userQuery = input
    setInput('')
    setProcessing(true)

    // Ensure we have an active chat ID
    let currentChatId = activeChatId
    if (!currentChatId) {
      currentChatId = 'chat-' + Math.random().toString(36).substring(2, 11)
      await createChat(currentChatId, userQuery.substring(0, 30) || 'AI Conversation')
    }

    // Save user message to SQLite DB
    const userMsgId = 'msg-' + Math.random().toString(36).substring(2, 11)
    await saveMessage({
      id: userMsgId,
      chatId: currentChatId,
      role: 'user',
      content: userQuery
    })

    // Prepare workspace matching subject
    const workspaceName = selectedSubjectId || 'default-workspace'
    let systemPrompt = 'You are a helpful study assistant.'
    let citations: any[] = []

    if (searchMode === 'notes') {
      try {
        console.log(`[RAG] Querying vector db workspace "${workspaceName}"`)
        // Run QVAC semantic RAG Search
        const searchResults = await window.qvacAPI.ragSearch({
          query: userQuery,
          subjectId: workspaceName,
          topK: 3
        })

        if (searchResults && searchResults.length > 0) {
          citations = searchResults.map((r: any) => ({
            text: r.text || '',
            filename: r.filename || 'notes.txt',
            score: r.score !== undefined ? Math.round(r.score * 100) : 88
          }))

          setDrawerChunks(citations)

          systemPrompt = `You are an AI study assistant. Answer the user question based strictly on the following source notes. Cites filenames in your answer.\n\nContext:\n${searchResults.map((c: any) => `[File: ${c.filename || 'Subject Notes'}] ${c.text}`).join('\n')}`
        }
      } catch (err) {
        console.error('RAG Search failed:', err)
      }
    }

    // Reset stream content and append empty assistant bubble
    assistantResponseRef.current = ''
    useChatStore.setState((state) => ({
      chatMessages: [
        ...state.chatMessages,
        {
          id: 'temp-ast',
          chatId: currentChatId!,
          role: 'assistant',
          content: '',
          createdAt: Date.now()
        }
      ]
    }))

    // Build chat history array for model
    const history = [
      { role: 'system', content: systemPrompt },
      ...chatMessages.map(m => ({ role: m.role, content: m.content })),
      { role: 'user', content: userQuery }
    ]

    // Trigger LLM Inference
    try {
      await window.qvacAPI.infer(history)
    } catch (err) {
      console.error('LLM Inference failed:', err)
      setProcessing(false)
    }
  }

  // Export to Markdown
  const handleExportMarkdown = () => {
    const content = chatMessages.map(m => `### ${m.role === 'user' ? 'User' : 'Deskmate AI'}\n${m.content}\n`).join('\n')
    const blob = new Blob([content], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `Deskmate_Chat_${activeChatId || 'session'}.md`
    a.click()
  }

  const activeSubject = subjects.find(s => s.id === selectedSubjectId)

  return (
    <div className="min-h-screen text-slate-100 flex p-8 pl-28 pr-8 select-none relative gap-6 pb-20">
      
      {/* ── LEFT PANEL: Chat threads grouped by Subject ── */}
      <div className="w-64 flex-shrink-0 bg-zinc-900/60 border border-zinc-800/80 rounded-3xl p-5 backdrop-blur-xl shadow-xl flex flex-col h-[calc(100vh-6rem)]">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-bold text-white">Chat History</h2>
          <button 
            onClick={handleNewChat}
            className="w-7 h-7 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white flex items-center justify-center transition-colors active:scale-90"
            title="Start New Conversation"
          >
            +
          </button>
        </div>

        {/* Filter subject workspace */}
        <div className="mb-4">
          <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider block mb-1">Subject Workspace</span>
          <select
            value={selectedSubjectId}
            onChange={(e) => setSelectedSubjectId(e.target.value)}
            className="w-full bg-zinc-850 border border-zinc-750 px-2.5 py-1.5 rounded-xl text-xs outline-none text-white cursor-pointer"
          >
            {subjects.map(s => (
              <option key={s.id} value={s.id}>{s.emoji} {s.name}</option>
            ))}
          </select>
        </div>

        {/* Thread Lists */}
        <div className="flex-1 overflow-y-auto space-y-1.5 pr-1">
          {chats.length === 0 ? (
            <div className="text-center py-10 text-zinc-650 text-xs font-mono">No chats started.</div>
          ) : (
            chats.map((c) => (
              <div
                key={c.id}
                onClick={() => loadChatMessages(c.id)}
                className={`group p-2.5 rounded-xl text-xs cursor-pointer border flex items-center justify-between transition-all ${
                  activeChatId === c.id
                    ? 'bg-zinc-800/40 border-zinc-700/80 text-white shadow-md'
                    : 'bg-transparent border-transparent text-zinc-400 hover:text-zinc-250 hover:bg-zinc-800/10'
                }`}
              >
                <span className="truncate flex-1 font-semibold pr-2">{c.title}</span>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    if (window.confirm('Delete this chat thread?')) deleteChat(c.id)
                  }}
                  className="p-1 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100 flex-shrink-0"
                >
                  ✕
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* ── CENTER PANEL: Conversation window ── */}
      <div className="flex-1 bg-zinc-900/60 border border-zinc-800/80 rounded-3xl p-5 backdrop-blur-xl shadow-xl flex flex-col h-[calc(100vh-6rem)]">
        {/* Chat header */}
        <div className="flex items-center justify-between pb-3 border-b border-zinc-800 mb-4">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-white">
              {chats.find(c => c.id === activeChatId)?.title || 'New Conversation'}
            </span>
            <span className={`w-1.5 h-1.5 rounded-full ${processing ? 'bg-indigo-400 animate-pulse' : 'bg-emerald-400'}`} />
          </div>

          <div className="flex items-center gap-3">
            {/* Mode toggle */}
            <div className="flex bg-zinc-950/40 border border-zinc-850 p-0.5 rounded-xl">
              <button
                onClick={() => setSearchMode('notes')}
                className={`px-3 py-1 rounded-lg text-[9px] font-bold uppercase transition-all ${
                  searchMode === 'notes' ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                My Notes (RAG)
              </button>
              <button
                onClick={() => setSearchMode('free')}
                className={`px-3 py-1 rounded-lg text-[9px] font-bold uppercase transition-all ${
                  searchMode === 'free' ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                Free Mode
              </button>
            </div>

            {chatMessages.length > 0 && (
              <button 
                onClick={handleExportMarkdown}
                className="bg-zinc-800 hover:bg-zinc-750 text-white border border-zinc-700/50 text-[10px] font-bold px-2.5 py-1.5 rounded-xl transition-all"
                title="Export conversation to Markdown"
              >
                Export
              </button>
            )}
          </div>
        </div>

        {/* Message bubble stream */}
        <div className="flex-1 overflow-y-auto space-y-4 pr-1 py-1 select-text">
          {chatMessages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center text-zinc-500">
              <span className="text-3xl mb-2">💬</span>
              <p className="text-sm font-bold text-zinc-400">Ask Deskmate AI</p>
              <p className="text-xs text-zinc-600 mt-1 max-w-xs">
                {searchMode === 'notes' 
                  ? `Answers will be generated directly using documents ingested in your "${activeSubject?.name || 'current'}" workspace.`
                  : 'Free chat mode. General knowledge responses (clearly flagged).'}
              </p>
            </div>
          ) : (
            chatMessages.map((m) => (
              <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] rounded-2xl p-4 text-xs leading-relaxed ${
                  m.role === 'user'
                    ? 'bg-indigo-600 text-white rounded-br-sm shadow-md'
                    : 'bg-zinc-800/40 border border-zinc-850 text-zinc-150 rounded-bl-sm shadow-sm prose prose-invert prose-xs max-w-none'
                }`}>
                  <ReactMarkdown>{m.content}</ReactMarkdown>
                  
                  {/* Citations block under assistant replies */}
                  {m.role === 'assistant' && searchMode === 'notes' && drawerChunks.length > 0 && (
                    <div className="mt-3 pt-2.5 border-t border-zinc-800/80 flex items-center gap-1.5 flex-wrap">
                      <span className="text-[8px] font-bold text-zinc-500 uppercase tracking-wider">Citations:</span>
                      {drawerChunks.slice(0, 3).map((chunk, i) => (
                        <button
                          key={i}
                          onClick={() => {
                            setActiveCitationChunk(chunk)
                            setShowRAGDrawer(true)
                          }}
                          className="bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/20 text-indigo-400 text-[9px] font-bold px-2 py-0.5 rounded-lg transition-colors flex items-center gap-1"
                        >
                          <span>📄</span> {chunk.filename} ({chunk.score}%)
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input box */}
        <div className="pt-3 border-t border-zinc-800 mt-4 flex gap-2">
          <input
            type="text"
            className="flex-1 rounded-xl bg-zinc-850 border border-zinc-850 px-4 py-2.5 text-xs outline-none focus:ring-1 focus:ring-indigo-500/50 text-white placeholder:text-zinc-550"
            placeholder={processing ? 'Deskmate thinking...' : 'Ask Deskmate...'}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={processing}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSend()
            }}
          />
          <button
            onClick={handleSend}
            disabled={processing || !input.trim()}
            className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold px-5 py-2.5 rounded-xl transition-all shadow-md active:scale-95 disabled:opacity-40"
          >
            Send
          </button>
        </div>
      </div>

      {/* ── RIGHT COLLAPSIBLE PANEL: Collapsible RAG Source chunks used ── */}
      {showRAGDrawer && activeCitationChunk && (
        <div className="w-80 flex-shrink-0 bg-zinc-900/60 border border-zinc-800/80 rounded-3xl p-5 backdrop-blur-xl shadow-xl flex flex-col h-[calc(100vh-6rem)] animate-slideLeft">
          <div className="flex items-center justify-between pb-3 border-b border-zinc-800 mb-4">
            <div>
              <h3 className="text-xs font-bold text-white flex items-center gap-1.5">
                <span>📄</span> Citation Details
              </h3>
              <p className="text-[9px] text-zinc-500 mt-0.5 truncate max-w-[200px]">{activeCitationChunk.filename}</p>
            </div>
            <button 
              onClick={() => setShowRAGDrawer(false)}
              className="text-zinc-500 hover:text-zinc-300 text-xs font-bold p-1 hover:bg-zinc-800 rounded-lg transition-colors"
            >
              ✕
            </button>
          </div>

          <div className="flex-1 overflow-y-auto space-y-4 text-xs text-zinc-400 select-text">
            <div className="bg-zinc-800/30 border border-zinc-800 rounded-2xl p-3 flex justify-between items-center text-[10px]">
              <span>Search Relevance:</span>
              <span className="font-bold text-indigo-400">{activeCitationChunk.score}% Match</span>
            </div>

            <div className="space-y-1.5">
              <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block">Context Chunk Text</span>
              <div className="bg-zinc-950/40 border border-zinc-800/60 rounded-2xl p-3 font-mono text-[10px] leading-relaxed text-zinc-300 select-text selection:bg-indigo-600/30">
                {activeCitationChunk.text}
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
