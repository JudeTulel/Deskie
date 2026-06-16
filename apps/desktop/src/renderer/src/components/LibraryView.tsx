import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStudyStore } from '../stores/studyStore'
import { useChatStore } from '../stores/chatStore'
import { useModelStore } from '../stores/modelStore'
import type { Subject, Document } from '../../../shared/models'

export default function LibraryView() {
  const navigate = useNavigate()
  const { 
    subjects, documents, ingestionQueue, 
    createSubject, deleteSubject, deleteDocument, ingestFile, loadAll 
  } = useStudyStore()
  
  const { createChat } = useChatStore()
  
  // State
  const [selectedSubjectId, setSelectedSubjectId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterType, setFilterType] = useState<string | null>(null) // null = all, or pdf, docx, audio, image
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null)
  const [batchSelectedIds, setBatchSelectedIds] = useState<string[]>([])
  
  // Modal State
  const [showNewSubjectModal, setShowNewSubjectModal] = useState(false)
  const [newSubName, setNewSubName] = useState('')
  const [newSubEmoji, setNewSubEmoji] = useState('📚')
  const [newSubColor, setNewSubColor] = useState('#8B5CF6')

  // Drag over state
  const [isDragOver, setIsDragOver] = useState(false)


  useEffect(() => {
    loadAll()
  }, [])

  // Filters
  const filteredDocs = documents.filter((doc) => {
    const matchesSubject = selectedSubjectId ? doc.subjectId === selectedSubjectId : true
    const matchesSearch = searchQuery
      ? doc.name.toLowerCase().includes(searchQuery.toLowerCase())
      : true
    const matchesType = filterType ? doc.type.toLowerCase() === filterType.toLowerCase() : true
    return matchesSubject && matchesSearch && matchesType
  })

  const selectedDoc = documents.find((d) => d.id === selectedDocId)

  // Color options
  const colorPresets = ['#8B5CF6', '#EC4899', '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#06B6D4']
  const emojiPresets = ['📚', '🧬', '🧠', '💻', '🧪', '⚖️', '🌌', '🎨', '📈', '🏛️']

  // Handlers
  const handleCreateSubject = async () => {
    if (!newSubName.trim()) return
    await createSubject(newSubName, newSubEmoji, newSubColor)
    setNewSubName('')
    setShowNewSubjectModal(false)
  }

  const handleFileChange = async () => {
    const filePaths = await window.qvacAPI.selectFiles()
    if (!filePaths || filePaths.length === 0) return
    
    const targetSubId = selectedSubjectId || (subjects.length > 0 ? subjects[0].id : 'default')
    for (const filePath of filePaths) {
      ingestFile(filePath, targetSubId)
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(true)
  }

  const handleDragLeave = () => {
    setIsDragOver(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    const files = e.dataTransfer.files
    if (!files || files.length === 0) return

    const targetSubId = selectedSubjectId || (subjects.length > 0 ? subjects[0].id : 'default')
    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      const filePath = (file as any).path || file.name
      ingestFile(filePath, targetSubId)
    }
  }

  const handleBatchSelect = (docId: string) => {
    setBatchSelectedIds(prev => 
      prev.includes(docId) ? prev.filter(id => id !== docId) : [...prev, docId]
    )
  }

  const handleBatchChat = async () => {
    if (batchSelectedIds.length === 0) return
    
    // Create new chat preloaded with context from these docs
    const chatId = 'chat-' + Math.random().toString(36).substring(2, 11)
    const activeDocs = documents.filter(d => batchSelectedIds.includes(d.id))
    const docNames = activeDocs.map(d => d.name).join(', ')
    const title = `Chat on ${activeDocs.length} docs`
    
    await createChat(chatId, title)
    
    // Save a system/assistant message detailing context
    await window.qvacAPI.saveChatMessage({
      id: 'sys-' + Math.random().toString(36).substring(2, 11),
      chatId,
      role: 'assistant',
      content: `I've preloaded the following documents as context for our conversation:\n${activeDocs.map(d => `- **${d.name}**`).join('\n')}\n\nAsk me anything about their content!`
    })

    // Navigate to Chat view
    navigate('/ai-chat')
  }

  const handleBatchDelete = async () => {
    if (window.confirm(`Are you sure you want to delete ${batchSelectedIds.length} documents?`)) {
      for (const id of batchSelectedIds) {
        await deleteDocument(id)
      }
      setBatchSelectedIds([])
    }
  }

  return (
    <div className="min-h-screen text-slate-100 flex p-8 pl-28 pr-8 select-none relative gap-6">
      
      {/* ── PANEL 1: Left Subject list (25% width) ── */}
      <div className="w-64 flex-shrink-0 bg-zinc-900/60 border border-zinc-800/80 rounded-3xl p-5 backdrop-blur-xl shadow-xl flex flex-col h-[calc(100vh-4rem)]">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-bold text-white">Subjects</h2>
          <button 
            onClick={() => setShowNewSubjectModal(true)}
            className="w-7 h-7 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white flex items-center justify-center transition-colors active:scale-90"
            title="Create Subject"
          >
            +
          </button>
        </div>

        {/* Subjects Scrollable Container */}
        <div className="flex-1 overflow-y-auto space-y-2 pr-1">
          <button
            onClick={() => setSelectedSubjectId(null)}
            className={`w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-semibold flex items-center justify-between transition-all border ${
              selectedSubjectId === null 
                ? 'bg-zinc-800/50 border-zinc-700/80 text-white shadow-md' 
                : 'bg-transparent border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <span className="flex items-center gap-2">
              <span>📂</span> All Documents
            </span>
            <span className="bg-zinc-800/40 px-2 py-0.5 rounded text-[10px] text-zinc-400 border border-zinc-800/50">
              {documents.length}
            </span>
          </button>

          {subjects.map((sub) => {
            const docCount = documents.filter((d) => d.subjectId === sub.id).length
            return (
              <div 
                key={sub.id} 
                className={`group w-full rounded-xl transition-all border flex items-center justify-between pr-2 ${
                  selectedSubjectId === sub.id
                    ? 'bg-zinc-800/50 border-zinc-700/80 text-white shadow-md'
                    : 'bg-transparent border-transparent text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/10'
                }`}
              >
                <button
                  onClick={() => setSelectedSubjectId(sub.id)}
                  className="flex-1 text-left px-3.5 py-2.5 text-xs font-semibold flex items-center gap-2 truncate"
                >
                  <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: sub.color }} />
                  <span>{sub.emoji} {sub.name}</span>
                </button>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <span className="bg-zinc-800/40 px-1.5 py-0.5 rounded text-[10px] text-zinc-400 border border-zinc-800/50">
                    {docCount}
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      if (window.confirm(`Delete subject "${sub.name}"? This deletes documents and flashcards.`)) {
                        deleteSubject(sub.id)
                      }
                    }}
                    className="p-1 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
                    title="Delete Subject"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* ── PANEL 2: Middle Document list (50% width) ── */}
      <div 
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`flex-1 bg-zinc-900/60 border rounded-3xl p-5 backdrop-blur-xl shadow-xl flex flex-col h-[calc(100vh-4rem)] transition-all ${
          isDragOver ? 'border-indigo-500 bg-indigo-500/5 scale-[1.005]' : 'border-zinc-800/80'
        }`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            Documents
            {selectedSubjectId && (
              <span className="text-[10px] font-medium bg-zinc-800 px-2 py-0.5 rounded-full border border-zinc-700/50">
                {subjects.find(s => s.id === selectedSubjectId)?.name}
              </span>
            )}
          </h2>
          
          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            <button 
              onClick={handleFileChange}
              className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold px-3 py-1.5 rounded-xl transition-all shadow-md active:scale-95 flex items-center gap-1.5"
            >
              <span>📥</span> Import File
            </button>
          </div>
        </div>

        {/* Filter & Search Bar */}
        <div className="space-y-3 mb-4">
          <input
            type="text"
            className="w-full rounded-xl bg-zinc-800/60 border border-zinc-800 px-3.5 py-2 text-xs outline-none placeholder:text-zinc-500 focus:ring-1 focus:ring-indigo-500/50 transition-all text-white"
            placeholder="Search documents and chunks..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />

          {/* Filter Bar */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <button 
              onClick={() => setFilterType(null)}
              className={`px-3 py-1 rounded-lg text-[10px] font-bold tracking-wide transition-all border ${
                filterType === null 
                  ? 'bg-zinc-800 text-white border-zinc-700/80' 
                  : 'bg-zinc-900/30 text-zinc-400 border-zinc-800/80 hover:text-zinc-200'
              }`}
            >
              All Types
            </button>
            {['pdf', 'docx', 'txt', 'audio', 'image'].map((t) => (
              <button 
                key={t}
                onClick={() => setFilterType(t)}
                className={`px-3 py-1 rounded-lg text-[10px] font-bold tracking-wide transition-all border uppercase ${
                  filterType === t 
                    ? 'bg-zinc-800 text-white border-zinc-700/80' 
                    : 'bg-zinc-900/30 text-zinc-400 border-zinc-800/80 hover:text-zinc-200'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        {/* Active Ingestion Queue */}
        {ingestionQueue.filter(j => j.stage !== 'Done' && j.stage !== 'Error').length > 0 && (
          <div className="mb-4 bg-indigo-950/20 border border-indigo-500/30 rounded-2xl p-4 space-y-3 animate-fadeIn">
            <h3 className="text-xs font-bold text-indigo-300">Processing Jobs</h3>
            <div className="space-y-2.5">
              {ingestionQueue.filter(j => j.stage !== 'Done' && j.stage !== 'Error').map((job) => (
                <div key={job.id} className="space-y-1">
                  <div className="flex justify-between items-center text-[10px]">
                    <span className="font-semibold text-white truncate max-w-[70%]">{job.name}</span>
                    <span className="text-indigo-400 font-bold uppercase tracking-wider">{job.stage} {job.percentage}%</span>
                  </div>
                  <div className="w-full bg-zinc-800 h-1.5 rounded-full overflow-hidden">
                    <div className="bg-indigo-500 h-full rounded-full transition-all duration-300" style={{ width: `${job.percentage}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Batch Selected Actions Panel */}
        {batchSelectedIds.length > 0 && (
          <div className="mb-4 bg-zinc-800/60 border border-zinc-700/50 rounded-2xl px-4 py-3 flex items-center justify-between animate-fadeIn">
            <span className="text-xs font-semibold text-indigo-300">{batchSelectedIds.length} files selected</span>
            <div className="flex gap-2">
              <button 
                onClick={handleBatchChat}
                className="bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-bold px-3 py-1.5 rounded-xl transition-all flex items-center gap-1"
              >
                💬 Chat Context
              </button>
              <button 
                onClick={handleBatchDelete}
                className="bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 text-[11px] font-bold px-3 py-1.5 rounded-xl transition-all"
              >
                Delete
              </button>
            </div>
          </div>
        )}

        {/* Document Scrollable List */}
        <div className="flex-1 overflow-y-auto space-y-2 pr-1">
          {filteredDocs.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center py-20 text-zinc-500">
              <span className="text-3xl mb-2">📂</span>
              <p className="text-sm">Drag and drop file here to ingest</p>
              <p className="text-xs text-zinc-600 mt-1">Supports PDF, DOCX, TXT, MD, images, and audio</p>
            </div>
          ) : (
            filteredDocs.map((doc) => {
              const docSub = subjects.find(s => s.id === doc.subjectId)
              const isSelected = selectedDocId === doc.id
              const isBatchSelected = batchSelectedIds.includes(doc.id)

              return (
                <div
                  key={doc.id}
                  onClick={() => setSelectedDocId(doc.id)}
                  className={`group p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                    isSelected
                      ? 'bg-zinc-800/40 border-zinc-700/80 shadow-md'
                      : 'bg-zinc-800/10 border-zinc-800/80 hover:border-zinc-800/40 hover:bg-zinc-800/20'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {/* Checkbox for batch select */}
                    <input 
                      type="checkbox"
                      checked={isBatchSelected}
                      onClick={(e) => e.stopPropagation()}
                      onChange={() => handleBatchSelect(doc.id)}
                      className="w-4 h-4 rounded border-zinc-700 bg-zinc-900 text-indigo-600 focus:ring-indigo-500/50 cursor-pointer"
                    />

                    {/* File Type Icon */}
                    <div className="w-9 h-9 rounded-xl bg-zinc-800/50 border border-zinc-700/40 flex items-center justify-center flex-shrink-0 text-sm">
                      {doc.type === 'pdf' ? '📕' : doc.type === 'docx' ? '📘' : doc.type === 'audio' ? '🎙️' : doc.type === 'image' ? '🖼️' : '📄'}
                    </div>

                    <div className="min-w-0 space-y-0.5">
                      <p className="text-xs font-bold text-white truncate max-w-xs">{doc.name}</p>
                      <div className="flex items-center gap-2 text-[10px] text-zinc-500">
                        <span>{new Date(doc.ingestDate).toLocaleDateString()}</span>
                        <span>•</span>
                        <span className="bg-zinc-800/50 px-1.5 py-0.5 rounded text-zinc-400">
                          {doc.chunkCount} chunks
                        </span>
                        {docSub && (
                          <span className="text-indigo-400 font-semibold">{docSub.name}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      if (window.confirm(`Delete document "${doc.name}"?`)) {
                        deleteDocument(doc.id)
                        if (selectedDocId === doc.id) setSelectedDocId(null)
                      }
                    }}
                    className="p-2 text-zinc-500 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100 flex-shrink-0"
                    title="Delete Document"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              )
            })
          )}
        </div>
      </div>

      {/* ── PANEL 3: Right Document preview (25% width) ── */}
      {selectedDoc && (
        <div className="w-80 bg-zinc-900/60 border border-zinc-800/80 rounded-3xl p-5 backdrop-blur-xl shadow-xl flex flex-col h-[calc(100vh-4rem)] animate-slideLeft">
          <div className="flex items-center justify-between pb-3 border-b border-zinc-800 mb-4">
            <h3 className="text-sm font-bold text-white truncate max-w-[80%]">{selectedDoc.name}</h3>
            <button 
              onClick={() => setSelectedDocId(null)}
              className="text-zinc-500 hover:text-zinc-300 text-xs font-bold p-1 hover:bg-zinc-800 rounded-lg transition-colors"
            >
              ✕
            </button>
          </div>

          <div className="flex-1 overflow-y-auto space-y-4 pr-1 text-xs text-zinc-400">
            {/* Metadata Card */}
            <div className="bg-zinc-800/30 border border-zinc-800 rounded-2xl p-3.5 space-y-2.5">
              <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block">Document Information</span>
              <div className="grid grid-cols-2 gap-2 text-[10px] text-zinc-400">
                <div>Format: <span className="font-bold text-white uppercase">{selectedDoc.type}</span></div>
                <div>Chunks: <span className="font-bold text-white">{selectedDoc.chunkCount}</span></div>
                <div className="col-span-2">Date: <span className="font-bold text-white">{new Date(selectedDoc.ingestDate).toLocaleString()}</span></div>
              </div>
            </div>

            {/* Extracted Text Preview */}
            <div className="space-y-2">
              <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block">Extracted Content</span>
              <div className="bg-zinc-950/40 border border-zinc-800/60 rounded-2xl p-3 h-80 overflow-y-auto font-mono text-[10px] leading-relaxed text-zinc-300 whitespace-pre-wrap select-text selection:bg-indigo-600/30 select-none">
                {/* Note: Extracted text is stored in vector database RAG chunks.
                    We display placeholder/extracted details matching it */}
                Extracted contents from {selectedDoc.name}:\n\n
                This document is indexed in vector workspace. Use AI Chat to query the complete document with semantic search.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── MODALS: New Subject Creation ── */}
      {showNewSubjectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 w-96 shadow-2xl space-y-5 animate-scaleUp">
            <div>
              <h3 className="text-base font-bold text-white">New Subject</h3>
              <p className="text-xs text-zinc-400 mt-1">Create a category to group your study materials.</p>
            </div>

            <div className="space-y-3">
              <input
                type="text"
                className="w-full rounded-xl bg-zinc-800 border border-zinc-700 px-3.5 py-2 text-xs outline-none focus:ring-1 focus:ring-indigo-500/50 text-white"
                placeholder="Biology, Quantum Physics, etc."
                value={newSubName}
                onChange={(e) => setNewSubName(e.target.value)}
              />

              {/* Emoji Picker */}
              <div className="space-y-2">
                <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block">Select Emoji Icon</span>
                <div className="flex gap-2 flex-wrap">
                  {emojiPresets.map((em) => (
                    <button
                      key={em}
                      onClick={() => setNewSubEmoji(em)}
                      className={`w-8 h-8 rounded-lg text-sm flex items-center justify-center transition-all ${
                        newSubEmoji === em ? 'bg-indigo-600 border border-indigo-500 scale-110 shadow' : 'bg-zinc-800 hover:bg-zinc-700'
                      }`}
                    >
                      {em}
                    </button>
                  ))}
                </div>
              </div>

              {/* Color Picker */}
              <div className="space-y-2">
                <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block">Select Tag Color</span>
                <div className="flex gap-2 flex-wrap">
                  {colorPresets.map((col) => (
                    <button
                      key={col}
                      onClick={() => setNewSubColor(col)}
                      className="w-6 h-6 rounded-full border transition-all flex items-center justify-center"
                      style={{ backgroundColor: col, borderColor: newSubColor === col ? '#ffffff' : 'transparent' }}
                    >
                      {newSubColor === col && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2.5 pt-2 border-t border-zinc-800">
              <button
                onClick={() => setShowNewSubjectModal(false)}
                className="bg-zinc-800 hover:bg-zinc-700 text-zinc-400 text-xs font-semibold px-4 py-2 rounded-xl transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateSubject}
                className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold px-4 py-2 rounded-xl transition-all shadow-md"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
