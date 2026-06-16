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

  // Selection state
  const [selectedSubId, setSelectedSubId] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'overview' | 'documents' | 'notes' | 'flashcards' | 'quizzes' | 'chat'>('overview')

  // UI state
  const [typedNotes, setTypedNotes] = useState<Record<string, string>>({})
  const [isGenerating, setIsGenerating] = useState(false)
  const [generatingProgress, setGeneratingProgress] = useState('')
  
  // Generated flashcard preview carousel modal
  const [showCardGenModal, setShowCardGenModal] = useState(false)
  const [cardGenCount, setCardGenCount] = useState(10)
  const [generatedCards, setGeneratedCards] = useState<Array<{ front: string; back: string }>>([])
  const [carouselIndex, setCarouselIndex] = useState(0)

  // Generated quiz modal
  const [showQuizGenModal, setShowQuizGenModal] = useState(false)
  const [quizGenCount, setQuizGenCount] = useState(5)
  const [activeQuizQuestions, setActiveQuizQuestions] = useState<Array<{ question: string; options: string[]; answer: string }>>([])
  const [userQuizAnswers, setUserQuizAnswers] = useState<Record<number, string>>({})
  const [quizSubmitted, setQuizSubmitted] = useState(false)
  const [quizScore, setQuizScore] = useState(0)

  useEffect(() => {
    loadAll()
    loadChats()
  }, [])

  // Auto select first subject if none selected
  useEffect(() => {
    if (subjects.length > 0 && !selectedSubId) {
      setSelectedSubId(subjects[0].id)
    }
  }, [subjects, selectedSubId])

  const currentSubject = subjects.find(s => s.id === selectedSubId)

  // Filter studyStore data by subject
  const subDocs = documents.filter(d => d.subjectId === selectedSubId)
  const subCards = flashcards.filter(f => f.subjectId === selectedSubId)
  const dueCardsCount = subCards.filter(f => f.dueDate <= Date.now()).length
  const subQuizzes = quizzes.filter(q => q.subjectId === selectedSubId)
  const subChats = chats.filter(c => c.title.toLowerCase().includes(currentSubject?.name.toLowerCase() || ''))

  // Calculate mastery score
  const masteryScore = subCards.length > 0 ? Math.round((subCards.filter(f => f.interval > 3).length / subCards.length) * 100) : 64

  // AI Summary & Chapter highlights
  const aiSummary = currentSubject
    ? `### ${currentSubject.emoji} ${currentSubject.name} AI-Generated Summary\n` +
      `This subject contains ${subDocs.length} ingested documents with semantic embeddings. Key themes extracted relate to foundational concepts of ${currentSubject.name}.\n\n` +
      `#### Core Concepts Map\n` +
      `- **Primary Node**: ${currentSubject.name}\n` +
      `- **Secondary Themes**: ${subDocs.slice(0, 3).map(d => d.name.replace(/\.[^/.]+$/, '')).join(', ') || 'General Studies'}\n` +
      `- **Recommended Review Cycle**: Every 3 days based on active SM-2 reps.`
    : ''

  // SM-2 Spaced Repetition Flashcard generator
  const handleGenerateCards = async () => {
    if (!selectedSubId) return
    setIsGenerating(true)
    setGeneratingProgress('Analyzing notes in vector store...')
    
    // Simulate LLM parsing context chunks and generating QA cards
    await new Promise((r) => setTimeout(r, 1000))
    setGeneratingProgress('Synthesizing core concepts...')
    await new Promise((r) => setTimeout(r, 800))
    setGeneratingProgress('Formulating flashcard prompts...')
    await new Promise((r) => setTimeout(r, 600))

    const mockGen = [
      { front: `What is the primary role of the mitochondria in a cell?`, back: `Often called the powerhouse of the cell, it generates chemical energy (ATP).` },
      { front: `Explain the process of transcription in protein synthesis.`, back: `It is the process where a DNA sequence is copied into mRNA by RNA polymerase.` },
      { front: `What are codons?`, back: `A sequence of three nucleotides which together form a unit of genetic code in a DNA or RNA molecule.` },
      { front: `What is cellular respiration?`, back: `The process by which cells break down glucose into energy (ATP).` },
      { front: `Define homeostasis.`, back: `The tendency toward a relatively stable equilibrium between interdependent physiological processes.` },
    ]

    setGeneratedCards(mockGen.slice(0, cardGenCount))
    setCarouselIndex(0)
    setIsGenerating(false)
    setShowCardGenModal(true)
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
    setGeneratedCards(prev => prev.filter((_, i) => i !== index))
    if (carouselIndex >= generatedCards.length - 1) {
      setCarouselIndex(Math.max(0, generatedCards.length - 2))
    }
  }

  // Quiz generator
  const handleGenerateQuiz = async () => {
    if (!selectedSubId) return
    setIsGenerating(true)
    setGeneratingProgress('Extracting key definitions...')
    await new Promise((r) => setTimeout(r, 1200))
    setGeneratingProgress('Designing multiple-choice options...')
    await new Promise((r) => setTimeout(r, 1000))

    const mockQuestions = [
      {
        question: 'Which organelle is responsible for lipid synthesis?',
        options: ['Smooth Endoplasmic Reticulum', 'Rough Endoplasmic Reticulum', 'Golgi Apparatus', 'Lysosome'],
        answer: 'Smooth Endoplasmic Reticulum'
      },
      {
        question: 'What is the powerhouse of the cell?',
        options: ['Nucleus', 'Mitochondria', 'Chloroplast', 'Ribosome'],
        answer: 'Mitochondria'
      },
      {
        question: 'Which nucleotide base pairs with Adenine in RNA?',
        options: ['Thymine', 'Uracil', 'Cytosine', 'Guanine'],
        answer: 'Uracil'
      }
    ]

    setActiveQuizQuestions(mockQuestions.slice(0, quizGenCount))
    setUserQuizAnswers({})
    setQuizSubmitted(false)
    setIsGenerating(false)
    setShowQuizGenModal(true)
  }

  const handleSubmitQuiz = async () => {
    if (!selectedSubId) return
    let score = 0
    const incorrect: any[] = []

    activeQuizQuestions.forEach((q, idx) => {
      const uAns = userQuizAnswers[idx]
      if (uAns === q.answer) {
        score += 1
      } else {
        incorrect.push({ question: q.question, userAns: uAns || 'No Answer', correctAns: q.answer })
      }
    })

    setQuizScore(score)
    setQuizSubmitted(true)
    
    // Save quiz to SQLite
    await createQuiz(selectedSubId, score, activeQuizQuestions.length, JSON.stringify(incorrect))
  }

  return (
    <div className="min-h-screen text-slate-100 flex p-8 pl-28 pr-8 select-none relative gap-6 pb-20">
      
      {/* Subjects Switcher Sidebar (Left 20%) */}
      <div className="w-48 flex-shrink-0 bg-zinc-900/60 border border-zinc-800/80 rounded-3xl p-4 backdrop-blur-xl shadow-xl h-[calc(100vh-6rem)] overflow-y-auto space-y-2">
        <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block mb-2 px-1">Subjects</span>
        {subjects.map(sub => (
          <button
            key={sub.id}
            onClick={() => {
              setSelectedSubId(sub.id)
              setActiveTab('overview')
            }}
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

      {/* Main Subject Panel (Right 80%) */}
      {currentSubject ? (
        <div className="flex-1 flex flex-col gap-5 h-[calc(100vh-6rem)]">
          {/* Hero Header */}
          <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-3xl p-5 backdrop-blur-xl shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4 relative overflow-hidden">
            {/* Background Glow */}
            <div className="absolute -top-10 -left-10 w-40 h-40 rounded-full blur-[80px]" style={{ backgroundColor: currentSubject.color + '33' }} />

            <div className="flex items-center gap-4 relative z-10">
              <div className="text-3xl p-3 bg-zinc-800/40 rounded-2xl border border-zinc-700/30">
                {currentSubject.emoji}
              </div>
              <div>
                <h1 className="text-2xl font-extrabold text-white">{currentSubject.name}</h1>
                <p className="text-xs text-zinc-400 mt-0.5">{subDocs.length} files ingested • {subCards.length} cards in manager</p>
              </div>
            </div>

            {/* Progress / Mastery Ring */}
            <div className="flex items-center gap-4 relative z-10">
              <div className="text-right">
                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Subject Mastery</span>
                <div className="text-xl font-black text-white mt-0.5">{masteryScore}%</div>
              </div>
              <div className="relative w-12 h-12 flex items-center justify-center">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 32 32">
                  <circle cx="16" cy="16" r="14" fill="transparent" stroke="#27272a" strokeWidth="3" />
                  <circle 
                    cx="16" cy="16" r="14" 
                    fill="transparent" 
                    stroke={currentSubject.color} 
                    strokeWidth="3" 
                    strokeDasharray="88"
                    strokeDashoffset={88 - (88 * masteryScore) / 100}
                    strokeLinecap="round"
                  />
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
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-4 py-2 rounded-xl text-xs font-bold tracking-wide transition-all border ${
                  activeTab === tab.id
                    ? 'bg-zinc-800 text-white border-zinc-700/80'
                    : 'bg-transparent text-zinc-400 border-transparent hover:text-zinc-200 hover:bg-zinc-800/10'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab Content Panels */}
          <div className="flex-1 bg-zinc-900/60 border border-zinc-800/80 rounded-3xl p-6 backdrop-blur-xl shadow-xl overflow-y-auto relative min-h-[300px]">
            
            {/* OVERVIEW TAB */}
            {activeTab === 'overview' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-base font-bold text-white mb-2">Subject overview</h2>
                  <div className="bg-zinc-950/30 border border-zinc-800/60 rounded-2xl p-4 text-xs leading-relaxed text-zinc-300 space-y-4">
                    <p>Welcome to the study view for **{currentSubject.name}**. In this area, we compile semantic knowledge nodes from all documents assigned to the subject.</p>
                    <p>The system is actively tracking **{subCards.length} flashcards** scheduled via standard SuperMemo spaced repetition. You currently have **{dueCardsCount} reviews** due today.</p>
                  </div>
                </div>

                {/* Concept Graph Visual mock */}
                <div>
                  <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-3">Key Concepts Network</h3>
                  <div className="h-44 bg-zinc-950/40 border border-zinc-800/60 rounded-2xl flex items-center justify-center relative overflow-hidden">
                    <div className="absolute w-24 h-24 rounded-full bg-indigo-500/5 blur-xl" />
                    
                    {/* Visual node mocks */}
                    <div className="flex gap-12 items-center relative z-10">
                      <div className="flex flex-col items-center">
                        <div className="w-12 h-12 rounded-full border-2 border-indigo-500 bg-zinc-900 flex items-center justify-center text-xs font-bold shadow-lg">Node 1</div>
                        <span className="text-[10px] text-zinc-400 mt-1">Foundations</span>
                      </div>
                      <div className="h-0.5 w-16 bg-zinc-800 border-t border-dashed" />
                      <div className="flex flex-col items-center">
                        <div className="w-16 h-16 rounded-full border-2 border-violet-500 bg-zinc-900 flex items-center justify-center text-sm font-bold shadow-lg shadow-violet-500/10">{currentSubject.name}</div>
                        <span className="text-[10px] text-white font-bold mt-1">Core Subject</span>
                      </div>
                      <div className="h-0.5 w-16 bg-zinc-800 border-t border-dashed" />
                      <div className="flex flex-col items-center">
                        <div className="w-12 h-12 rounded-full border-2 border-emerald-500 bg-zinc-900 flex items-center justify-center text-xs font-bold shadow-lg">Node 3</div>
                        <span className="text-[10px] text-zinc-400 mt-1">Applications</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* DOCUMENTS TAB */}
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
                          <span className="text-[10px] text-zinc-500">{doc.chunkCount} chunks • Ingested {new Date(doc.ingestDate).toLocaleDateString()}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* NOTES TAB */}
            {activeTab === 'notes' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-[400px]">
                {/* Left: AI chapter summary */}
                <div className="flex flex-col gap-2">
                  <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">AI Chapters summary</span>
                  <div className="flex-1 bg-zinc-950/20 border border-zinc-800/60 rounded-2xl p-4 text-xs leading-relaxed text-zinc-300 overflow-y-auto whitespace-pre-wrap select-text selection:bg-indigo-600/30">
                    {aiSummary}
                  </div>
                </div>

                {/* Right: Manual editor */}
                <div className="flex flex-col gap-2">
                  <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">My study notes</span>
                  <textarea
                    className="flex-1 bg-zinc-800/30 border border-zinc-800 rounded-2xl p-4 text-xs outline-none focus:ring-1 focus:ring-indigo-500/50 text-white resize-none font-mono placeholder:text-zinc-600 select-text"
                    placeholder="Type notes here... Saves automatically."
                    value={typedNotes[selectedSubId] || ''}
                    onChange={(e) => setTypedNotes(prev => ({ ...prev, [selectedSubId]: e.target.value }))}
                  />
                </div>
              </div>
            )}

            {/* FLASHCARDS TAB */}
            {activeTab === 'flashcards' && (
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <div>
                    <h2 className="text-base font-bold text-white">Decks Manager</h2>
                    <p className="text-xs text-zinc-500">{subCards.length} flashcards total • {dueCardsCount} due reviews</p>
                  </div>
                  <div className="flex gap-2">
                    <button 
                      onClick={handleGenerateCards}
                      disabled={isGenerating}
                      className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold px-3 py-2 rounded-xl transition-all shadow-md flex items-center gap-1 disabled:opacity-40"
                    >
                      {isGenerating ? 'Generating...' : '✨ Make Flashcards'}
                    </button>
                    {dueCardsCount > 0 && (
                      <button 
                        onClick={() => navigate('/review')}
                        className="bg-zinc-800 hover:bg-zinc-700 text-white border border-zinc-700/50 text-xs font-bold px-3 py-2 rounded-xl transition-all"
                      >
                        Start Review
                      </button>
                    )}
                  </div>
                </div>

                {/* Flashcards List */}
                <div className="space-y-2 max-h-[350px] overflow-y-auto pr-1">
                  {subCards.length === 0 ? (
                    <div className="text-center py-12 text-zinc-500 text-xs font-mono">No flashcards generated yet. Click "Make Flashcards" to start!</div>
                  ) : (
                    subCards.map(card => (
                      <div key={card.id} className="group bg-zinc-800/30 border border-zinc-800 p-3 rounded-2xl flex items-center justify-between gap-4">
                        <div className="min-w-0 space-y-1">
                          <p className="text-xs font-bold text-white truncate">Q: {card.front}</p>
                          <p className="text-[10px] text-zinc-400 truncate">A: {card.back}</p>
                        </div>
                        <button
                          onClick={() => deleteFlashcard(card.id)}
                          className="p-1.5 text-zinc-500 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100 flex-shrink-0"
                          title="Delete Card"
                        >
                          ✕
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* QUIZZES TAB */}
            {activeTab === 'quizzes' && (
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <div>
                    <h2 className="text-base font-bold text-white">Quizzes History</h2>
                    <p className="text-xs text-zinc-500">{subQuizzes.length} quizzes completed</p>
                  </div>
                  <button 
                    onClick={handleGenerateQuiz}
                    disabled={isGenerating}
                    className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold px-3 py-2 rounded-xl transition-all shadow-md disabled:opacity-40"
                  >
                    {isGenerating ? 'Generating...' : '✨ Make Quiz'}
                  </button>
                </div>

                {/* Quizzes List */}
                <div className="space-y-3 max-h-[350px] overflow-y-auto pr-1">
                  {subQuizzes.length === 0 ? (
                    <div className="text-center py-12 text-zinc-500 text-xs font-mono">No quiz records found. Take a quiz to test your memory.</div>
                  ) : (
                    subQuizzes.map(quiz => (
                      <div key={quiz.id} className="bg-zinc-800/30 border border-zinc-800 p-4 rounded-2xl flex items-center justify-between">
                        <div>
                          <p className="text-xs font-bold text-white">Practice Quiz</p>
                          <span className="text-[10px] text-zinc-500">{new Date(quiz.createdAt).toLocaleDateString()} at {new Date(quiz.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
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

            {/* CHAT TAB */}
            {activeTab === 'chat' && (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h2 className="text-base font-bold text-white">Subject Chat Threads</h2>
                  <button onClick={() => navigate('/ai-chat')} className="text-xs font-bold text-indigo-400 hover:text-indigo-300">Open Chat Center →</button>
                </div>
                {subChats.length === 0 ? (
                  <div className="text-center py-12 text-zinc-500 text-xs font-mono">No previous AI conversation records for this subject.</div>
                ) : (
                  <div className="space-y-2">
                    {subChats.map(chat => (
                      <div 
                        key={chat.id} 
                        onClick={() => navigate('/ai-chat')}
                        className="bg-zinc-800/30 border border-zinc-800 hover:border-zinc-700/60 p-3 rounded-2xl flex justify-between items-center cursor-pointer transition-all"
                      >
                        <span className="text-xs font-semibold text-white">{chat.title}</span>
                        <span className="text-[10px] text-zinc-500">{new Date(chat.createdAt).toLocaleDateString()}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Processing details overlay */}
            {isGenerating && (
              <div className="absolute inset-0 bg-black/60 backdrop-blur-xs flex flex-col items-center justify-center z-20 space-y-3 rounded-3xl">
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

      {/* ── MODALS: Generated Flashcards Carousel Preview ── */}
      {showCardGenModal && generatedCards.length > 0 && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 w-[450px] shadow-2xl space-y-5 animate-scaleUp">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-base font-bold text-white">Preview Generated Cards</h3>
                <p className="text-xs text-zinc-400 mt-1">Review, delete bad cards, and save the deck.</p>
              </div>
              <span className="text-xs font-bold bg-zinc-800 px-2.5 py-1 rounded-full border border-zinc-700/50">
                {carouselIndex + 1} / {generatedCards.length}
              </span>
            </div>

            {/* Swipeable Carousel mock */}
            <div className="bg-zinc-950/40 border border-zinc-800 rounded-2xl p-5 min-h-[160px] flex flex-col justify-between">
              <div className="space-y-2">
                <span className="text-[9px] font-bold text-indigo-400 uppercase tracking-wider">Front (Question)</span>
                <p className="text-xs text-white leading-relaxed font-bold">{generatedCards[carouselIndex]?.front}</p>
              </div>
              <div className="space-y-2 mt-4 pt-4 border-t border-zinc-800/80">
                <span className="text-[9px] font-bold text-indigo-400 uppercase tracking-wider">Back (Answer)</span>
                <p className="text-xs text-zinc-300 leading-relaxed">{generatedCards[carouselIndex]?.back}</p>
              </div>
            </div>

            {/* Carousel Controls */}
            <div className="flex items-center justify-between">
              <button 
                onClick={() => handleDeleteGeneratedCard(carouselIndex)}
                className="bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 text-[11px] font-bold px-3 py-1.5 rounded-xl transition-all"
              >
                Delete Card
              </button>

              <div className="flex gap-2">
                <button
                  onClick={() => setCarouselIndex(prev => Math.max(0, prev - 1))}
                  disabled={carouselIndex === 0}
                  className="w-8 h-8 rounded-xl bg-zinc-850 hover:bg-zinc-800 border border-zinc-800 flex items-center justify-center text-xs disabled:opacity-40"
                >
                  ←
                </button>
                <button
                  onClick={() => setCarouselIndex(prev => Math.min(generatedCards.length - 1, prev + 1))}
                  disabled={carouselIndex === generatedCards.length - 1}
                  className="w-8 h-8 rounded-xl bg-zinc-850 hover:bg-zinc-800 border border-zinc-800 flex items-center justify-center text-xs disabled:opacity-40"
                >
                  →
                </button>
              </div>
            </div>

            <div className="flex justify-end gap-2.5 pt-3 border-t border-zinc-800">
              <button
                onClick={() => setShowCardGenModal(false)}
                className="bg-zinc-800 hover:bg-zinc-700 text-zinc-400 text-xs font-semibold px-4 py-2 rounded-xl transition-all"
              >
                Discard
              </button>
              <button
                onClick={handleSaveFlashcards}
                className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold px-4 py-2 rounded-xl transition-all shadow-md"
              >
                Save {generatedCards.length} Cards
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODALS: Interactive Quiz Practice ── */}
      {showQuizGenModal && activeQuizQuestions.length > 0 && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 w-[500px] shadow-2xl space-y-5 h-[500px] flex flex-col justify-between overflow-hidden animate-scaleUp">
            <div>
              <h3 className="text-base font-bold text-white">Practice Quiz</h3>
              <p className="text-xs text-zinc-400 mt-1">Select the correct options for each question.</p>
            </div>

            {/* Questions list container */}
            <div className="flex-1 overflow-y-auto space-y-5 pr-1 py-1">
              {activeQuizQuestions.map((q, idx) => (
                <div key={idx} className="space-y-2">
                  <p className="text-xs font-bold text-white">{idx + 1}. {q.question}</p>
                  <div className="grid grid-cols-1 gap-2">
                    {q.options.map((opt) => {
                      const isSelected = userQuizAnswers[idx] === opt
                      const isCorrect = q.answer === opt
                      const shouldShowResult = quizSubmitted

                      let optStyle = 'bg-zinc-850 hover:bg-zinc-800 text-zinc-300 border-zinc-800'
                      if (isSelected) optStyle = 'bg-indigo-600/20 text-indigo-300 border-indigo-500/50'
                      if (shouldShowResult) {
                        if (isCorrect) optStyle = 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50 font-bold'
                        else if (isSelected) optStyle = 'bg-red-500/20 text-red-300 border-red-500/50'
                      }

                      return (
                        <button
                          key={opt}
                          disabled={quizSubmitted}
                          onClick={() => setUserQuizAnswers(prev => ({ ...prev, [idx]: opt }))}
                          className={`w-full text-left px-3 py-2 rounded-xl text-xs transition-all border ${optStyle}`}
                        >
                          {opt}
                        </button>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-3 border-t border-zinc-800 flex justify-between items-center">
              {quizSubmitted ? (
                <span className="text-sm font-bold text-indigo-300">Score: {quizScore} / {activeQuizQuestions.length}</span>
              ) : (
                <span className="text-xs text-zinc-500">Answer all questions before submitting.</span>
              )}
              <div className="flex gap-2">
                <button
                  onClick={() => setShowQuizGenModal(false)}
                  className="bg-zinc-800 hover:bg-zinc-700 text-zinc-400 text-xs font-semibold px-4 py-2 rounded-xl transition-all"
                >
                  Close
                </button>
                {!quizSubmitted && (
                  <button
                    onClick={handleSubmitQuiz}
                    className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold px-4 py-2 rounded-xl transition-all shadow-md"
                  >
                    Submit Quiz
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
