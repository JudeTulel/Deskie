import { useEffect, useRef, useState } from 'react'
import { gsap } from 'gsap'
import { ChatComponent } from './ChatComponent'
import rec1 from "../assets/images/rec1.png"
import rec2 from "../assets/images/rec2.png"
import rec3 from "../assets/images/rec3.png"

export function Hero() {
  const [chatOpen, setChatOpen] = useState(false)
  const [isAnimating, setIsAnimating] = useState(false)
  const tlRef = useRef<gsap.core.Timeline | null>(null)
  const enterEndTimeRef = useRef(0)
  const panelRef = useRef<HTMLDivElement>(null)
  const overlayRef = useRef<HTMLDivElement>(null)
  const chatWrapRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    init()
    return () => { tlRef.current?.revert() }
  }, [])

  function init() {
    tlRef.current?.revert()

    gsap.set(panelRef.current, { visibility: 'hidden', pointerEvents: 'none' })
    gsap.set(overlayRef.current, { opacity: 0 })
    gsap.set(chatWrapRef.current, { opacity: 0, y: 8 })

    const tl = gsap
      .timeline({ paused: true })

      .set(panelRef.current, { visibility: 'visible', pointerEvents: 'auto' })

      // Enter — overlay fades in
      .to(overlayRef.current, {
        opacity: 1,
        duration: 0.35,
        ease: 'power2.out',
        easeReverse: 'power4.out',
      }, 0)

      // Chat panel slides in from right
      .fromTo(
        panelRef.current,
        { x: '100%', rotation: 0 },
        {
          x: '0%',
          duration: 0.55,
          ease: 'back.out(1.3)',
          easeReverse: 'power3.in',
        },
        0
      )

      // Chat content fades in
      .to(chatWrapRef.current, {
        opacity: 1,
        y: 0,
        duration: 0.3,
        ease: 'power3.out',
        easeReverse: 'power4.out',
      }, 0.3)

      .addPause()

    enterEndTimeRef.current = tl.duration()

    // Exit — panel slides out to right
    tl
      .to(chatWrapRef.current, {
        opacity: 0,
        duration: 0.15,
        ease: 'power2.in',
      })
      .to(
        panelRef.current,
        {
          x: '100%',
          rotation: gsap.utils.random(-6, 6),
          duration: 0.5,
          ease: 'power3.in',
        },
        '<'
      )
      .to(
        overlayRef.current,
        { opacity: 0, duration: 0.25, ease: 'power2.in' },
        '<0.05'
      )
      .set(panelRef.current, { visibility: 'hidden', pointerEvents: 'none' })

    tlRef.current = tl
  }

  function toggle() {
    const tl = tlRef.current
    if (!tl) return

    const next = !chatOpen
    setChatOpen(next)

    if (next) {
      if (tl.time() >= enterEndTimeRef.current) {
        tl.timeScale(1).restart()
      } else {
        tl.timeScale(1).play()
      }
    } else {
      if (tl.time() < enterEndTimeRef.current) {
        tl.timeScale(1.5).reverse()
      } else {
        tl.timeScale(1).play()
      }
    }
  }

  // Close on overlay click / Escape key
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && chatOpen) toggle()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [chatOpen])

  return (
    <section id="hero" className="relative z-10 min-h-dvh w-full">
      {/* Centered container */}
      <div className="flex flex-col items-center justify-center min-h-dvh w-full px-5 sm:px-10">
        
        {/* Hero content - centered */}
        <div className="flex flex-col items-center justify-center text-center w-full max-w-4xl mx-auto">
          <div className="flex flex-col items-center gap-6 px-6 text-center select-none">
            <div className="flex items-center gap-2 text-xs font-mono text-zinc-500 tracking-widest uppercase">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Local AI · Always Private
            </div>
<div className="flex flex-row items-center gap-4 ">
  <img src={rec1} />
  <img src={rec2} />
  <img src={rec3} />

</div>
            <h1 className="text-5xl sm:text-6xl font-semibold tracking-tight leading-none text-center">
              Your desk,<br />
              <span className="text-zinc-500">smarter.</span>
            </h1>

            <p className="max-w-md text-zinc-400 text-sm leading-relaxed text-center mx-auto">
              Deskmate runs entirely on your device — no cloud, no data sent anywhere.
              Ask anything and get answers in real time.
            </p>

            {/* Toggle button — hamburger morphs to X */}
            <button
              onClick={toggle}
              aria-expanded={chatOpen}
              aria-label={chatOpen ? 'Close Deskmate' : 'Open Deskmate'}
              className="mt-2 flex items-center gap-3 px-5 py-2.5 rounded-full bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 transition-colors text-sm font-medium mx-auto"
            >
              {/* Animated SVG icon matching the GSAP example */}
              <svg width="18" height="18" viewBox="0 0 20 20" fill="none" className="flex-shrink-0">
                <line
                  className={`bar bar-top transition-all duration-200 ${chatOpen ? 'stroke-zinc-100' : 'stroke-zinc-100'}`}
                  x1={chatOpen ? 5 : 3} y1={chatOpen ? 5 : 7}
                  x2={chatOpen ? 15 : 17} y2={chatOpen ? 15 : 7}
                  strokeWidth="1.5" strokeLinecap="round"
                />
                {!chatOpen && (
                  <line
                    x1="3" y1="10" x2="17" y2="10"
                    stroke="var(--color-zinc-100, #f4f4f5)"
                    strokeWidth="1.5" strokeLinecap="round"
                  />
                )}
                <line
                  x1={chatOpen ? 15 : 3} y1={chatOpen ? 5 : 13}
                  x2={chatOpen ? 5 : 17} y2={chatOpen ? 15 : 13}
                  stroke="var(--color-zinc-100, #f4f4f5)"
                  strokeWidth="1.5" strokeLinecap="round"
                  className="transition-all duration-200"
                />
              </svg>
              {chatOpen ? 'Close' : 'Ask Deskmate'}
            </button>
          </div>
        </div>

        {/* ── Backdrop overlay ── */}
        <div
          ref={overlayRef}
          onClick={() => chatOpen && toggle()}
          className="fixed inset-0 backdrop-blur-sm z-10 cursor-pointer"
          style={{ pointerEvents: chatOpen ? 'auto' : 'none' }}
        />

        {/* ── Chat panel (slides in from right) ── */}
        <div
          ref={panelRef}
          className="fixed top-0 right-0 bottom-0 z-20 w-full max-w-md shadow-2xl"
          style={{ visibility: 'hidden' }}
        >
          <div
            ref={chatWrapRef}
            className="h-full rounded-l-2xl overflow-hidden border border-zinc-700 shadow-2xl bg-zinc-900"
          >
            <ChatComponent
              className="w-full h-full"
              maxHeight="100%"
              onMessageSent={(msg) => console.log('User sent:', msg)}
            />
          </div>

          {/* Keyboard hint */}
          <p className="absolute bottom-4 left-0 right-0 text-center text-zinc-600 text-xs font-mono pointer-events-none">
            esc to close
          </p>
        </div>
      </div>
    </section>
  )
}