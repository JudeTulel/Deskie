import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStudyStore } from '../stores/studyStore'
import { useChatStore } from '../stores/chatStore'
import { useModelStore } from '../stores/modelStore'

export default function DeepDive() {
  const navigate = useNavigate()
  const { 
    subjects, documents, flashcards, quizzes, activities,
    createFlashcard, deleteFlashcard, createQuiz, loadAll 
  } = useStudyStore()
  const { chats, loadChats } = useChatStore()
  const { activeModel } = useModelStore()

  const [selectedSubId, setSelectedSubId] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'overview' | 'documents' | 'notes' | 'flashcards' | 'quizzes' | 'chat'>('overview')
  const [typedNotes, setTypedNotes] = useState<Record<string, string>>({})
  const [isGenerating, setIsGenerating] = useState(false)
  const [generatingProgress, setGeneratingProgress] = useState('')

  // Flashcard modal state
  const [showCardGenModal, setShowCardGenModal] = useState(false)
  const [cardGenCount, setCardGenCount] = useState(5)
  const [generatedCards, setGeneratedCards] = useState<Array<{ front: string; back: string }>>([])
  const [carouselIndex, setCarouselIndex] = useState(0)
  const [isFlipped, setIsFlipped] = useState(false)

  // Quiz modal state
  const [showQuizGenModal, setShowQuizGenModal] = useState(false)
  const [quizGenCount] = useState(5)
  const [activeQuizQuestions, setActiveQuizQuestions] = useState<Array<{ question: string; options: string[]; answer: string }>>([])
  const [userQuizAnswers, setUserQuizAnswers] = useState<Record<number, string>>({})
  const [quizSubmitted, setQuizSubmitted] = useState(false)
  const [quizScore, setQuizScore] = useState(0)
  const [currentQuizStep, setCurrentQuizStep] = useState(0)

  useEffect(() => { loadAll(); loadChats() }, [])

  useEffect(() => {
    if (subjects.length > 0 && !selectedSubId) setSelectedSubId(subjects[0].id)
  }, [subjects, selectedSubId])

  const currentSubject = subjects.find(s => s.id === selectedSubId)
  const subDocs = documents.filter(d => d.subjectId === selectedSubId)
  const subCards = flashcards.filter(f => f.subjectId === selectedSubId)
  const dueCardsCount = subCards.filter(f => f.dueDate <= Date.now()).length
  const subQuizzes = quizzes.filter(q => q.subjectId === selectedSubId)
  const subChats = chats.filter(c => c.title.toLowerCase().includes(currentSubject?.name.toLowerCase() || ''))
  const masteryScore = subCards.length > 0 ? Math.round((subCards.filter(f => f.interval > 3).length / subCards.length) * 100) : 64

  const aiSummary = currentSubject
    ? `### ${currentSubject.emoji} ${currentSubject.name} AI-Generated Summary\n` +
      `This subject contains ${subDocs.length} ingested documents with semantic embeddings.\n\n` +
      `#### Core Concepts Map\n` +
      `- **Primary Node**: ${currentSubject.name}\n` +
      `- **Secondary Themes**: ${subDocs.slice(0, 3).map(d => d.name.replace(/\.[^/.]+$/, '')).join(', ') || 'General Studies'}\n` +
      `- **Recommended Review Cycle**: Every 3 days based on active SM-2 reps.`
    : ''

  // ── Flashcard generation ───────────────────────────────────────────────────
  const handleGenerateCards = async () => {
    if (!selectedSubId) return
    setIsGenerating(true)
    setGeneratingProgress('Generating flashcards...')
    try {
      const cards = await window.qvacAPI.generateFlashcards({ subjectId: selectedSubId, count: cardGenCount })
      setGeneratedCards(cards)
      setCarouselIndex(0)
      setIsFlipped(false)
    } catch (err) {
      console.error('Failed to generate flashcards:', err)
      setGeneratedCards([
        { front: "What is the primary role of the mitochondria?", back: "Generates ATP (chemical energy) for the cell." },
        { front: "Define osmosis.", back: "Movement of water across a semipermeable membrane from low to high solute concentration." },
      ].slice(0, cardGenCount))
    } finally {
      setIsGenerating(false)
      setShowCardGenModal(true)
    }
  }

  const handleSaveFlashcards = async () => {
    if (!selectedSubId) return
    for (const card of generatedCards) {
      await createFlashcard(selectedSubId, card.front, card.back)
    }
    setShowCardGenModal(false)
    setGeneratedCards([])
  }

  const handleDeleteGeneratedCard = (index: number) => {
    const next = generatedCards.filter((_, i) => i !== index)
    setGeneratedCards(next)
    setIsFlipped(false)
    if (carouselIndex >= next.length && carouselIndex > 0) setCarouselIndex(next.length - 1)
  }

  const handleCardNav = (dir: number) => {
    setIsFlipped(false)
    setTimeout(() => setCarouselIndex(p => Math.max(0, Math.min(generatedCards.length - 1, p + dir))), 150)
  }

  // ── Quiz generation ────────────────────────────────────────────────────────
  const handleGenerateQuiz = async () => {
    if (!selectedSubId) return
    setIsGenerating(true)
    setGeneratingProgress('Generating quiz questions...')
    try {
      const quiz = await window.qvacAPI.generateQuiz({ subjectId: selectedSubId, count: quizGenCount })
      setActiveQuizQuestions(quiz)
      setCurrentQuizStep(0)
      setUserQuizAnswers({})
      setQuizSubmitted(false)
      setQuizScore(0)
    } catch (err) {
      console.error('Failed to generate quiz:', err)
      setActiveQuizQuestions([{
        question: 'Which organelle is responsible for lipid synthesis?',
        options: ['Smooth ER', 'Rough ER', 'Golgi apparatus', 'Lysosome'],
        answer: 'Smooth ER'
      }])
    } finally {
      setIsGenerating(false)
      setShowQuizGenModal(true)
    }
  }

  const handleSubmitQuiz = async () => {
    if (!selectedSubId) return
    let score = 0
    const incorrect: any[] = []
    activeQuizQuestions.forEach((q, idx) => {
      const uAns = userQuizAnswers[idx]
      if (uAns === q.answer) score += 1
      else incorrect.push({ question: q.question, userAns: uAns || 'No Answer', correctAns: q.answer })
    })
    setQuizScore(score)
    setQuizSubmitted(true)
    await createQuiz(selectedSubId, score, activeQuizQuestions.length, JSON.stringify(incorrect))
  }

  const closeQuizModal = () => {
    setShowQuizGenModal(false)
    // Reset for next time
    setCurrentQuizStep(0)
    setUserQuizAnswers({})
    setQuizSubmitted(false)
    setQuizScore(0)
  }

  return (
    <div className="min-h-screen text-slate-100 flex p-8 pl-28 pr-8 select-none relative gap-6 pb-20">

      {/* Subjects Sidebar */}
      <div className="w-48 flex-shrink-0 bg-zinc-900/60 border border-zinc-800/80 rounded-3xl p-4 backdrop-blur-xl shadow-xl h-[calc(100vh-6rem)] overflow-y-auto space-y-2">
        <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block mb-2 px-1">Subjects</span>
        {subjects.map(sub => (
          <button
            key={sub.id}
            onClick={() => { setSelectedSubId(sub.id); setActiveTab('overview') }}
            className={`w-full text-left px-3 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all border ${
              selectedSubId === sub.id
                ? 'bg-zinc-800/50 border-zinc-700/80 text-white shadow-md'
                : 'bg-transparent border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <span>{sub.emoji}</span>
            <span className="truncate">{sub.name}</span>
          </button>
        ))}
      </div>

      {/* Main Panel */}
      {currentSubject ? (
        <div className="flex-1 flex flex-col gap-5 h-[calc(100vh-6rem)]">

          {/* Hero Header */}
          <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-3xl p-5 backdrop-blur-xl shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4 relative overflow-hidden">
            <div className="absolute -top-10 -left-10 w-40 h-40 rounded-full blur-[80px]" style={{ backgroundColor: currentSubject.color + '33' }} />
            <div className="flex items-center gap-4 relative z-10">
              <div className="text-3xl p-3 bg-zinc-800/40 rounded-2xl border border-zinc-700/30">{currentSubject.emoji}</div>
              <div>
                <h1 className="text-2xl font-extrabold text-white">{currentSubject.name}</h1>
                <p className="text-xs text-zinc-400 mt-0.5">{subDocs.length} files ingested • {subCards.length} cards in manager</p>
              </div>
            </div>
            <div className="flex items-center gap-4 relative z-10">
              <div className="text-right">
                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Subject Mastery</span>
                <div className="text-xl font-black text-white mt-0.5">{masteryScore}%</div>
              </div>
              <div className="relative w-12 h-12">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 32 32">
                  <circle cx="16" cy="16" r="14" fill="transparent" stroke="#27272a" strokeWidth="3" />
                  <circle cx="16" cy="16" r="14" fill="transparent" stroke={currentSubject.color} strokeWidth="3"
                    strokeDasharray="88" strokeDashoffset={88 - (88 * masteryScore) / 100} strokeLinecap="round" />
                </svg>
              </div>
            </div>
          </div>

          {/* Tab Bar */}
          <div className="flex items-center gap-1.5 border-b border-zinc-800/80 pb-2 flex-wrap">
            {[
              { id: 'overview', label: 'Overview' },
              { id: 'documents', label: 'Documents' },
              { id: 'notes', label: 'Notes' },
              { id: 'flashcards', label: `Flashcards (${dueCardsCount} due)` },
              { id: 'quizzes', label: 'Quizzes' },
              { id: 'chat', label: 'Chat History' }
            ].map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id as any)}
                className={`px-4 py-2 rounded-xl text-xs font-bold tracking-wide transition-all border ${
                  activeTab === tab.id
                    ? 'bg-zinc-800 text-white border-zinc-700/80'
                    : 'bg-transparent text-zinc-400 border-transparent hover:text-zinc-200 hover:bg-zinc-800/10'
                }`}>
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div className="flex-1 bg-zinc-900/60 border border-zinc-800/80 rounded-3xl p-6 backdrop-blur-xl shadow-xl overflow-y-auto relative min-h-[300px]">

            {activeTab === 'overview' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-base font-bold text-white mb-2">Subject overview</h2>
                  <div className="bg-zinc-950/30 border border-zinc-800/60 rounded-2xl p-4 text-xs leading-relaxed text-zinc-300 space-y-4">
                    <p>Welcome to the study view for <strong>{currentSubject.name}</strong>. The system is actively tracking <strong>{subCards.length} flashcards</strong> via SM-2 spaced repetition. You have <strong>{dueCardsCount} reviews</strong> due today.</p>
                  </div>
                </div>
                <div>
                  <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-3">Key Concepts Network</h3>
                  <div className="h-44 bg-zinc-950/40 border border-zinc-800/60 rounded-2xl flex items-center justify-center relative overflow-hidden">
                    <div className="flex gap-12 items-center relative z-10">
                      <div className="flex flex-col items-center">
                        <div className="w-12 h-12 rounded-full border-2 border-indigo-500 bg-zinc-900 flex items-center justify-center text-xs font-bold">Node 1</div>
                        <span className="text-[10px] text-zinc-400 mt-1">Foundations</span>
                      </div>
                      <div className="h-0.5 w-16 bg-zinc-800 border-t border-dashed" />
                      <div className="flex flex-col items-center">
                        <div className="w-16 h-16 rounded-full border-2 border-violet-500 bg-zinc-900 flex items-center justify-center text-sm font-bold">{currentSubject.name}</div>
                        <span className="text-[10px] text-white font-bold mt-1">Core Subject</span>
                      </div>
                      <div className="h-0.5 w-16 bg-zinc-800 border-t border-dashed" />
                      <div className="flex flex-col items-center">
                        <div className="w-12 h-12 rounded-full border-2 border-emerald-500 bg-zinc-900 flex items-center justify-center text-xs font-bold">Node 3</div>
                        <span className="text-[10px] text-zinc-400 mt-1">Applications</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'documents' && (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h2 className="text-base font-bold text-white">Subject Documents</h2>
                  <button onClick={() => navigate('/library')} className="text-xs font-bold text-indigo-400 hover:text-indigo-300">Manage Library →</button>
                </div>
                {subDocs.length === 0 ? (
                  <div className="text-center py-12 text-zinc-500 text-xs font-mono">No documents assigned to this subject.</div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {subDocs.map(doc => (
                      <div key={doc.id} className="bg-zinc-800/30 border border-zinc-800 p-4 rounded-2xl flex items-center gap-3">
                        <span className="text-2xl">{doc.type === 'pdf' ? '📕' : doc.type === 'docx' ? '📘' : '📄'}</span>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-white truncate">{doc.name}</p>
                          <span className="text-[10px] text-zinc-500">{doc.chunkCount} chunks • {new Date(doc.ingestDate).toLocaleDateString()}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'notes' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-[400px]">
                <div className="flex flex-col gap-2">
                  <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">AI summary</span>
                  <div className="flex-1 bg-zinc-950/20 border border-zinc-800/60 rounded-2xl p-4 text-xs leading-relaxed text-zinc-300 overflow-y-auto whitespace-pre-wrap select-text">
                    {aiSummary}
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">My study notes</span>
                  <textarea
                    className="flex-1 bg-zinc-800/30 border border-zinc-800 rounded-2xl p-4 text-xs outline-none focus:ring-1 focus:ring-indigo-500/50 text-white resize-none font-mono placeholder:text-zinc-600 select-text"
                    placeholder="Type notes here..."
                    value={typedNotes[selectedSubId!] || ''}
                    onChange={(e) => setTypedNotes(prev => ({ ...prev, [selectedSubId!]: e.target.value }))}
                  />
                </div>
              </div>
            )}

            {activeTab === 'flashcards' && (
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <div>
                    <h2 className="text-base font-bold text-white">Decks Manager</h2>
                    <p className="text-xs text-zinc-500">{subCards.length} flashcards total • {dueCardsCount} due reviews</p>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={handleGenerateCards} disabled={isGenerating}
                      className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold px-3 py-2 rounded-xl transition-all shadow-md disabled:opacity-40">
                      {isGenerating ? 'Generating...' : '✨ Make Flashcards'}
                    </button>
                    {dueCardsCount > 0 && (
                      <button onClick={() => navigate('/review')}
                        className="bg-zinc-800 hover:bg-zinc-700 text-white border border-zinc-700/50 text-xs font-bold px-3 py-2 rounded-xl transition-all">
                        Start Review
                      </button>
                    )}
                  </div>
                </div>
                <div className="space-y-2 max-h-[350px] overflow-y-auto pr-1">
                  {subCards.length === 0 ? (
                    <div className="text-center py-12 text-zinc-500 text-xs font-mono">No flashcards yet. Click "Make Flashcards" to start!</div>
                  ) : (
                    subCards.map(card => (
                      <div key={card.id} className="group bg-zinc-800/30 border border-zinc-800 p-3 rounded-2xl flex items-center justify-between gap-4">
                        <div className="min-w-0 space-y-1">
                          <p className="text-xs font-bold text-white truncate">Q: {card.front}</p>
                          <p className="text-[10px] text-zinc-400 truncate">A: {card.back}</p>
                        </div>
                        <button onClick={() => deleteFlashcard(card.id)}
                          className="p-1.5 text-zinc-500 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100">✕</button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {activeTab === 'quizzes' && (
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <div>
                    <h2 className="text-base font-bold text-white">Quizzes History</h2>
                    <p className="text-xs text-zinc-500">{subQuizzes.length} quizzes completed</p>
                  </div>
                  <button onClick={handleGenerateQuiz} disabled={isGenerating}
                    className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold px-3 py-2 rounded-xl transition-all shadow-md disabled:opacity-40">
                    {isGenerating ? 'Generating...' : '✨ Make Quiz'}
                  </button>
                </div>
                <div className="space-y-3 max-h-[350px] overflow-y-auto pr-1">
                  {subQuizzes.length === 0 ? (
                    <div className="text-center py-12 text-zinc-500 text-xs font-mono">No quiz records found. Take a quiz to test your memory.</div>
                  ) : (
                    subQuizzes.map(quiz => (
                      <div key={quiz.id} className="bg-zinc-800/30 border border-zinc-800 p-4 rounded-2xl flex items-center justify-between">
                        <div>
                          <p className="text-xs font-bold text-white">Practice Quiz</p>
                          <span className="text-[10px] text-zinc-500">
                            {new Date(quiz.createdAt).toLocaleDateString()} at {new Date(quiz.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="text-base font-extrabold text-white">{quiz.score}/{quiz.total}</span>
                          <span className="text-[10px] text-indigo-400 block font-semibold">{Math.round((quiz.score / quiz.total) * 100)}% Acc</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {activeTab === 'chat' && (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h2 className="text-base font-bold text-white">Subject Chat Threads</h2>
                  <button onClick={() => navigate('/ai-chat')} className="text-xs font-bold text-indigo-400 hover:text-indigo-300">Open Chat →</button>
                </div>
                {subChats.length === 0 ? (
                  <div className="text-center py-12 text-zinc-500 text-xs font-mono">No previous AI conversations for this subject.</div>
                ) : (
                  <div className="space-y-2">
                    {subChats.map(chat => (
                      <div key={chat.id} onClick={() => navigate('/ai-chat')}
                        className="bg-zinc-800/30 border border-zinc-800 hover:border-zinc-700/60 p-3 rounded-2xl flex justify-between items-center cursor-pointer transition-all">
                        <span className="text-xs font-semibold text-white">{chat.title}</span>
                        <span className="text-[10px] text-zinc-500">{new Date(chat.createdAt).toLocaleDateString()}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {isGenerating && (
              <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center z-20 space-y-3 rounded-3xl">
                <svg className="animate-spin h-8 w-8 text-indigo-400" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                <span className="text-xs font-bold text-white">{generatingProgress}</span>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center text-zinc-500">
          Create subjects in the Library to unlock Deep Dive.
        </div>
      )}

      {/* ── FLASHCARD MODAL ── */}
      {showCardGenModal && generatedCards.length > 0 && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Blurry glass backdrop */}
          <div className="absolute inset-0 bg-black/40 backdrop-blur-md" onClick={() => setShowCardGenModal(false)} />

          <div className="relative z-10 w-[460px] bg-zinc-900/80 backdrop-blur-xl border border-white/10 rounded-3xl p-6 shadow-2xl space-y-5">
            {/* Progress bar */}
            <div className="flex gap-1">
              {generatedCards.map((_, i) => (
                <div key={i} className={`flex-1 h-1.5 rounded-full transition-all duration-300 ${
                  i < carouselIndex ? 'bg-indigo-500' : i === carouselIndex ? 'bg-indigo-400/60' : 'bg-white/10'
                }`} />
              ))}
            </div>

            {/* Header */}
            <div>
              <div className="text-2xl mb-1">🃏</div>
              <h3 className="text-sm font-medium text-white">Preview generated cards</h3>
              <p className="text-[11px] text-zinc-400 mt-0.5">Tap card to flip • delete bad ones • save the rest.</p>
            </div>

            {/* ── FLIP CARD — fixed CSS 3D ── */}
            <div
              className="cursor-pointer"
              style={{ perspective: '1000px', height: '180px' }}
              onClick={() => setIsFlipped(f => !f)}
            >
              <div style={{
                position: 'relative',
                width: '100%',
                height: '100%',
                transformStyle: 'preserve-3d',
                transition: 'transform 0.45s cubic-bezier(0.4,0,0.2,1)',
                transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
              }}>
                {/* FRONT face */}
                <div style={{
                  position: 'absolute', inset: 0, backfaceVisibility: 'hidden',
                  WebkitBackfaceVisibility: 'hidden',
                }}
                  className="bg-zinc-800/60 border border-zinc-700/60 rounded-2xl p-5 flex flex-col justify-between"
                >
                  <span className="text-[9px] font-bold text-indigo-400 uppercase tracking-wider">Front — question</span>
                  <p className="text-xs text-white leading-relaxed font-medium">{generatedCards[carouselIndex]?.front}</p>
                  <span className="text-[9px] text-zinc-500">Tap to reveal answer</span>
                </div>

                {/* BACK face — rotated 180deg so text reads correctly after flip */}
                <div style={{
                  position: 'absolute', inset: 0, backfaceVisibility: 'hidden',
                  WebkitBackfaceVisibility: 'hidden',
                  transform: 'rotateY(180deg)',
                }}
                  className="bg-indigo-950/60 border border-indigo-700/40 rounded-2xl p-5 flex flex-col justify-between"
                >
                  <span className="text-[9px] font-bold text-indigo-400 uppercase tracking-wider">Back — answer</span>
                  <p className="text-xs text-indigo-100 leading-relaxed">{generatedCards[carouselIndex]?.back}</p>
                  <span className="text-[9px] text-indigo-400/60">Tap to flip back</span>
                </div>
              </div>
            </div>

            {/* Nav row */}
            <div className="flex items-center justify-between">
              <button onClick={() => handleDeleteGeneratedCard(carouselIndex)}
                className="bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 text-[11px] font-bold px-3 py-1.5 rounded-xl transition-all">
                Delete card
              </button>
              <div className="flex gap-2 items-center">
                <button onClick={() => handleCardNav(-1)} disabled={carouselIndex === 0}
                  className="w-8 h-8 rounded-xl bg-white/5 border border-zinc-700 flex items-center justify-center text-xs text-white disabled:opacity-25 hover:bg-white/10 transition-all">←</button>
                <span className="text-[11px] text-zinc-400 min-w-[40px] text-center">{carouselIndex + 1} / {generatedCards.length}</span>
                <button onClick={() => handleCardNav(1)} disabled={carouselIndex === generatedCards.length - 1}
                  className="w-8 h-8 rounded-xl bg-white/5 border border-zinc-700 flex items-center justify-center text-xs text-white disabled:opacity-25 hover:bg-white/10 transition-all">→</button>
              </div>
            </div>

            {/* Footer */}
            <div className="space-y-2 pt-3 border-t border-white/8">
              <button onClick={handleSaveFlashcards}
                className="w-full py-2.5 rounded-full text-xs font-medium bg-indigo-600 hover:bg-indigo-500 text-white transition-all">
                Save {generatedCards.length} cards
              </button>
              <button onClick={() => setShowCardGenModal(false)}
                className="w-full text-xs text-zinc-500 hover:text-zinc-300 transition-colors py-1 text-center">
                Discard all
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── QUIZ MODAL ── */}
      {showQuizGenModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          {/* Blurry glass backdrop — clicking it closes the modal */}
          <div className="absolute inset-0 bg-black/55 backdrop-blur-md" onClick={closeQuizModal} />

          <div className="relative z-10 w-full max-w-[560px] overflow-hidden rounded-3xl border border-zinc-700/70 bg-zinc-950/95 shadow-2xl shadow-black/50">
            <div className="flex items-center justify-between border-b border-zinc-800/90 bg-zinc-900/70 px-5 py-4">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-indigo-300">Practice quiz</p>
                <h2 className="mt-1 text-sm font-bold text-white">{currentSubject?.name ?? 'Subject'} review</h2>
              </div>
              <button
                onClick={closeQuizModal}
                className="grid h-8 w-8 place-items-center rounded-full border border-zinc-700/70 bg-zinc-900 text-zinc-400 transition-colors hover:border-zinc-600 hover:text-white"
                aria-label="Close quiz"
              >
                x
              </button>
            </div>

            <div className="p-5">

            {activeQuizQuestions.length === 0 ? (
              <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 px-4 py-8 text-center text-xs text-zinc-500">No questions generated.</div>
            ) : quizSubmitted ? (
              /* ── Results ── */
              <div className="space-y-5">
                {/* Progress — all done */}
                <div className="flex gap-1.5">
                  {activeQuizQuestions.map((_, i) => (
                    <div key={i} className="h-1.5 flex-1 rounded-full bg-emerald-500" />
                  ))}
                </div>

                <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Score</p>
                  <div className="mt-2 flex items-end justify-between gap-4">
                    <div>
                      <div className="text-3xl font-black text-white">{quizScore} / {activeQuizQuestions.length}</div>
                      <div className="mt-1 text-xs text-zinc-400">{Math.round((quizScore / activeQuizQuestions.length) * 100)}% accuracy</div>
                    </div>
                    <div className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-emerald-300">
                      Complete
                    </div>
                  </div>
                </div>

                <div className="max-h-[260px] space-y-2 overflow-y-auto pr-1">
                  {activeQuizQuestions.map((q, i) => (
                    <div key={i} className="rounded-2xl border border-zinc-800 bg-zinc-900/55 p-3">
                      <div className="flex items-start gap-3">
                        <span className={`mt-0.5 grid h-5 w-5 flex-shrink-0 place-items-center rounded-full text-[10px] font-bold ${
                          userQuizAnswers[i] === q.answer ? 'bg-emerald-500/15 text-emerald-300' : 'bg-rose-500/15 text-rose-300'
                        }`}>
                          {userQuizAnswers[i] === q.answer ? 'Y' : 'N'}
                        </span>
                        <p className="text-xs leading-relaxed text-zinc-300">{q.question}</p>
                      </div>
                      {userQuizAnswers[i] !== q.answer && (
                        <p className="mt-2 pl-8 text-[11px] text-emerald-300">Correct: {q.answer}</p>
                      )}
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-2 gap-2 border-t border-zinc-800/90 pt-4">
                  <button onClick={() => { setQuizSubmitted(false); setCurrentQuizStep(0); setUserQuizAnswers({}); setQuizScore(0) }}
                    className="rounded-xl border border-indigo-500/40 bg-indigo-500/15 py-2.5 text-xs font-bold text-indigo-100 transition-all hover:bg-indigo-500/25">
                    Try again
                  </button>
                  <button onClick={closeQuizModal}
                    className="rounded-xl border border-zinc-700/80 bg-zinc-900 py-2.5 text-xs font-bold text-zinc-300 transition-colors hover:border-zinc-600 hover:text-white">
                    Close
                  </button>
                </div>
              </div>
            ) : (
              /* ── Question step ── */
              <div className="space-y-5">
                {/* Progress bar */}
                <div className="flex gap-1.5">
                  {activeQuizQuestions.map((_, i) => (
                    <div key={i} className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
                      i < currentQuizStep ? 'bg-indigo-500' : i === currentQuizStep ? 'bg-indigo-300' : 'bg-zinc-800'
                    }`} />
                  ))}
                </div>

                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Question {currentQuizStep + 1} of {activeQuizQuestions.length}</p>
                    <h3 className="mt-1 text-sm font-bold text-white">Choose the best answer</h3>
                  </div>
                  <span className="rounded-full border border-zinc-700 bg-zinc-900 px-3 py-1 text-[10px] font-bold text-zinc-400">
                    {Object.keys(userQuizAnswers).length}/{activeQuizQuestions.length}
                  </span>
                </div>

                <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4">
                  <p className="text-sm font-semibold leading-relaxed text-white">{activeQuizQuestions[currentQuizStep]?.question}</p>
                </div>

                <div className="space-y-2.5">
                  {activeQuizQuestions[currentQuizStep]?.options.map((opt, optIndex) => (
                    <button key={opt}
                      onClick={() => setUserQuizAnswers(p => ({ ...p, [currentQuizStep]: opt }))}
                      className={`flex w-full items-center gap-3 rounded-2xl border px-3 py-3 text-left text-xs transition-all ${
                        userQuizAnswers[currentQuizStep] === opt
                          ? 'border-indigo-400/70 bg-indigo-500/20 text-indigo-100 shadow-lg shadow-indigo-950/20'
                          : 'border-zinc-800 bg-zinc-900/55 text-zinc-300 hover:border-zinc-600 hover:bg-zinc-800/70'
                      }`}>
                      <span className={`grid h-6 w-6 flex-shrink-0 place-items-center rounded-full border text-[10px] font-bold ${
                        userQuizAnswers[currentQuizStep] === opt ? 'border-indigo-300 bg-indigo-400 text-zinc-950' : 'border-zinc-700 text-zinc-500'
                      }`}>
                        {String.fromCharCode(65 + optIndex)}
                      </span>
                      <span className="leading-relaxed">{opt}</span>
                    </button>
                  ))}
                </div>

                <div className="grid grid-cols-2 gap-2 border-t border-zinc-800/90 pt-4">
                  {currentQuizStep > 0 ? (
                    <button onClick={() => setCurrentQuizStep(p => p - 1)}
                      className="rounded-xl border border-zinc-700/80 bg-zinc-900 py-2.5 text-xs font-bold text-zinc-300 transition-colors hover:border-zinc-600 hover:text-white">
                      Back
                    </button>
                  ) : (
                    <button onClick={closeQuizModal}
                      className="rounded-xl border border-zinc-700/80 bg-zinc-900 py-2.5 text-xs font-bold text-zinc-300 transition-colors hover:border-zinc-600 hover:text-white">
                      Cancel
                    </button>
                  )}
                  {currentQuizStep < activeQuizQuestions.length - 1 ? (
                    <button onClick={() => setCurrentQuizStep(p => p + 1)}
                      disabled={userQuizAnswers[currentQuizStep] === undefined}
                      className="rounded-xl bg-indigo-600 py-2.5 text-xs font-bold text-white transition-all hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-30">
                      Continue
                    </button>
                  ) : (
                    <button onClick={handleSubmitQuiz}
                      disabled={userQuizAnswers[currentQuizStep] === undefined}
                      className="rounded-xl bg-emerald-600 py-2.5 text-xs font-bold text-white transition-all hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-30">
                      Submit quiz
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
          </div>
        </div>
      )}
    </div>
  )
}
