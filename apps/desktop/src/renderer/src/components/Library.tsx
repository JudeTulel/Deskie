/** Standalone Library summary; the routed library screen is LibraryView. */
export default function Library(): React.JSX.Element {
  return (
    <div className="min-h-screen p-8 pl-36">
      <div className="mx-auto max-w-3xl">
        <h1 className="text-3xl font-bold text-white">Library</h1>
        <p className="mt-3 text-sm leading-relaxed text-zinc-400">
          Ingested files are grouped by subject and indexed into that subject's vector workspace so
          their text can be retrieved and cited in AI chat.
        </p>

        <div className="mt-8 rounded-2xl border border-[#2F293A] bg-[#120F17] p-6">
          <h2 className="text-sm font-semibold text-white">Add your first document</h2>
          <p className="mt-2 text-sm leading-relaxed text-zinc-400">
            Use Ingestion to add a PDF, DOCX, text file, image or audio recording. Extracted text is
            split into chunks and stored locally along with its subject.
          </p>
          <a
            href="#/ingestion"
            className="mt-5 inline-flex rounded-lg border border-[#2F293A] px-4 py-2 text-sm font-medium text-zinc-200 transition-colors hover:border-indigo-500/60 hover:text-white"
          >
            Open Ingestion
          </a>
        </div>
      </div>
    </div>
  )
}
