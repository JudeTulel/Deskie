// Version constant mirrors apps/desktop/package.json.
const APP_VERSION = '1.0.0'

/** Small About panel describing what is actually implemented in this app. */
export default function About(): React.JSX.Element {
  return (
    <section className="min-h-screen p-8 pl-36 text-zinc-200">
      <div className="max-w-3xl">
        <h1 className="text-3xl font-bold text-white">About Deskie</h1>
        <p className="mt-3 text-sm leading-relaxed text-zinc-400">
          Deskie is a local-first study workspace. Notes, documents, scanned slides and lecture
          recordings become searchable notes, flashcards, quizzes and an AI assistant that can
          answer questions from your own material.
        </p>

        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-[#2F293A] bg-[#120F17] p-5">
            <h2 className="text-sm font-semibold text-white">Local AI</h2>
            <p className="mt-2 text-sm leading-relaxed text-zinc-400">
              Models run on this machine through the QVAC SDK: GGUF text generation with llama.cpp,
              Gemma embeddings, ONNX OCR and Whisper transcription.
            </p>
          </div>
          <div className="rounded-2xl border border-[#2F293A] bg-[#120F17] p-5">
            <h2 className="text-sm font-semibold text-white">Study tools</h2>
            <p className="mt-2 text-sm leading-relaxed text-zinc-400">
              Ingest material into per-subject workspaces, ask questions with source citations, and
              review flashcards and quizzes. Your library and chat history stay on disk in SQLite.
            </p>
          </div>
        </div>

        <dl className="mt-8 space-y-2 text-sm">
          <div className="flex justify-between gap-6">
            <dt className="text-zinc-500">Version</dt>
            <dd className="font-mono text-zinc-300">{APP_VERSION}</dd>
          </div>
          <div className="flex justify-between gap-6">
            <dt className="text-zinc-500">Stack</dt>
            <dd className="text-zinc-300">Electron, React, TypeScript, Tailwind CSS</dd>
          </div>
        </dl>
      </div>
    </section>
  )
}
