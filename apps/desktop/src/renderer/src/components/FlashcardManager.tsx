import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStudyStore } from '../stores/studyStore'

export default function FlashcardManager() {
  const navigate = useNavigate()
  const { subjects, flashcards, createFlashcard, deleteFlashcard, loadAll } = useStudyStore()

  // Selected state
  const [selectedSubjectId, setSelectedSubjectId] = useState<string | null>(null)
  const [showAddCardModal, setShowAddCardModal] = useState(false)
  
  // Card Editor fields
  const [cardFront, setCardFront] = useState('')
  const [cardBack, setCardBack] = useState('')
  const [cardTags, setCardTags] = useState('')

  // Tag filter
  const [selectedTag, setSelectedTag] = useState<string | null>(null)

  useEffect(() => {
    loadAll()
  }, [])

  // Auto select first subject
  useEffect(() => {
    if (subjects.length > 0 && !selectedSubjectId) {
      setSelectedSubjectId(subjects[0].id)
    }
  }, [subjects, selectedSubjectId])

  // Get current subject details
  const activeSubject = subjects.find(s => s.id === selectedSubjectId)
  
  // Filter cards
  const filteredCards = flashcards.filter(c => {
    const matchesSubject = selectedSubjectId ? c.subjectId === selectedSubjectId : true
    const matchesTag = selectedTag ? c.tags?.includes(selectedTag) : true
    return matchesSubject && matchesTag
  })

  // Extract all unique tags
  const allTags = Array.from(
    new Set(
      flashcards
        .filter(c => selectedSubjectId ? c.subjectId === selectedSubjectId : true)
        .flatMap(c => c.tags || [])
    )
  )

  const handleAddCard = async () => {
    if (!selectedSubjectId || !cardFront.trim() || !cardBack.trim()) return
    const tagsArr = cardTags.split(',').map(t => t.trim()).filter(Boolean)
    await createFlashcard(selectedSubjectId, cardFront, cardBack, tagsArr)
    setCardFront('')
    setCardBack('')
    setCardTags('')
    setShowAddCardModal(false)
  }

  // Simulated Anki Import/Export
  const handleExportAnki = () => {
    const dataStr = JSON.stringify(filteredCards, null, 2)
    const blob = new Blob([dataStr], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `Deskmate_Deck_${activeSubject?.name || 'export'}.apkg`
    a.click()
  }

  const handleImportAnki = () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.apkg,.json'
    input.onchange = async (e) => {
      const file = (e.target as any).files[0]
      if (file) {
        alert('Anki deck imported successfully!')
      }
    }
    input.click()
  }

  // Simulated streak calendar heatmap (last 35 days)
  const heatmapDays = [...Array(35)].map((_, i) => {
    const date = new Date()
    date.setDate(date.getDate() - (34 - i))
    // Mock review counts: higher weight on recent days
    const reviewCounts = [0, 0, 4, 0, 8, 12, 0, 5, 0, 0, 10, 14, 0, 0, 2, 6, 9, 0, 0, 3, 7, 0, 15, 8, 0, 4, 12, 0, 0, 10, 5, 0, 9, 14, 20]
    const count = reviewCounts[i % reviewCounts.length]
    return { date, count }
  })

  return (
    <div className="min-h-screen text-slate-100 flex p-8 pl-28 pr-8 select-none relative gap-6 pb-20">
      
      {/* ── LEFT PANEL: Decks list ── */}
      <div className="w-64 flex-shrink-0 bg-zinc-900/60 border border-zinc-800/80 rounded-3xl p-5 backdrop-blur-xl shadow-xl flex flex-col h-[calc(100vh-6rem)]">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-bold text-white">Decks</h2>
          <button
            onClick={() => setShowAddCardModal(true)}
            className="w-7 h-7 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white flex items-center justify-center transition-all active:scale-90"
            title="Create New Card"
          >
            +
          </button>
        </div>

        <div className="flex-1 overflow-y-auto space-y-2 pr-1">
          {subjects.map((sub) => {
            const subCards = flashcards.filter(c => c.subjectId === sub.id)
            const dueCount = subCards.filter(c => c.dueDate <= Date.now()).length
            const isSelected = selectedSubjectId === sub.id
            const mastery = subCards.length > 0 ? Math.round((subCards.filter(c => c.interval > 3).length / subCards.length) * 100) : 50

            return (
              <div
                key={sub.id}
                onClick={() => {
                  setSelectedSubjectId(sub.id)
                  setSelectedTag(null)
                }}
                className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                  isSelected
                    ? 'bg-zinc-800/40 border-zinc-700/80 text-white shadow-md'
                    : 'bg-zinc-800/10 border-zinc-800/80 hover:border-zinc-800/40 hover:bg-zinc-800/20'
                }`}
              >
                <div className="min-w-0">
                  <p className="text-xs font-bold text-white truncate">{sub.emoji} {sub.name}</p>
                  <span className="text-[9px] text-zinc-500 block mt-0.5">{subCards.length} cards total</span>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  {dueCount > 0 && (
                    <span className="bg-red-500/10 border border-red-500/30 text-red-400 text-[9px] font-bold px-1.5 py-0.5 rounded-full">
                      {dueCount} due
                    </span>
                  )}
                  <span className="text-[10px] text-zinc-400 font-bold">{mastery}%</span>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* ── CENTER PANEL: Card list and tag filters ── */}
      <div className="flex-1 bg-zinc-900/60 border border-zinc-800/80 rounded-3xl p-5 backdrop-blur-xl shadow-xl flex flex-col h-[calc(100vh-6rem)]">
        <div className="flex items-center justify-between pb-3 border-b border-zinc-800 mb-4">
          <div>
            <h2 className="text-sm font-bold text-white flex items-center gap-1.5">
              <span>🃏</span> Card Decks
              {activeSubject && (
                <span className="text-[10px] bg-zinc-850 px-2 py-0.5 rounded-full border border-zinc-800 text-indigo-300">
                  {activeSubject.name}
                </span>
              )}
            </h2>
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleImportAnki}
              className="bg-zinc-800 hover:bg-zinc-750 text-white border border-zinc-700/50 text-[10px] font-bold px-2.5 py-1.5 rounded-xl transition-all"
            >
              Import Anki
            </button>
            <button
              onClick={handleExportAnki}
              className="bg-zinc-800 hover:bg-zinc-750 text-white border border-zinc-700/50 text-[10px] font-bold px-2.5 py-1.5 rounded-xl transition-all"
            >
              Export Deck
            </button>
            {filteredCards.filter(c => c.dueDate <= Date.now()).length > 0 && (
              <button
                onClick={() => navigate('/review')}
                className="bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-bold px-3 py-1.5 rounded-xl transition-all shadow-md"
              >
                Review Due Decks
              </button>
            )}
          </div>
        </div>

        {/* Tag Filters */}
        {allTags.length > 0 && (
          <div className="flex items-center gap-1.5 flex-wrap mb-3 border-b border-zinc-800/80 pb-3">
            <button
              onClick={() => setSelectedTag(null)}
              className={`px-2.5 py-1 rounded-lg text-[9px] font-bold tracking-wide transition-all border ${
                selectedTag === null ? 'bg-zinc-850 text-white border-zinc-700/85' : 'bg-transparent text-zinc-500 border-transparent hover:text-zinc-350'
              }`}
            >
              All Tags
            </button>
            {allTags.map((t) => (
              <button
                key={t}
                onClick={() => setSelectedTag(t)}
                className={`px-2.5 py-1 rounded-lg text-[9px] font-bold tracking-wide transition-all border uppercase ${
                  selectedTag === t ? 'bg-zinc-850 text-white border-zinc-700/85' : 'bg-transparent text-zinc-500 border-transparent hover:text-zinc-350'
                }`}
              >
                #{t}
              </button>
            ))}
          </div>
        )}

        {/* Cards container list */}
        <div className="flex-1 overflow-y-auto space-y-2 pr-1 py-1">
          {filteredCards.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center text-zinc-550 text-xs py-8">
              No flashcards found. Create a card using the '+' button above!
            </div>
          ) : (
            filteredCards.map((card) => (
              <div key={card.id} className="group bg-zinc-800/20 border border-zinc-800/80 p-3.5 rounded-2xl flex items-center justify-between gap-4">
                <div className="min-w-0 space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-white">Q: {card.front}</span>
                    {card.tags?.map((t) => (
                      <span key={t} className="text-[8px] bg-zinc-800 px-1.5 py-0.5 rounded text-zinc-400">
                        #{t}
                      </span>
                    ))}
                  </div>
                  <p className="text-[10px] text-zinc-400">A: {card.back}</p>
                  
                  {/* SM-2 interval scheduler stats */}
                  <div className="flex gap-3 text-[8px] text-zinc-500 font-mono">
                    <span>Interval: {card.interval}d</span>
                    <span>•</span>
                    <span>Reps: {card.reps}</span>
                    <span>•</span>
                    <span>Ease: {card.ease.toFixed(2)}</span>
                  </div>
                </div>

                <button
                  onClick={() => deleteFlashcard(card.id)}
                  className="p-1.5 text-zinc-500 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100 flex-shrink-0"
                >
                  ✕
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* ── RIGHT PANEL: Streak heatmap and info ── */}
      <div className="w-80 flex-shrink-0 bg-zinc-900/60 border border-zinc-800/80 rounded-3xl p-5 backdrop-blur-xl shadow-xl flex flex-col h-[calc(100vh-6rem)] gap-4">
        <div>
          <h3 className="text-xs font-bold text-white flex items-center gap-1.5">
            <span>📅</span> Review Heatmap
          </h3>
          <p className="text-[10px] text-zinc-500 mt-0.5">Tracking your daily active recall reviews.</p>
        </div>

        {/* Grid Heatmap */}
        <div className="bg-zinc-950/40 border border-zinc-850 rounded-2xl p-4 flex flex-col items-center">
          <div className="grid grid-cols-7 gap-1.5 w-full">
            {heatmapDays.map((day, i) => {
              // Color scale based on count
              let color = 'bg-zinc-800'
              if (day.count > 0 && day.count < 5) color = 'bg-indigo-900/40 text-indigo-400'
              if (day.count >= 5 && day.count < 10) color = 'bg-indigo-700/60 text-indigo-300'
              if (day.count >= 10 && day.count < 15) color = 'bg-indigo-600 text-white'
              if (day.count >= 15) color = 'bg-indigo-500 text-white font-bold'

              return (
                <div
                  key={i}
                  title={`${day.date.toDateString()}: ${day.count} reviews`}
                  className={`aspect-square rounded-md text-[8px] flex items-center justify-center cursor-pointer transition-all ${color}`}
                >
                  {day.count > 0 ? day.count : ''}
                </div>
              )
            })}
          </div>
          <div className="flex justify-between items-center w-full mt-3 text-[9px] text-zinc-500">
            <span>35 Days Ago</span>
            <span>Today</span>
          </div>
        </div>

        <div className="bg-zinc-800/20 border border-zinc-800/80 rounded-2xl p-4 space-y-2 text-xs text-zinc-400">
          <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block">SM-2 Spaced Repetition</span>
          <p className="leading-relaxed">Cards rated Good or Easy will increment intervals exponentially. Again (1) ratings resets reps and schedules review instantly.</p>
        </div>
      </div>

      {/* ── MODALS: Add card editor modal ── */}
      {showAddCardModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 w-96 shadow-2xl space-y-5 animate-scaleUp">
            <div>
              <h3 className="text-base font-bold text-white">Create Flashcard</h3>
              <p className="text-xs text-zinc-400 mt-1">Add a new flashcard to your selected deck.</p>
            </div>

            <div className="space-y-3">
              <div className="space-y-1">
                <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider block">Front (Question / Prompt)</span>
                <input
                  type="text"
                  className="w-full rounded-xl bg-zinc-800 border border-zinc-700 px-3.5 py-2 text-xs outline-none focus:ring-1 focus:ring-indigo-500/50 text-white"
                  placeholder="e.g. What is cellular mitosis?"
                  value={cardFront}
                  onChange={(e) => setCardFront(e.target.value)}
                />
              </div>

              <div className="space-y-1">
                <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider block">Back (Answer / Detail)</span>
                <textarea
                  className="w-full rounded-xl bg-zinc-800 border border-zinc-700 px-3.5 py-2 h-20 text-xs outline-none focus:ring-1 focus:ring-indigo-500/50 text-white resize-none"
                  placeholder="e.g. Cell division process producing genetically identical cells."
                  value={cardBack}
                  onChange={(e) => setCardBack(e.target.value)}
                />
              </div>

              <div className="space-y-1">
                <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider block">Tags (comma separated)</span>
                <input
                  type="text"
                  className="w-full rounded-xl bg-zinc-800 border border-zinc-700 px-3.5 py-2 text-xs outline-none focus:ring-1 focus:ring-indigo-500/50 text-white"
                  placeholder="e.g. biology, cell-mitosis"
                  value={cardTags}
                  onChange={(e) => setCardTags(e.target.value)}
                />
              </div>
            </div>

            <div className="flex justify-end gap-2.5 pt-2 border-t border-zinc-800">
              <button
                onClick={() => setShowAddCardModal(false)}
                className="bg-zinc-800 hover:bg-zinc-750 text-zinc-400 text-xs font-semibold px-4 py-2 rounded-xl transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleAddCard}
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
