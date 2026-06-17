# Deskie

Most student tools are passive: you dump content in, you get nothing back. KPL flips that. Every piece of content a student captures — a lecture recording, a scanned slide, a PDF — is immediately turned into something interactive: searchable notes, flashcards, quizzes, and a personal AI tutor that has read everything they have.

The desktop app is the professional toolkit — where educators and serious students ingest, organise, and author essays and connect to a wider variety of tools. The mobile app is the pocket study companion — always ready to capture a lecture, quiz, or answer a question on the bus.

## For Developers

This project is built with **Electron**, **React**, and **TypeScript**.

### Prerequisites

- [Node.js](https://nodejs.org/) (latest LTS recommended)
- [npm](https://www.npmjs.com/)

### Recommended IDE Setup

- [VSCode](https://code.visualstudio.com/)
- [ESLint](https://marketplace.visualstudio.com/items?itemName=dbaeumer.vscode-eslint)
- [Prettier](https://marketplace.visualstudio.com/items?itemName=esbenp.prettier-vscode)

### Project Setup

1. **Install Dependencies**
   ```bash
   cd apps/desktop
   npm install
   ```

2. **Development**
   Starts the application in development mode with hot-reload.
   ```bash
   npm run dev
   ```

3. **Linting and Formatting**
   ```bash
   # Run linter
   npm run lint

   # Format code
   npm run format
   ```

4. **Type Checking**
   ```bash
   npm run typecheck
   ```

### Building the Application

To build the production-ready application for your platform:

```bash
# For Windows
npm run build:win

# For macOS
npm run build:mac

# For Linux
npm run build:linux
```

The output will be available in the `dist` or `out` directory.

## Project Structure

- `src/main`: Main process code (Electron).
- `src/preload`: Preload scripts for secure communication.
- `src/renderer`: Renderer process (React application).
- `resources`: Static assets.

## Remote APIs and SDKs

This project leverages the **@qvac/sdk** for local AI capabilities, including LLM completions, OCR, RAG, and audio transcription.

### @qvac/sdk Integration

The application interacts with the QVAC SDK primarily in the main process (`src/main/index.ts`). Key functionalities include:

#### Model Management
- `loadModel(config)`: Initializes AI models (LLM, Embedding, OCR, Whisper).
- `unloadModel({ modelId })`: Frees up resources by unloading models.
- `downloadAsset({ assetSrc, onProgress })`: Downloads model assets with progress tracking.
- `getModelInfo({ name })`: Retrieves cache status and details for specific models.

#### AI Capabilities
- `completion({ modelId, history, stream })`: Generates text responses from LLMs. Supports streaming.
- `ocr({ modelId, image, options })`: Performs Optical Character Recognition on images.
- `transcribe({ modelId, audioChunk })`: Transcribes audio files to text using speech-to-text models.
- `ragIngest({ modelId, documents, workspace, chunkOpts })`: Processes and indexes documents into a vector workspace for RAG.
- `ragSearch({ modelId, query, workspace, topK })`: Performs vector search within a workspace to find relevant context.

#### Utilities
- `cancel({ requestId })`: Aborts ongoing operations like model downloads.

### IPC Communication

The renderer process accesses these SDK features via Electron IPC handlers defined in `src/main/index.ts`. Examples include:
- `ipcMain.handle('infer', ...)` -> `completion`
- `ipcMain.handle('rag-ingest', ...)` -> `ragIngest`
- `ipcMain.handle('run-ocr', ...)` -> `ocr`
- `ipcMain.handle('transcribe-audio', ...)` -> `transcribe`
