import { useState } from 'react'
import rec1 from '../assets/images/rec1.png'
import rec2 from '../assets/images/rec2.png'
import rec3 from '../assets/images/rec3.png'
import logo from '../assets/images/logo.png'
import board from '../assets/images/board.png'
import hat from '../assets/images/hat.png'
import puzzle from '../assets/images/puzzle.png'
import flag from '../assets/images/flag.png'
import sun from "../assets/images/sun.png"
import searchhat from "../assets/images/searchheart.png"
import sign from "../assets/images/sign.png"
import filecheck from "../assets/images/filecheck.png"
import bar from "../assets/images/bar.png"


import gsap from 'gsap'


// ─── Data ────────────────────────────────────────────────────────────────────

const AGE_RANGES = ['Under 13', '13–15', '16–18', '19–24', '25–34', '35–44', '45+']
const EDU_LEVELS = [
  'Primary school', 'Middle school', 'High school',
  'College / A-levels', 'Undergraduate', 'Postgraduate', 'Self-taught',
]

const SUBJECTS = [
  'Mathematics', 'Physics', 'Chemistry', 'Biology', 'Computer science',
  'History', 'Geography', 'Literature', 'Economics', 'Psychology',
  'Languages', 'Art & design', 'Music', 'Philosophy', 'Business',
]

const GOALS = [
  {
    id: 'exam',
    label: 'Pass an exam',
    desc: 'Prep for upcoming tests and score high.',
    image: filecheck
  },
  {
    id: 'work',
    label: 'Learn for work',
    desc: 'Build practical skills for my career.',
    image: bar
  },
  {
    id: 'curious',
    label: 'General curiosity',
    desc: 'Explore topics just because I enjoy it.',
    image: puzzle // ← replace
  },
  {
    id: 'teach',
    label: 'Teach others',
    desc: 'Deepen knowledge so I can explain it well.',
    image: board // ← replace
  },
]

const TOTAL_STEPS = 4

// ─── Progress bar ─────────────────────────────────────────────────────────────

function ProgressBar({ step }: { step: number }) {
  return (
    <div className="flex gap-1.5 w-full mb-8">
      {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
        <div
          key={i}
          className={[
            'h-1.5 flex-1 rounded-full transition-all duration-300',
            i < step  ? 'bg-[#534AB7]'        : '',
            i === step ? 'bg-[#534AB7] opacity-40' : '',
            i > step  ? 'bg-black/10 dark:bg-white/10' : '',
          ].join(' ')}
        />
      ))}
    </div>
  )
}

// ─── Shared wrapper ───────────────────────────────────────────────────────────

function StepShell({
  icon,
  title,
  subtitle,
  children,
}: {
  icon: string
  title: string
  subtitle: string
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col items-center text-center w-full">
      <img src={icon} className="pt-5"/>
      <h2 className="text-xl md:text-[2vw] font-medium text-white mb-1.5">{title}</h2>
      <p className="text-sm text-[var(--color-text-secondary)] mb-6">{subtitle}</p>
      {children}
    </div>
  )
}

// ─── Step 1 — Nickname ────────────────────────────────────────────────────────

function StepNickname({
  value,
  onChange,
}: {
  value: string
  onChange: (v: string) => void
}) {
  return (
    <StepShell
      icon= {logo}
      title="What should Deskie call you?"
      subtitle="Just a nickname"
    >
      <input
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder="e.g. Alex"
        className="
          w-full max-w-sm text-center text-base
          px-4 py-2.5 rounded-xl
          border border-black/15 dark:border-white/15
          bg-white dark:bg-white/5
          text-[var(--color-text-primary)]
          placeholder:text-[var(--color-text-secondary)]
          focus:outline-none focus:border-[#534AB7]
          transition-colors
        "
      />
    </StepShell>
  )
}

// ─── Step 2 — Age + level ─────────────────────────────────────────────────────

function StepAge({
  age,
  level,
  onAge,
  onLevel,
}: {
  age: string
  level: string
  onAge: (v: string) => void
  onLevel: (v: string) => void
}) {
  const selectCls = `
    flex-1 px-3 py-2.5 rounded-xl text-sm
    border border-black/15 dark:border-white/15
    bg-white dark:bg-white/5
    text-[var(--color-text-primary)]
    focus:outline-none focus:border-[#534AB7]
    transition-colors
  `
  return (
    <StepShell
      icon={hat}
      title="A little bit about you"
      subtitle="Helps Deskie pitch explanations at the right level."
    >
      <div className="flex gap-3 w-full max-w-sm">
        <select value={age} onChange={e => onAge(e.target.value)} className={selectCls}>
          <option value="" disabled>Age range…</option>
          {AGE_RANGES.map(a => <option key={a} value={a}>{a}</option>)}
        </select>
        <select value={level} onChange={e => onLevel(e.target.value)} className={selectCls}>
          <option value="" disabled>Education…</option>
          {EDU_LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
        </select>
      </div>
    </StepShell>
  )
}

// ─── Step 3 — Subjects (replaces Reason) ──────────────────────────────────────

function StepSubjects({
  selected,
  onToggle,
}: {
  selected: string[]
  onToggle: (s: string) => void
}) {
  return (
    <StepShell
      icon= {searchhat}
      title="What are you into?"
      subtitle="Pick as many as you like."
    >
      <div className="flex flex-wrap gap-2 justify-center w-full max-w-lg">
        {SUBJECTS.map(s => (
          <button
            key={s}
            type="button"
            onClick={() => onToggle(s)}
            className={[
              'px-4 py-2 rounded-full text-xs font-medium border-[1.5px] transition-all duration-150 cursor-pointer',
              selected.includes(s)
                ? 'border-[#534AB7] bg-[#EEEDFE] text-[#3C3489] dark:bg-[#534AB7]/20 dark:text-[#CECBF6]'
                : 'border-black/10 dark:border-white/10 bg-white dark:bg-white/5 text-[var(--color-text-secondary)] hover:border-[#AFA9EC]',
            ].join(' ')}
          >
            {s}
          </button>
        ))}
      </div>
    </StepShell>
  )
}

// ─── Step 4 — Goal ────────────────────────────────────────────────────────────

function StepGoal({
  selected,
  onSelect,
}: {
  selected: string
  onSelect: (id: string) => void
}) {
  return (
    <StepShell
  icon={sign}
  title="What's your primary goal?"
  subtitle="Choose what matters most right now."
>
  <div className="grid grid-cols-2 gap-2.5 w-full">
    {GOALS.map(g => (
      <button
        key={g.id}
        type="button"
        onClick={() => onSelect(g.id)}
        className={[
          'flex items-center gap-3 px-4 py-3 rounded-xl text-left',
          'border-[1.5px] transition-all duration-150 cursor-pointer w-full',
          selected === g.id
            ? 'border-[#534AB7] bg-[#EEEDFE] dark:bg-[#534AB7]/20'
            : 'border-black/10 dark:border-white/10 bg-white dark:bg-white/5 hover:border-[#AFA9EC]',
        ].join(' ')}
      >
        {/* Image container */}
        <div
          className={[
            'flex items-center justify-center w-10 h-10 rounded-full flex-shrink-0 overflow-hidden',
            selected === g.id
              ? 'bg-[#CECBF6] dark:bg-[#534AB7]/40'
              : 'bg-black/5 dark:bg-white/10',
          ].join(' ')}
        >
          <img src={g.image} alt={g.label} className="" />
        </div>
        <div>
          <p
            className={[
              'text-sm font-medium',
              selected === g.id
                ? 'text-[#3C3489] dark:text-[#CECBF6]'
                : 'text-[var(--color-text-primary)]',
            ].join(' ')}
          >
            {g.label}
          </p>
          <p className="text-xs text-[var(--color-text-secondary)] mt-0.5">{g.desc}</p>
        </div>
      </button>
    ))}
  </div>
</StepShell>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function Onboard() {
  const [step,     setStep]     = useState(0)
  const [nickname, setNickname] = useState('')
  const [age,      setAge]      = useState('')
  const [level,    setLevel]    = useState('')
  const [subjects, setSubjects] = useState<string[]>([])
  const [goal,     setGoal]     = useState('')

  const toggleSubject = (s: string) =>
    setSubjects(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s])

  const canContinue: boolean = [
    nickname.trim() !== '',
    age !== '' && level !== '',
    subjects.length > 0,
    goal !== '',
  ][step] ?? false

  const handleContinue = () => {
    if (step < TOTAL_STEPS - 1) {
      setStep(s => s + 1)
    } else {
      // Final step — persist and navigate
      console.log({ nickname, age, level, subjects, goal })
      // e.g. navigate('/home') or write to electron-store
    }
  }

  return (
    <section className="h-screen overflow-hidden bg-transparent flex flex-col items-center justify-center px-4">

      {/* Decorative background images */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-20">
        <img src={rec1} alt="" className="absolute -top-10 -left-10 w-48 rotate-[-20deg]" />
        <img src={rec2} alt="" className="absolute top-1/3 -right-8 w-32 rotate-[15deg]" />
        <img src={rec3} alt="" className="absolute -bottom-8 left-1/3 w-40 rotate-[10deg]" />
      </div>

      {/* Card — wider on desktop */}
      <div className="relative z-10 w-full max-w-2xl bg-white/80 dark:bg-white/5 backdrop-blur-sm rounded-3xl p-8 shadow-sm border border-black/8 dark:border-white/8">

        <ProgressBar step={step} />

        {/* Step content */}
        <div className="min-h-[300px] flex flex-col">
          {step === 0 && (
            <StepNickname value={nickname} onChange={setNickname} />
          )}
          {step === 1 && (
            <StepAge age={age} level={level} onAge={setAge} onLevel={setLevel} />
          )}
          {step === 2 && (
            <StepSubjects selected={subjects} onToggle={toggleSubject} />
          )}
          {step === 3 && (
            <StepGoal selected={goal} onSelect={setGoal} />
          )}
        </div>

        {/* Footer */}
        <div className="mt-7 flex flex-col gap-2">
          <button
            type="button"
            onClick={handleContinue}
            disabled={!canContinue}
            className="
              lg:w-144 w-64 py-3.5 rounded-full text-sm font-medium
              backdrop-blur-sm text-white
              hover:bg-purple active:scale-[0.98]
              disabled:opacity-30 disabled:cursor-not-allowed
              transition-all duration-150
            "
          >
            {step === TOTAL_STEPS - 1 ? 'Get started →' : 'Continue'}
          </button>

          {step > 0 && (
            <button
              type="button"
              onClick={() => setStep(s => s - 1)}
              className="text-xs text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors py-1"
            >
              ← Back
            </button>
          )}
        </div>
      </div>
    </section>
  )
}