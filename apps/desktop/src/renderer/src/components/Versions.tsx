type RuntimeVersions = {
  electron?: string
  chrome?: string
  node?: string
}

// The preload script currently exposes only `qvacAPI`; tolerate a bridge that
// also publishes process versions without pretending those values are present.
type ElectronWindow = Window & {
  electron?: { process?: { versions?: RuntimeVersions } }
}

const ROWS: Array<{ label: string; key: keyof RuntimeVersions }> = [
  { label: 'Electron', key: 'electron' },
  { label: 'Chromium', key: 'chrome' },
  { label: 'Node', key: 'node' }
]

/** Reports the runtime versions available to the renderer, if any. */
export default function Versions(): React.JSX.Element {
  const versions = (window as ElectronWindow).electron?.process?.versions

  return (
    <section className="rounded-2xl border border-[#2F293A] bg-[#120F17] p-5 text-zinc-200">
      <h2 className="text-sm font-semibold text-white">Runtime versions</h2>
      <dl className="mt-4 space-y-2 text-sm">
        {ROWS.map(({ label, key }) => (
          <div key={key} className="flex justify-between gap-4">
            <dt className="text-zinc-400">{label}</dt>
            <dd className="font-mono text-zinc-200">{versions?.[key] ?? 'Not exposed'}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-4 text-xs leading-relaxed text-zinc-500">
        Version details are shown only when the preload bridge publishes them. The renderer runs
        with Node integration disabled and has no direct access to process information.
      </p>
    </section>
  )
}
