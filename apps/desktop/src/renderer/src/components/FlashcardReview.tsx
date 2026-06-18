import React, { useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStudyStore } from '../stores/studyStore'
import { useModelStore } from '../stores/modelStore'
import ReactMarkdown from 'react-markdown'

export default function FlashcardReview() {
  const navigate = useNavigate()
  const { flashcards, subjects, reviewFlashcard } = useStudyStore()
  const { activeModel } = useModelStore()

  // Session state
  const [sessionCards, setSessionCards] = useState<any[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isFlipped, setIsFlipped] = useState(false)
  const [showHint, setShowHint] = useState(false)

  // AI Explain state
  const [showAIExplain, setShowAIExplain] = useState(false)
  const [aiExplanation, setAiExplanation] = useState('')
  const [aiLoading, setAiLoading] = useState(false)

  // Session stats
  const [reviewsDone, setReviewsDone] = useState(0)
  const [ratingsList, setRatingsList] = useState<number[]>([])
  const [sessionFinished, setSessionFinished] = useState(false)

  const activeCard = sessionCards[currentIndex]

  // Initialize session cards (filter cards that are due)
  useEffect(() => {
    const due = flashcards.filter(c => c.dueDate <= Date.now())
    // Fallback: if no due cards, review all cards for practice
    const finalCards = due.length > 0 ? due : flashcards
    // Shuffle cards
    setSessionCards(finalCards.sort(() => Math.random() - 0.5))
  }, [flashcards])

  // Setup keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (sessionFinished || !activeCard) return

      if (e.code === 'Space') {
        e.preventDefault()
        setIsFlipped(prev => !prev)
      } else if (['1', '2', '3', '4', '5'].includes(e.key)) {
        const rating = parseInt(e.key, 10)
        // Only allow rating if card is flipped
        if (isFlipped) {
          handleRateCard(rating)
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [currentIndex, isFlipped, sessionFinished, sessionCards])

  // Listen to AI Explanation stream
  useEffect(() => {
    window.qvacAPI.onCompletionStream((token) => {
      if (token === '') {
        setAiLoading(false)
      } else {
        setAiExplanation(prev => prev + token)
      }
    })
  }, [])

  const handleRateCard = async (rating: number) => {
    if (!activeCard) return
    
    // Apply SM-2 spaced repetition locally via store action
    await reviewFlashcard(activeCard.id, rating)
    setReviewsDone(prev => prev + 1)
    setRatingsList(prev => [...prev, rating])

    // Go to next card or finish
    setIsFlipped(false)
    setShowHint(false)
    setShowAIExplain(false)
    setAiExplanation('')

    if (currentIndex < sessionCards.length - 1) {
      setCurrentIndex(prev => prev + 1)
    } else {
      setSessionFinished(true)
    }
  }

  // AI Explain prompt drawer
  const handleAIExplain = async () => {
    if (!activeCard || aiLoading) return
    setShowAIExplain(true)
    setAiLoading(true)
    setAiExplanation('')

    // System prompt calls the local model with the card QA context
    const workspaceName = activeCard.subjectId || 'default-workspace'
    const subjectDetails = subjects.find(s => s.id === activeCard.subjectId)

    // Load RAG context matching the card question
    let contextStr = ''
    try {
      const chunks = await window.qvacAPI.ragSearch({
        query: activeCard.front,
        subjectId: workspaceName,
        topK: 2
      })
      if (chunks && chunks.length > 0) {
        contextStr = `\nContext source notes:\n${chunks.map((c: any) => c.text).join('\n')}`
      }
    } catch (err) {
      console.warn('RAG Context lookup failed:', err)
    }

    const history = [
      {
        role: 'system',
        content: `You are an AI teacher explaining flashcard answers. Explain why this answer is correct in a clear, concise format.${contextStr}`
      },
      {
        role: 'user',
        content: `Question: "${activeCard.front}"\nCorrect Answer: "${activeCard.back}"\n\nPlease explain why this is correct.`
      }
    ]

    try {
      await window.qvacAPI.infer(history)
    } catch (err) {
      console.error('LLM explain failed:', err)
      setAiLoading(false)
      setAiExplanation('Error calling local model explanation.')
    }
  }

  // Calculate session accuracy
  const calculateAccuracy = () => {
    if (ratingsList.length === 0) return 100
    const correctCount = ratingsList.filter(r => r >= 3).length
    return Math.round((correctCount / ratingsList.length) * 100)
  }

  const averageEase = ratingsList.length > 0 ? (ratingsList.reduce((a, b) => a + b, 0) / ratingsList.length).toFixed(1) : '3.5'

  if (sessionCards.length === 0) {
    return (
      <div className="min-h-screen bg-zinc-950 text-white flex flex-col items-center justify-center p-8 select-none">
        <div className="text-center space-y-4">
          <span className="text-4xl">🎉</span>
          <h1 className="text-2xl font-bold">No Cards Due!</h1>
          <p className="text-xs text-zinc-500">You are all caught up on your spaced repetition reviews.</p>
          <button
            onClick={() => navigate('/flashcards')}
            className="bg-indigo-650 hover:bg-indigo-600 px-5 py-2.5 rounded-xl text-xs font-bold transition-all"
          >
            Back to Deck Manager
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-slate-100 flex flex-col items-center justify-between p-8 select-none relative overflow-hidden pb-12">
      
      {/* Immersive Header */}
      <div className="w-full max-w-xl flex items-center justify-between z-10">
        <button
          onClick={() => navigate('/flashcards')}
          className="text-zinc-500 hover:text-zinc-300 text-xs font-bold transition-colors"
        >
          ← Exit Review
        </button>

        {activeCard && (
          <span className="text-[10px] font-mono tracking-widest text-zinc-500 bg-zinc-900 border border-zinc-850 px-2.5 py-1 rounded-full">
            SESSION: {currentIndex + 1} / {sessionCards.length}
          </span>
        )}
      </div>

      {/* Main Review Card Section */}
      {!sessionFinished && activeCard ? (
        <div className="w-full max-w-xl flex flex-col items-center justify-center flex-1 my-10 relative z-10">
          
          {/* Progress Bar */}
          <div className="w-full bg-zinc-900 h-1 rounded-full overflow-hidden mb-8">
            <div 
              className="bg-indigo-500 h-full rounded-full transition-all duration-300"
              style={{ width: `${((currentIndex) / sessionCards.length) * 100}%` }}
            />
          </div>

          {/* 3D Flip Card Container */}
          <div 
            onClick={() => setIsFlipped(!isFlipped)}
            className="w-full h-80 cursor-pointer relative group perspective"
          >
            {/* Card inner */}
            <div 
              className={`w-full h-full relative transition-all duration-550 transform preserve-3d ${
                isFlipped ? 'rotate-y-180 ' : ''
              }`}
            >
              {/* CARD FRONT */}
              <div className="absolute inset-0 w-full h-full bg-zinc-900 border border-zinc-800 rounded-3xl p-6 flex flex-col justify-between backface-hidden shadow-2xl">
                <span className="text-[9px] font-bold text-indigo-400 uppercase tracking-wider block">Question</span>
                <div className="flex-1 flex items-center justify-center text-center text-base font-extrabold text-white leading-relaxed">
                  {activeCard.front}
                </div>
                <div className="text-center text-[10px] text-zinc-500">
                  Click or press <span className="bg-zinc-800 px-1 rounded">Space</span> to flip
                </div>
              </div>

              {/* CARD BACK */}
<div className="absolute inset-0 w-full h-full bg-black border border-zinc-800 rounded-3xl p-6 flex flex-col justify-between backface-hidden rotate-y-180 shadow-2xl">
  <span className="text-[9px] font-bold text-indigo-400 uppercase tracking-wider block">Answer</span>
  <div className="flex-1 flex items-center justify-center text-center text-base font-medium text-slate-200 leading-relaxed">
    {activeCard.back}
  </div>
  <div className="text-center text-[10px] text-zinc-500">
    Rate your recollection difficulty below
  </div>
</div>
            </div>
          </div>

          {/* Utilities: Hint & AI Explain */}
          <div className="flex gap-4 mt-6">
            {!isFlipped ? (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  setShowHint(true)
                }}
                className="bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-400 hover:text-zinc-200 text-xs font-semibold px-4 py-2 rounded-xl transition-all"
              >
                Reveal Hint
              </button>
            ) : (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  handleAIExplain()
                }}
                className="bg-indigo-650 hover:bg-indigo-600 text-white text-xs font-semibold px-4 py-2 rounded-xl transition-all shadow-md"
              >
                🤖 AI Explain
              </button>
            )}
          </div>

          {/* Hint Overlay */}
          {showHint && !isFlipped && (
            <div className="mt-4 bg-zinc-900/60 border border-zinc-800 p-3.5 rounded-xl text-center text-xs text-zinc-400 animate-fadeIn max-w-xs">
              Hint: Contains {activeCard.back.split(' ').slice(0, 3).join(' ')}...
            </div>
          )}

          {/* Flip rating buttons 1-5 (Only visible on flipped back side) */}
          <div className={`mt-8 w-full transition-all duration-300 ${isFlipped ? 'opacity-100 scale-100' : 'opacity-0 scale-95 pointer-events-none'}`}>
            <div className="flex justify-between items-center gap-2">
              {[
                { r: 1, label: 'Again', color: 'hover:bg-red-500/20 hover:text-red-400 border-red-500/20 text-red-500' },
                { r: 2, label: 'Hard', color: 'hover:bg-orange-500/20 hover:text-orange-400 border-orange-500/20 text-orange-500' },
                { r: 3, label: 'OK', color: 'hover:bg-yellow-500/20 hover:text-yellow-400 border-yellow-500/20 text-yellow-500' },
                { r: 4, label: 'Good', color: 'hover:bg-indigo-500/20 hover:text-indigo-400 border-indigo-500/20 text-indigo-500' },
                { r: 5, label: 'Easy', color: 'hover:bg-emerald-500/20 hover:text-emerald-400 border-emerald-500/20 text-emerald-500' }
              ].map((rate) => (
                <button
                  key={rate.r}
                  onClick={() => handleRateCard(rate.r)}
                  className={`flex-1 py-3.5 border rounded-2xl text-xs font-bold transition-all ${rate.color}`}
                >
                  <div className="text-[10px] font-bold">{rate.label}</div>
                  <div className="text-[8px] font-mono opacity-50 mt-0.5">{rate.r}</div>
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : (
        /* Celebratory Complete Screen */
        <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-3xl p-8 backdrop-blur-xl flex flex-col items-center justify-center space-y-6 text-center shadow-2xl relative z-10 my-auto animate-scaleUp">
          <span className="text-5xl animate-bounce">🎉</span>
          <div>
            <h1 className="text-2xl font-black text-white">Session Complete!</h1>
            <p className="text-xs text-zinc-500 mt-1.5">You completed your reviews with excellent focus.</p>
          </div>

          <div className="grid grid-cols-2 gap-4 w-full bg-zinc-950/40 border border-zinc-850 p-4 rounded-2xl text-xs">
            <div className="space-y-0.5">
              <span className="text-[10px] text-zinc-500 block uppercase font-bold tracking-wider">Accuracy</span>
              <span className="text-lg font-black text-white">{calculateAccuracy()}%</span>
            </div>
            <div className="space-y-0.5">
              <span className="text-[10px] text-zinc-500 block uppercase font-bold tracking-wider">Avg Quality</span>
              <span className="text-lg font-black text-white">{averageEase} / 5</span>
            </div>
          </div>

          <button
            onClick={() => navigate('/flashcards')}
            className="w-full bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold py-3 rounded-xl transition-all shadow-md"
          >
            Return to Deck Manager
          </button>
        </div>
      )}

      {/* ── COLLAPSIBLE PANEL: AI Explain Sliding Drawer ── */}
      {showAIExplain && (
        <div className="fixed bottom-0 left-0 right-0 z-40 bg-zinc-900 border-t border-zinc-800 max-h-[300px] overflow-y-auto p-6 flex flex-col gap-3 shadow-2xl animate-slideUp select-text rounded-t-3xl">
          <div className="flex items-center justify-between border-b border-zinc-800/80 pb-2 flex-shrink-0">
            <h3 className="text-xs font-bold text-white flex items-center gap-1.5">
              <span>🤖</span> Deskmate AI Explain
            </h3>
            <button 
              onClick={() => setShowAIExplain(false)}
              className="text-zinc-500 hover:text-zinc-300 text-xs font-bold p-1 hover:bg-zinc-800 rounded-lg transition-colors"
            >
              ✕
            </button>
          </div>

          <div className="flex-1 overflow-y-auto pr-1 text-xs text-zinc-300 prose prose-invert prose-xs leading-relaxed selection:bg-indigo-600/30">
            {aiLoading && !aiExplanation ? (
              <div className="flex items-center gap-2 py-4">
                <svg className="animate-spin h-4 w-4 text-indigo-400" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                <span className="text-zinc-500 font-mono">Formulating contextual explanation...</span>
              </div>
            ) : (
              <ReactMarkdown>{aiExplanation}</ReactMarkdown>
            )}
          </div>
        </div>
      )}

    </div>
  )
}
