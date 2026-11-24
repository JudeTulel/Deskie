// Destinations below match routes registered in App.tsx (HashRouter).
const DESTINATIONS = [
  { label: 'Dashboard', href: '#/dash', description: 'Recent study activity.' },
  { label: 'Library', href: '#/library', description: 'Subjects and ingested documents.' },
  { label: 'Ingestion', href: '#/ingestion', description: 'Add documents, images or audio.' },
  { label: 'AI chat', href: '#/ai-chat', description: 'Ask questions with citations from your notes.' },
  { label: 'Flashcards', href: '#/flashcards', description: 'Build and review study cards.' },
  { label: 'Settings', href: '#/settings', description: 'Manage local models and downloads.' }
]

/** Compact starting point that points at the app's real sections. */
export default function Desk(): React.JSX.Element {
  return (
    <div className="min-h-screen p-8 pl-36">
      <div className="mx-auto max-w-5xl">
        <h1 className="pb-8 text-3xl font-bold text-white">Desk</h1>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {DESTINATIONS.map(({ label, href, description }) => (
            <a
              key={href}
              href={href}
              className="flex min-h-[160px] flex-col justify-between rounded-2xl border border-[#2F293A] bg-[#120F17] p-5 transition-colors hover:border-indigo-500/60"
            >
              <span className="text-sm font-medium text-zinc-500">{label}</span>
              <span>
                <span className="mb-1 block text-lg font-semibold text-white">{label}</span>
                <span className="block text-sm text-zinc-400">{description}</span>
              </span>
            </a>
          ))}
        </div>
      </div>
    </div>
  )
}
