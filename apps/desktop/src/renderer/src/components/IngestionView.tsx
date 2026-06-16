import React, { useState } from 'react'
import { useStudyStore } from '../stores/studyStore'

export default function IngestionView() {
  const { subjects, documents, ingestionQueue, ingestFile, ingestText, undoDocumentIngest } = useStudyStore()
  const [activeTab, setActiveTab] = useState<'docs' | 'images' | 'audio' | 'urls'>('docs')
  const [targetSubjectId, setTargetSubjectId] = useState<string>('')
  
  // URL scrape state
  const [scrapeUrl, setScrapeUrl] = useState('')
  const [isScraping, setIsScraping] = useState(false)
  const [scrapeError, setScrapeError] = useState('')

  // Drag state
  const [isDragOver, setIsDragOver] = useState(false)

  // Auto select first subject
  React.useEffect(() => {
    if (subjects.length > 0 && !targetSubjectId) {
      setTargetSubjectId(subjects[0].id)
    }
  }, [subjects, targetSubjectId])

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

    const subId = targetSubjectId || (subjects.length > 0 ? subjects[0].id : 'default')
    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      const filePath = (file as any).path || file.name
      ingestFile(filePath, subId)
    }
  }

  const handleFileChange = async () => {
    const filePaths = await window.qvacAPI.selectFiles()
    if (!filePaths || filePaths.length === 0) return

    const subId = targetSubjectId || (subjects.length > 0 ? subjects[0].id : 'default')
    for (const filePath of filePaths) {
      ingestFile(filePath, subId)
    }
  }

  const handleScrape = async () => {
    if (!scrapeUrl.trim() || !targetSubjectId) return
    setIsScraping(true)
    setScrapeError('')

    try {
      // Scrape Wikipedia or article mock using standard scraping simulation
      //toDo use real scrapper like selenium
      await new Promise((r) => setTimeout(r, 1500))
      
      const title = 'Article_' + scrapeUrl.split('/').pop()?.substring(0, 20) || 'Scraped_Article'
      const simulatedText = `Extracted web article contents from ${scrapeUrl}.\n\nThis is a scraped article that has been cleaned, chunked and ingested into the vector database workspace for study purposes.`
      
      await ingestText(title, simulatedText, targetSubjectId)
      setScrapeUrl('')
    } catch (err) {
      setScrapeError('Failed to scrape or clean web article.')
    } finally {
      setIsScraping(false)
    }
  }

  return (
    <div className="min-h-screen text-slate-100 p-8 pl-28 pr-8 select-none relative pb-20">
      
      {/* Top Title */}
      <div className="mb-6">
        <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Content Onramp</span>
        <h1 className="text-3xl font-bold text-white mt-1">Ingestion Center</h1>
        <p className="text-xs text-zinc-400 mt-1">Drag files, paste URLs, or record directly. Every format is handled gracefully.</p>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left column: Drag & Drop Zone */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Target Subject Dropdown */}
          <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-3xl p-4 backdrop-blur-xl shadow-xl flex items-center justify-between gap-4">
            <div>
              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Target Subject Ingestion</span>
              <p className="text-xs text-zinc-500">Files will be tagged and chunked into this subject's database.</p>
            </div>
            <select
              value={targetSubjectId}
              onChange={(e) => setTargetSubjectId(e.target.value)}
              className="bg-zinc-800 border border-zinc-700 px-3.5 py-1.5 rounded-xl text-xs outline-none focus:ring-1 focus:ring-indigo-500/50 text-white cursor-pointer"
            >
              {subjects.map(s => (
                <option key={s.id} value={s.id}>{s.emoji} {s.name}</option>
              ))}
            </select>
          </div>

          {/* Ingestion Drop Zone */}
          <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-3xl p-6 backdrop-blur-xl shadow-xl space-y-6">
            {/* Tabs */}
            <div className="flex items-center gap-1.5 border-b border-zinc-800/80 pb-2">
              {[
                { id: 'docs', label: 'Documents' },
                { id: 'images', label: 'Images' },
                { id: 'audio', label: 'Audio' },
                { id: 'urls', label: 'URLs' }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`px-3 py-1.5 rounded-lg text-[10px] font-bold tracking-wide transition-all border ${
                    activeTab === tab.id
                      ? 'bg-zinc-800 text-white border-zinc-700/80'
                      : 'bg-transparent text-zinc-400 border-transparent hover:text-zinc-200'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Ingestion Panels */}
            {activeTab !== 'urls' ? (
              <div 
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`border-2 border-dashed rounded-3xl p-10 flex flex-col items-center justify-center text-center cursor-pointer transition-all ${
                  isDragOver 
                    ? 'border-indigo-500 bg-indigo-500/5 scale-[1.01]' 
                    : 'border-zinc-800 hover:border-zinc-750/80 hover:bg-zinc-800/5'
                }`}
                onClick={handleFileChange}
              >
                <span className="text-4xl mb-3">📥</span>
                <p className="text-sm font-bold text-white">Drag and drop file here</p>
                <p className="text-xs text-zinc-500 mt-1.5">
                  {activeTab === 'docs' && 'Supports PDF, DOCX, TXT, and MD formats'}
                  {activeTab === 'images' && 'Supports JPEG, PNG, and BMP for OCR extraction'}
                  {activeTab === 'audio' && 'Supports WAV and MP3 audio for Whisper speech-to-text'}
                </p>
                <button className="bg-zinc-800 hover:bg-zinc-750 text-white text-xs font-bold px-4 py-2 rounded-xl transition-all border border-zinc-700/40 mt-4">
                  Browse Files
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex gap-2">
                  <input
                    type="text"
                    className="flex-1 rounded-xl bg-zinc-800 border border-zinc-700 px-3.5 py-2 text-xs outline-none focus:ring-1 focus:ring-indigo-500/50 text-white placeholder:text-zinc-500"
                    placeholder="Paste web article or Wikipedia URL here..."
                    value={scrapeUrl}
                    onChange={(e) => setScrapeUrl(e.target.value)}
                  />
                  <button
                    onClick={handleScrape}
                    disabled={isScraping || !scrapeUrl}
                    className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold px-4 py-2 rounded-xl transition-all shadow-md disabled:opacity-40"
                  >
                    {isScraping ? 'Scraping...' : 'Scrape'}
                  </button>
                </div>
                {scrapeError && <p className="text-xs text-red-400">{scrapeError}</p>}
                <p className="text-[10px] text-zinc-500">We scrape the text structure, clean boilerplate scripts, segment, embed, and index it.</p>
              </div>
            )}
          </div>
        </div>

        {/* Right column: Active queue & Recent uploads */}
        <div className="space-y-6">
          {/* Active queue panel */}
          <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-3xl p-6 backdrop-blur-xl shadow-xl flex flex-col h-[280px]">
            <h2 className="text-sm font-bold text-white mb-4">Active queue</h2>
            <div className="flex-1 overflow-y-auto space-y-4 pr-1">
              {ingestionQueue.length === 0 ? (
                <div className="h-full flex items-center justify-center text-center text-zinc-500 text-xs py-8">
                  No active ingestion processes.
                </div>
              ) : (
                ingestionQueue.map((job) => (
                  <div key={job.id} className="bg-zinc-800/20 border border-zinc-800/60 rounded-2xl p-3.5 space-y-2 relative">
                    <div className="flex justify-between items-center text-[10px]">
                      <span className="font-bold text-white truncate max-w-[65%]">{job.name}</span>
                      <span className={`font-bold uppercase tracking-wider ${
                        job.stage === 'Done' ? 'text-emerald-400' :
                        job.stage === 'Error' ? 'text-red-400' : 'text-indigo-400'
                      }`}>
                        {job.stage} {job.percentage}%
                      </span>
                    </div>

                    <div className="w-full bg-zinc-900 h-1.5 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full transition-all duration-300 ${
                        job.stage === 'Done' ? 'bg-emerald-500' :
                        job.stage === 'Error' ? 'bg-red-500' : 'bg-indigo-500'
                      }`} style={{ width: `${job.percentage}%` }} />
                    </div>

                    {job.error && (
                      <p className="text-[9px] text-red-400 mt-1 font-semibold">{job.error}</p>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Recent Ingestions (last 20) with Undo button */}
          <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-3xl p-6 backdrop-blur-xl shadow-xl flex flex-col h-[300px]">
            <h2 className="text-sm font-bold text-white mb-4">Recent Ingestions</h2>
            <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
              {documents.slice(0, 10).map((doc) => (
                <div key={doc.id} className="bg-zinc-800/10 border border-zinc-800 p-2.5 rounded-xl flex items-center justify-between text-xs group">
                  <div className="min-w-0">
                    <p className="font-semibold text-white truncate max-w-[130px]">{doc.name}</p>
                    <span className="text-[9px] text-zinc-500">Chunk count: {doc.chunkCount}</span>
                  </div>
                  <button
                    onClick={() => undoDocumentIngest(doc.id)}
                    className="bg-zinc-800 hover:bg-zinc-750 text-zinc-400 hover:text-white border border-zinc-700/50 text-[10px] font-bold px-2 py-1 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                    title="Remove from Index"
                  >
                    Undo
                  </button>
                </div>
              ))}
              {documents.length === 0 && (
                <div className="h-full flex items-center justify-center text-zinc-500 text-xs py-8">
                  No previous document ingestions.
                </div>
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}
