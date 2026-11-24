# Deskie

Deskie is a local-first study workspace. It turns the material you already have — lecture recordings, PDFs, scanned slides, notes — into searchable text, an AI tutor that answers from your own documents, flashcards and quizzes. Text generation, embeddings, OCR and transcription all run on your machine through [`@qvac/sdk`](https://www.npmjs.com/package/@qvac/sdk); your library, subjects, chats and study activity are stored in a local SQLite database.

Model weights are downloaded from Hugging Face on first use and cached locally. Inference itself does not call a hosted AI API.

## Apps in this repository

| App | Path | State |
| --- | --- | --- |
| Desktop | `apps/desktop` | The main application: Electron + React 19 + TypeScript + Tailwind CSS v4, built with electron-vite. |
| Mobile | `apps/mobile/deskie` | A separate Expo / React Native app, currently in progress (still the default Expo scaffold). |

The desktop app is the full authoring toolkit: ingest documents, review a library of sources, run RAG-backed AI chat with citations, generate and review flashcards/quizzes, and manage local models. The Expo app is intended as the pocket companion for capturing and reviewing material on the go.

## Architecture (desktop)

```
React renderer  ──window.qvacAPI──▶  preload (contextBridge)
                                          │ ipcRenderer.invoke / ipcMain.handle
                                          ▼
                                   Electron main process
                                     ├─ @qvac/sdk plugins (local models)
                                     └─ node:sqlite (deskie.sqlite)
```

### Process model and IPC

- `apps/desktop/src/main/index.ts` creates the `BrowserWindow` with `contextIsolation: true` and `nodeIntegration: false`, owns model state, registers the `ipcMain.handle` callbacks, and is the only place that calls `@qvac/sdk` and the database.
- `apps/desktop/src/preload/index.ts` exposes exactly one bridge, `window.qvacAPI`, through `contextBridge.exposeInMainWorld`. Its TypeScript shape is declared in `src/preload/index.d.ts`.
- The renderer never gets Node access. It calls typed bridge methods (for example `ragIngest`, `ragSearch`, `infer`, `runOCR`, `transcribeAudio`, `downloadModel`) that map to IPC channels such as `rag-ingest`, `rag-search`, `infer`, `run-ocr`, `transcribe-audio` and `download-model`. CRUD channels cover models, subjects, documents, chats, flashcards, quizzes and activities. Streaming tokens are pushed back with the `completion-stream` event; download progress uses `download-progress`.

### Local AI stack

`apps/desktop/qvac.config.json` enables four QVAC plugins:

- `llamacpp-completion` — GGUF instruction models run locally through llama.cpp (the seeded default is Llama 3.2 1B Instruct Q4_0 from Hugging Face).
- `llamacpp-embedding` — Gemma 300M Q4 (`EMBEDDINGGEMMA_300M_Q4_0`) embeddings used for RAG ingest and search.
- `onnx-ocr` — ONNX OCR (`OCR_LATIN_RECOGNIZER_1`) extracts text from images so scanned slides can be indexed.
- `whispercpp-transcription` — Whisper via whisper.cpp (default asset `ggml-tiny.bin`) for lecture audio.

Models are loaded on demand, streamed during completion, and unloaded when no longer needed; the main process reuses in-flight loads and `src/main/model-store.ts` manages the saved model records and the active model. Downloads support progress reporting and cancellation.

### RAG with citations

- Each subject maps to its own vector workspace: the subject id is used as the workspace name, with `default-workspace` as the fallback.
- Ingestion extracts text from PDF/DOCX/text/HTML files or from images via OCR, then calls `ragIngest` with `chunkSize: 256` and `chunkOverlap: 50`. The resulting chunk count is stored with the document record.
- Search calls `ragSearch` with a configurable `topK` (the IPC handler defaults to 5; the AI chat "notes" mode asks for 3). Retrieved chunks are injected into the system prompt with their filenames and surfaced in the chat as citations — the AI chat view lists each cited chunk's filename and match score and opens a detail drawer with the chunk text.

### Persistence

`apps/desktop/lib/db.ts` uses `node:sqlite`'s `DatabaseSync` with a `deskie.sqlite` file under Electron's `app.getPath('userData')`. Tables cover models, user details, chats, chat messages, subjects, documents (including chunk counts), flashcards, quizzes and an activity log. The renderer reaches this data only through the preload/IPC bridge.

### Renderer

`apps/desktop/src/renderer/src/App.tsx` uses a `HashRouter` with routes for the hero, dashboard, library, deep dive, ingestion, transcription, AI chat, flashcards, review and settings. State uses Zustand stores; styling is Tailwind CSS v4 with a dark theme; GSAP drives some animation.

## Getting started

Prerequisites:

- Node.js 22+ (for `node:sqlite`) and npm
- Git on `PATH` (a transitive dependency resolves from a git URL)

From the repository root:

```bash
npm install --allow-git=all
```

> **npm 12 note:** npm 12 blocks git dependencies by default. A transitive dependency of the Electron toolchain (`@electron/node-gyp`) resolves to a `git+https`/`git+ssh` URL, so installs need `--allow-git=all`. Without it the install fails during dependency resolution.

To install only the desktop app:

```bash
cd apps/desktop
npm install --allow-git=all
```

### Scripts

From the repository root:

```bash
npm run desktop        # dev server for apps/desktop
npm run build:desktop  # production build of the desktop app
```

From `apps/desktop`:

```bash
npm run dev            # electron-vite dev with hot reload
npm run start          # preview a built app
npm run typecheck      # TypeScript checks for main + renderer
npm run lint           # ESLint
npm run format         # Prettier
npm run build          # typecheck + electron-vite build
npm run build:unpack   # unpacked directory build
npm run build:win      # Windows installer (nsis)
npm run build:mac      # macOS build
npm run build:linux    # Linux build
```

Packaged output is written under `apps/desktop/dist` / `out` and `release` depending on the script.

For the in-progress mobile app, run it directly from its directory (the root `mobile` script still points at `apps/mobile`, which has no package.json):

```bash
cd apps/mobile/deskie
npm install
npm start              # expo start; android / ios / web scripts also exist
```

## Repository layout

```
apps/desktop/
  src/main/        Electron main process, IPC handlers, model state
  src/preload/     contextBridge API and its type declarations
  src/renderer/    React UI (components, stores, assets)
  src/shared/      types shared across processes
  lib/             SQLite persistence and OCR example
  constants/       shared UI constants
  qvac/            QVAC worker bundle and addon manifest
  qvac.config.json enabled QVAC plugins
apps/mobile/deskie/ separate Expo app (in progress)
```

The npm workspace root is still named `kpl` in `package.json`; the product and Electron app are both called Deskie.
