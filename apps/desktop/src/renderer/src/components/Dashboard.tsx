import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useUserStore } from '../stores/userStore'
import { useStudyStore } from '../stores/studyStore'
import { useModelStore } from '../stores/modelStore'
import { useChatStore } from '../stores/chatStore'

export default function Dashboard() {
  const navigate = useNavigate()
  const { userDetails } = useUserStore()
  const { subjects, documents, flashcards, quizzes, activities, loadAll } = useStudyStore()
  const { activeModel } = useModelStore()
  const { chats, loadChats } = useChatStore()
  const [chatOpen, setChatOpen] = useState(false)

  useEffect(() => {
    loadAll()
    loadChats()
  }, [])

  const nickname = userDetails?.nickname || 'Student'
  const todayStr = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })

  // Calculate stats
  const dueCardsCount = flashcards.filter(f => f.dueDate <= Date.now()).length
  const totalCompletedQuizzes = quizzes.length
  
  // Today's Focus Actions
  const focusActions = [
    {
      id: 'focus-1',
      title: dueCardsCount > 0 ? `Review ${dueCardsCount} due flashcards` : 'Generate new flashcards',
      description: dueCardsCount > 0 ? 'Maintain your daily spaced repetition streak' : 'Generate flashcards from your ingested documents',
      action: () => dueCardsCount > 0 ? navigate('/review') : navigate('/flashcards'),
      badge: dueCardsCount > 0 ? 'High Priority' : 'Daily Goal'
    },
    {
      id: 'focus-2',
      title: 'Practice with a Quick Quiz',
      description: 'Strengthen active recall with a 10-question AI quiz',
      action: () => navigate('/deep-dive'),
      badge: 'Active Recall'
    },
    {
      id: 'focus-3',
      title: 'Capture Lecture Notes',
      description: 'Record live audio or transcribe a recent lecture recording',
      action: () => navigate('/transcription'),
      badge: 'New Content'
    }
  ]

  return (
    <div className="min-h-screen text-slate-100 p-8 pl-28 pr-8 relative pb-24 select-none">
      {/* Top Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Daily Command Centre</span>
          <h1 className="text-4xl font-bold text-white mt-1">
            Welcome back, <span className="bg-gradient-to-r from-violet-400 to-indigo-300 bg-clip-text text-transparent">{nickname}</span>
          </h1>
          <p className="text-sm text-zinc-400 mt-0.5">{todayStr}</p>
        </div>

        {/* Streak Badge */}
        <div className="flex items-center gap-3 bg-zinc-800/40 border border-zinc-700/50 rounded-2xl px-4 py-2.5 backdrop-blur-md shadow-lg hover:border-violet-500/40 transition-colors group">
          <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center border border-orange-500/30 group-hover:scale-110 transition-transform">
            <svg className="w-6 h-6 text-orange-400 animate-pulse" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
            </svg>
          </div>
          <div>
            <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Current Streak</div>
            <div className="text-base font-bold text-white">5 Days Active</div>
          </div>
        </div>
      </div>

      {/* Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Today's Focus & Due Today */}
        <div className="lg:col-span-2 space-y-6">
          {/* Today's Focus Card */}
          <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-3xl p-6 backdrop-blur-xl shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <span className="text-lg">🎯</span> Today's Focus
              </h2>
              <span className="text-xs font-medium bg-indigo-500/15 text-indigo-300 border border-indigo-500/20 px-2.5 py-1 rounded-full">
                AI Recommendations
              </span>
            </div>

            <div className="space-y-4">
              {focusActions.map((act) => (
                <div 
                  key={act.id} 
                  onClick={act.action}
                  className="bg-zinc-800/30 hover:bg-zinc-800/60 border border-zinc-800 hover:border-zinc-700/80 rounded-2xl p-4 cursor-pointer transition-all flex items-center justify-between group"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-white group-hover:text-indigo-300 transition-colors">
                        {act.title}
                      </span>
                      <span className="text-[9px] font-bold uppercase tracking-wider bg-zinc-700/40 px-2 py-0.5 rounded text-zinc-400">
                        {act.badge}
                      </span>
                    </div>
                    <p className="text-xs text-zinc-400">{act.description}</p>
                  </div>
                  <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center group-hover:bg-indigo-600 transition-colors">
                    <svg className="w-4 h-4 text-zinc-400 group-hover:text-white transition-colors" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Subject Progress Rings */}
          <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-3xl p-6 backdrop-blur-xl shadow-xl">
            <h2 className="text-lg font-bold text-white flex items-center gap-2 mb-6">
              <span className="text-lg">📊</span> Subject Progress
            </h2>

            {subjects.length === 0 ? (
              <div className="text-center py-8 text-zinc-500 text-sm">
                No subjects created yet. Go to Library to add some.
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
                {subjects.map((sub) => {
                  const subDocs = documents.filter(d => d.subjectId === sub.id)
                  const subCards = flashcards.filter(f => f.subjectId === sub.id)
                  
                  // Compute simple progress representation
                  const progressPct = subCards.length > 0 ? Math.min(100, Math.round((subCards.filter(f => f.interval > 3).length / subCards.length) * 100)) : 50
                  const strokeDashoffset = 125.6 - (125.6 * progressPct) / 100

                  return (
                    <div 
                      key={sub.id}
                      onClick={() => navigate('/library')}
                      className="bg-zinc-800/20 border border-zinc-800 hover:border-zinc-700/60 rounded-2xl p-4 flex flex-col items-center cursor-pointer transition-all hover:-translate-y-1"
                    >
                      {/* SVG Donut */}
                      <div className="relative w-16 h-16 flex items-center justify-center mb-3">
                        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 48 48">
                          <circle cx="24" cy="24" r="20" fill="transparent" stroke="#27272a" strokeWidth="4" />
                          <circle 
                            cx="24" cy="24" r="20" 
                            fill="transparent" 
                            stroke={sub.color || '#9E97FF'} 
                            strokeWidth="4" 
                            strokeDasharray="125.6"
                            strokeDashoffset={strokeDashoffset}
                            strokeLinecap="round"
                          />
                        </svg>
                        <span className="absolute text-base">{sub.emoji || '📚'}</span>
                      </div>

                      <span className="text-xs font-bold text-white truncate max-w-full text-center">{sub.name}</span>
                      <span className="text-[10px] text-zinc-400 mt-1">{subDocs.length} docs • {subCards.length} cards</span>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Due Today & Recent Activities */}
        <div className="space-y-6">
          {/* Due Today Panel */}
          <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-3xl p-6 backdrop-blur-xl shadow-xl">
            <h2 className="text-lg font-bold text-white flex items-center gap-2 mb-4">
              <span className="text-lg">📅</span> Due Today
            </h2>

            <div className="bg-zinc-800/40 rounded-2xl p-4 border border-zinc-800/60 flex items-center justify-between mb-4">
              <div>
                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Flashcards Due</span>
                <div className="text-2xl font-black text-white mt-0.5">{dueCardsCount}</div>
              </div>
              {dueCardsCount > 0 ? (
                <button 
                  onClick={() => navigate('/review')}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold px-4 py-2 rounded-xl transition-all shadow-md active:scale-95"
                >
                  Review Now
                </button>
              ) : (
                <span className="text-xs text-emerald-400 font-medium flex items-center gap-1">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg>
                  All Clean
                </span>
              )}
            </div>

            <div className="bg-zinc-800/20 border border-zinc-800 rounded-2xl p-4 space-y-2">
              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">Recommended Quizzes</span>
              {subjects.length > 0 ? (
                <div className="space-y-2">
                  {subjects.slice(0, 2).map((sub) => (
                    <div key={sub.id} className="flex justify-between items-center bg-zinc-800/30 p-2.5 rounded-xl border border-zinc-800/40">
                      <span className="text-xs font-medium text-white">{sub.emoji} {sub.name} Quiz</span>
                      <button 
                        onClick={() => navigate('/deep-dive')}
                        className="text-[10px] font-bold text-indigo-400 hover:text-indigo-300 transition-colors"
                      >
                        Start →
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <span className="text-xs text-zinc-500">Create a subject to unlock recommended quizzes.</span>
              )}
            </div>
          </div>

          {/* Recent Activity Feed */}
          <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-3xl p-6 backdrop-blur-xl shadow-xl flex flex-col min-h-[300px]">
            <h2 className="text-lg font-bold text-white flex items-center gap-2 mb-4">
              <span className="text-lg">⏱️</span> Recent Activity
            </h2>

            <div className="space-y-4 flex-1 overflow-y-auto max-h-[260px] pr-1">
              {activities.length === 0 ? (
                <div className="h-full flex items-center justify-center text-center py-12 text-zinc-500 text-xs font-mono">
                  No activity logged yet.
                </div>
              ) : (
                activities.slice(0, 5).map((act) => (
                  <div key={act.id} className="flex gap-3 text-xs border-l-2 border-zinc-800 pl-4 py-1 relative">
                    <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 absolute -left-[4px] top-2" />
                    <div className="flex-1">
                      <p className="text-zinc-200 font-medium">{act.action}</p>
                      <span className="text-[9px] text-zinc-500 block mt-1">
                        {new Date(act.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* System Status Bar */}
      <div className="fixed bottom-0 left-20 right-0 h-10 bg-zinc-950/70 border-t border-zinc-900 px-6 flex items-center justify-between text-[11px] text-zinc-400 backdrop-blur-md z-45">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5 font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Model: {activeModel?.name || 'Llama 3.2 GGUF'}
          </span>
          <span className="text-zinc-600">|</span>
          <span>Inference: ~42 tokens/sec</span>
          <span className="text-zinc-600">|</span>
          <span>VRAM: 1.2GB/8GB</span>
        </div>
        <div>
          <span>QVAC SDK v0.13.0 • Local DB connected</span>
        </div>
      </div>

      {/* Floating Quick-capture Button */}
      <button 
        onClick={() => navigate('/transcription')}
        title="Floating Quick Capture"
        className="fixed bottom-14 right-8 w-14 h-14 bg-gradient-to-tr from-violet-600 to-indigo-500 hover:from-violet-500 hover:to-indigo-400 text-white rounded-full flex items-center justify-center shadow-xl hover:scale-110 active:scale-95 transition-all z-40 border border-violet-400/30 group"
      >
        <svg className="w-6 h-6 text-white group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />
        </svg>
      </button>
    </div>
  )
}
