import { useRef, useState, useEffect } from 'react'
import { ScrollTrigger, ScrambleTextPlugin } from 'gsap/all'
import { Hero } from './components/Hero'
import gsap from 'gsap'
import '../src/assets/main.css'
import Leftbar from './components/Leftbar'
import { BrowserRouter as Router, Routes, Route,Navigate } from 'react-router-dom'
import Desk from './components/Desk'
import Library from './components/Library'
import Settings from './components/Settings'
import SoftAurora from './components/SoftAurora'
import { ChatComponent } from './components/ChatComponent'
import Onboard from './components/Onboard'

gsap.registerPlugin(ScrollTrigger,ScrambleTextPlugin)

function App(): React.JSX.Element {
  const [chatOpen, setChatOpen] = useState(false)

  const isknown = false // TODO: replace with actual check for known user (e.g. from electron-store or localStorage);
  // Show onboarding when user is not known
  if (!isknown) return <Onboard />

  return (
    <Router>
      <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', zIndex: 0 }}>
        <SoftAurora
          speed={0.3} scale={1.5} brightness={1}
          color1="#9E97FF" color2="#0f2c5c"
          noiseFrequency={1} noiseAmplitude={1}
          bandHeight={0.5} bandSpread={1}
          octaveDecay={0.1} layerOffset={0}
          colorSpeed={0.3} enableMouseInteraction mouseInfluence={0.25}
        />
      </div>

      <Leftbar  />

      <Routes>
        <Route path="/" element={<Hero />} />
        <Route path="/library" element={<Library />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/desk" element={<Desk />} />
      </Routes>

      {/* ── Persistent chat panel — always mounted, never reloads the model ── */}
      <PersistentChat chatOpen={chatOpen} setChatOpen={setChatOpen} />
    </Router>
  )
}

function PersistentChat({
  chatOpen,
  setChatOpen,
}: {
  chatOpen: boolean
  setChatOpen: (v: boolean) => void
}) {
  const panelRef = useRef<HTMLDivElement>(null)
  const overlayRef = useRef<HTMLDivElement>(null)
  const chatWrapRef = useRef<HTMLDivElement>(null)
  const tlRef = useRef<gsap.core.Timeline | null>(null)
  const enterEndTimeRef = useRef(0)

  useEffect(() => {
    gsap.set(panelRef.current, { visibility: 'hidden', pointerEvents: 'none' })
    gsap.set(overlayRef.current, { opacity: 0 })
    gsap.set(chatWrapRef.current, { opacity: 0, y: 8 })

    const tl = gsap.timeline({ paused: true })
      .set(panelRef.current, { visibility: 'visible', pointerEvents: 'auto' })
      .to(overlayRef.current, { opacity: 1, duration: 0.35, ease: 'power2.out' }, 0)
      .fromTo(panelRef.current,
        { x: '100%' },
        { x: '0%', duration: 0.55, ease: 'back.out(1.3)' }, 0)
      .to(chatWrapRef.current, { opacity: 1, y: 0, duration: 0.3, ease: 'power3.out' }, 0.3)
      .addPause()

    enterEndTimeRef.current = tl.duration()

    tl
      .to(chatWrapRef.current, { opacity: 0, duration: 0.15, ease: 'power2.in' })
      .to(panelRef.current, { x: '100%', duration: 0.5, ease: 'power3.in' }, '<')
      .to(overlayRef.current, { opacity: 0, duration: 0.25, ease: 'power2.in' }, '<0.05')
      .set(panelRef.current, { visibility: 'hidden', pointerEvents: 'none' })

    tlRef.current = tl
    return () => { tl.revert() }
  }, [])

  function toggle(next: boolean) {
    const tl = tlRef.current
    if (!tl) return
    setChatOpen(next)
    if (next) {
      tl.time() >= enterEndTimeRef.current ? tl.timeScale(1).restart() : tl.timeScale(1).play()
    } else {
      tl.time() < enterEndTimeRef.current ? tl.timeScale(1.5).reverse() : tl.timeScale(1).play()
    }
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && chatOpen) toggle(false) }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [chatOpen])

  return (
    <>
      {/* Floating trigger button — visible on all pages */}
      <button
        onClick={() => toggle(!chatOpen)}
        aria-label={chatOpen ? 'Close Deskmate' : 'Open Deskmate'}
        className="fixed top-8 right-60 z-50 flex items-center gap-2 px-4 py-2.5 rounded-full bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 transition-colors text-sm font-medium shadow-lg"
      >
        <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
          <line
            x1={chatOpen ? 5 : 3} y1={chatOpen ? 5 : 7}
            x2={chatOpen ? 15 : 17} y2={chatOpen ? 15 : 7}
            stroke="#f4f4f5" strokeWidth="1.5" strokeLinecap="round"
            className="transition-all duration-200"
          />
          {!chatOpen && (
            <line x1="3" y1="10" x2="17" y2="10"
              stroke="#f4f4f5" strokeWidth="1.5" strokeLinecap="round" />
          )}
          <line
            x1={chatOpen ? 15 : 3} y1={chatOpen ? 5 : 13}
            x2={chatOpen ? 5 : 17} y2={chatOpen ? 15 : 13}
            stroke="#f4f4f5" strokeWidth="1.5" strokeLinecap="round"
            className="transition-all duration-200"
          />
        </svg>
        {chatOpen ? '' : 'Ask Deskmate'}
      </button>

      {/* Backdrop */}
      <div
        ref={overlayRef}
        onClick={() => chatOpen && toggle(false)}
        className="fixed inset-0 backdrop-blur-sm z-30 cursor-pointer"
        style={{ pointerEvents: chatOpen ? 'auto' : 'none' }}
      />

      {/* Chat panel — always in the DOM, model stays loaded */}
      <div
        ref={panelRef}
        className="fixed top-0 right-0 bottom-0 z-40 w-full max-w-md shadow-2xl"
        style={{ visibility: 'hidden' }}
      >
        <div
          ref={chatWrapRef}
          className="h-full rounded-l-2xl overflow-hidden border border-zinc-700 shadow-2xl bg-zinc-900"
        >
          <ChatComponent className="w-full h-full" maxHeight="100%" />
        </div>
        <p className="absolute bottom-4 left-0 right-0 text-center text-zinc-600 text-xs font-mono pointer-events-none">
          esc to close
        </p>
      </div>
    </>
  )
}

export default App