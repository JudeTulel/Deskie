'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import type { StoredModel } from '../../../shared/models';
import { useModelStore } from '../stores/modelStore';
import { useUserStore } from '../stores/userStore';

// ── Types ────────────────────────────────────────────────────────────────────

interface DownloadEntry {
  id: string;
  name: string;
  assetSrc: string;
  percentage: number;
  downloaded: number;
  total: number;
  downloadKey: string;
  status: 'queued' | 'downloading' | 'completed' | 'cancelled' | 'error';
  error?: string;
  assetId?: string;
  localPath?: string;
  startedAt: number;
}

interface CatalogModel {
  name: string;
  description: string;
  size: string;
  type: 'LLM' | 'Speech' | 'Embedding';
  src: string;
  method: 'p2p' | 'http';
  badge?: string;
}

// ── Preset model catalogue ───────────────────────────────────────────────────

const CATALOG: CatalogModel[] = [
  {
    name: 'Llama 3.2 1B (Q4_0)',
    description: 'Ultra-light chat model, great for low-memory devices.',
    size: '~0.7 GB',
    type: 'LLM',
    src: 'https://huggingface.co/bartowski/Llama-3.2-1B-Instruct-GGUF/resolve/main/Llama-3.2-1B-Instruct-Q4_0.gguf',
    method: 'http',
    badge: 'Popular',
  },
  {
    name: 'Llama 3.2 3B (Q4_K_M)',
    description: 'Balanced performance LLM for everyday tasks.',
    size: '~2.0 GB',
    type: 'LLM',
    src: 'https://huggingface.co/bartowski/Llama-3.2-3B-Instruct-GGUF/resolve/main/Llama-3.2-3B-Instruct-Q4_K_M.gguf',
    method: 'http',
  },
  {
    name: 'Mistral 7B v0.3 (Q4_K_M)',
    description: 'Fast, high-quality 7B reasoning model.',
    size: '~4.1 GB',
    type: 'LLM',
    src: 'https://huggingface.co/bartowski/Mistral-7B-Instruct-v0.3-GGUF/resolve/main/Mistral-7B-Instruct-v0.3-Q4_K_M.gguf',
    method: 'http',
  },
  {
    name: 'Whisper Tiny',
    description: 'Minimal speech-to-text model for quick transcription.',
    size: '~39 MB',
    type: 'Speech',
    src: 'https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-tiny.bin',
    method: 'http',
  },
  {
    name: 'Whisper Base',
    description: 'Balanced speech-to-text for most use cases.',
    size: '~142 MB',
    type: 'Speech',
    src: 'https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-base.bin',
    method: 'http',
  },
  {
    name: 'EmbeddingGemma 300M (Q4_0)',
    description: 'Lightweight embedding model for semantic search and RAG.',
    size: '~180 MB',
    type: 'Embedding',
    src: 'https://huggingface.co/bartowski/EmbeddingGemma-300M-GGUF/resolve/main/embedding-gemma-300m-Q4_0.gguf',
    method: 'http',
  },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatBytes(bytes: number): string {
  if (!bytes || bytes <= 0) return '—';
  const units = ['B', 'KB', 'MB', 'GB'];
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit++;
  }
  return `${value.toFixed(1)} ${units[unit]}`;
}

function uid(): string {
  return Math.random().toString(36).slice(2, 10);
}

function methodLabel(src: string): 'P2P (Hyperdrive)' | 'HTTP' {
  return src.startsWith('pear://') ? 'P2P (Hyperdrive)' : 'HTTP';
}

function methodColor(src: string): string {
  return src.startsWith('pear://')
    ? 'bg-violet-500/15 text-violet-300 border-violet-500/30'
    : 'bg-sky-500/15 text-sky-300 border-sky-500/30';
}

// ── Icons ─────────────────────────────────────────────────────────────────────

const IconDownload = () => (
  <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v12m0 0l-4-4m4 4l4-4M4 20h16" />
  </svg>
);
const IconX = () => (
  <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
  </svg>
);
const IconCheck = () => (
  <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
  </svg>
);
const IconP2P = () => (
  <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
    <circle cx="6" cy="12" r="3" />
    <circle cx="18" cy="6" r="3" />
    <circle cx="18" cy="18" r="3" />
    <path strokeLinecap="round" d="M9 10.5L15 7.5M9 13.5L15 16.5" />
  </svg>
);
const IconGlobe = () => (
  <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="10" />
    <path strokeLinecap="round" d="M2 12h20M12 2a15.3 15.3 0 010 20M12 2a15.3 15.3 0 000 20" />
  </svg>
);

// ── Download Queue Item ───────────────────────────────────────────────────────

const DownloadItem: React.FC<{
  item: DownloadEntry;
  activeModel: StoredModel | null;
  onCancel: (id: string) => void;
  onRemove: (id: string) => void;
  onSetActive: (item: DownloadEntry) => void;
}> = ({ item, activeModel, onCancel, onRemove, onSetActive }) => {
  const isActive = item.status === 'downloading' || item.status === 'queued';
  const isActiveModel = activeModel?.assetSrc === item.assetSrc || activeModel?.assetId === item.assetId;
  const elapsed = ((Date.now() - item.startedAt) / 1000).toFixed(0);

  const statusColor: Record<DownloadEntry['status'], string> = {
    queued: 'text-amber-400',
    downloading: 'text-sky-400',
    completed: 'text-emerald-400',
    cancelled: 'text-slate-500',
    error: 'text-red-400',
  };

  const barColor: Record<DownloadEntry['status'], string> = {
    queued: 'from-amber-500 to-yellow-400',
    downloading: 'from-sky-500 to-blue-400',
    completed: 'from-emerald-500 to-green-400',
    cancelled: 'from-slate-600 to-slate-500',
    error: 'from-red-600 to-red-500',
  };

  return (
    <div
      className="group relative rounded-xl border border-slate-700/60 bg-slate-800/30 p-4 transition-all hover:border-slate-600/80"
      style={{ backdropFilter: 'blur(8px)' }}
    >
      {/* Header row */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-slate-100 truncate">{item.name}</p>
          <p className="text-[11px] text-slate-500 mt-0.5 truncate">{item.assetSrc}</p>
        </div>

        <div className="flex items-center gap-1.5 flex-shrink-0">
          {/* Method badge */}
          <span className={`text-[10px] font-medium border rounded px-1.5 py-0.5 flex items-center gap-1 ${methodColor(item.assetSrc)}`}>
            {item.assetSrc.startsWith('pear://') ? <IconP2P /> : <IconGlobe />}
            {methodLabel(item.assetSrc)}
          </span>
          {/* Status badge */}
          <span className={`text-[10px] font-semibold capitalize ${statusColor[item.status]}`}>
            {item.status}
          </span>
        </div>
      </div>

      {/* Progress bar */}
      {(isActive || item.status === 'completed') && (
        <div className="mb-3">
          <div className="h-1.5 rounded-full bg-slate-700/60 overflow-hidden">
            <div
              className={`h-full rounded-full bg-gradient-to-r ${barColor[item.status]} transition-all duration-300`}
              style={{ width: `${item.percentage}%` }}
            />
          </div>
          <div className="flex justify-between mt-1.5 text-[11px] text-slate-500">
            <span>
              {item.total > 0
                ? `${formatBytes(item.downloaded)} / ${formatBytes(item.total)}`
                : formatBytes(item.downloaded)}
            </span>
            <span className="font-medium text-slate-400">{item.percentage.toFixed(1)}%</span>
          </div>
        </div>
      )}

      {/* Error message */}
      {item.status === 'error' && item.error && (
        <p className="text-[11px] text-red-400 mb-3 font-mono bg-red-900/10 rounded p-2 border border-red-900/30">
          {item.error}
        </p>
      )}

      {/* Footer row */}
      <div className="flex items-center justify-between">
        <span className="text-[11px] text-slate-600 capitalize">
          {item.downloadKey ? `Key: ${item.downloadKey.slice(0, 12)}…` : ''}
          {isActive && ` · ${elapsed}s`}
        </span>
        <div className="flex gap-1.5">
          {item.status === 'completed' && item.assetId && (
            <button
              id={`set-active-download-${item.id}`}
              onClick={() => onSetActive(item)}
              disabled={isActiveModel}
              className={`flex items-center gap-1 rounded-md border px-2.5 py-1 text-[11px] transition-all \${
                isActiveModel
                  ? 'border-emerald-500/30 bg-emerald-900/10 text-emerald-400 cursor-default'
                  : 'border-blue-500/40 text-blue-300 hover:bg-blue-900/20'
              }`}
            >
              <IconCheck /> {isActiveModel ? 'Active' : 'Set active'}
            </button>
          )}
          {isActive && (
            <button
              id={`cancel-download-${item.id}`}
              onClick={() => onCancel(item.id)}
              className="flex items-center gap-1 rounded-md border border-slate-600/60 px-2.5 py-1 text-[11px] text-slate-300 hover:border-red-500/50 hover:text-red-400 hover:bg-red-900/10 transition-all"
            >
              <IconX /> Cancel
            </button>
          )}
          {!isActive && (
            <button
              id={`remove-download-${item.id}`}
              onClick={() => onRemove(item.id)}
              className="flex items-center gap-1 rounded-md border border-slate-700/60 px-2.5 py-1 text-[11px] text-slate-500 hover:border-slate-600 hover:text-slate-300 transition-all"
            >
              <IconX /> Dismiss
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

// ── Main Settings Component ───────────────────────────────────────────────────

const Settings: React.FC = () => {
  const [activeTab, setActiveTab] = useState('account');
  const { userDetails, hydrate: hydrateUser, saveUserDetails } = useUserStore();
  const [profileName, setProfileName] = useState('');
  const [profileSurname, setProfileSurname] = useState('');
  const [email, setEmail] = useState('');
  const [nickname, setNickname] = useState('');
  const [uptime, setUptime] = useState('0h 0m');
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
  const [saveError, setSaveError] = useState('');
  const [hfToken, setHfToken] = useState<string>(localStorage.getItem('hfToken') || '');

  const [downloads, setDownloads] = useState<DownloadEntry[]>([]);
  const [customSrc, setCustomSrc] = useState('');
  const [customName, setCustomName] = useState('');
  const [downloadMode, setDownloadMode] = useState<'catalogue' | 'custom'>('catalogue');
  const [filterType, setFilterType] = useState<'all' | 'LLM' | 'Speech' | 'Embedding'>('all');

  const progressCleanupRef = useRef<(() => void) | null>(null);
  const { models, activeModel, hydrate, saveModel, setActiveModel } = useModelStore();

  useEffect(() => {
    hydrate();
    hydrateUser();
  }, [hydrate, hydrateUser]);

  useEffect(() => {
    if (userDetails) {
      setProfileName(userDetails.name || '');
      setProfileSurname(userDetails.surname || '');
      setEmail(userDetails.email || '');
      setNickname(userDetails.nickname || '');
    }
  }, [userDetails]);

  const handleSaveProfile = async () => {
    if (!nickname.trim() || !profileName.trim() || !profileSurname.trim() || !email.trim()) {
      setSaveStatus('error');
      setSaveError('All fields are required.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+\$/;
    if (!emailRegex.test(email.trim())) {
      setSaveStatus('error');
      setSaveError('Please enter a valid email address.');
      return;
    }

    setSaveStatus('saving');
    setSaveError('');
    try {
      await saveUserDetails({
        nickname: nickname.trim(),
        name: profileName.trim(),
        surname: profileSurname.trim(),
        email: email.trim()
      });
      setSaveStatus('success');
      setTimeout(() => setSaveStatus('idle'), 3000);
    } catch (err: any) {
      setSaveStatus('error');
      setSaveError(err?.message || 'Failed to save changes.');
    }
  };

  // ── Uptime ticker ──
  useEffect(() => {
    const start = Date.now();
    const iv = setInterval(() => {
      const elapsed = Math.floor((Date.now() - start) / 60000);
      setUptime(`${Math.floor(elapsed / 60)}h ${elapsed % 60}m`);
    }, 60000);
    return () => clearInterval(iv);
  }, []);

  // ── Subscribe to download progress from main process ──
  useEffect(() => {
    if (!window.qvacAPI?.onDownloadProgress) return;
    const unsub = window.qvacAPI.onDownloadProgress((data) => {
      setDownloads((prev) =>
        prev.map((d) =>
          d.id === data.downloadId
            ? {
                ...d,
                percentage: data.percentage,
                downloaded: data.downloaded,
                total: data.total,
                downloadKey: data.downloadKey,
                status: 'downloading' as const,
              }
            : d
        )
      );
    });
    progressCleanupRef.current = unsub;
    return () => unsub?.();
  }, []);

  // ── Trigger a download ──
  const startDownload = useCallback(async (assetSrc: string, name: string) => {
    const id = uid();
    const entry: DownloadEntry = {
      id,
      name,
      assetSrc,
      percentage: 0,
      downloaded: 0,
      total: 0,
      downloadKey: '',
      status: 'queued',
      startedAt: Date.now(),
    };
    setDownloads((prev) => [entry, ...prev]);

    try {
      const result = await window.qvacAPI.downloadModel(assetSrc, id);
      setDownloads((prev) =>
        prev.map((d) =>
          d.id === id
            ? result.cancelled
              ? { ...d, status: 'cancelled', percentage: d.percentage }
              : { ...d, status: 'completed', percentage: 100, assetId: result.assetId, localPath: result.localPath }
            : d
        )
      );
      if (!result.cancelled && result.assetId) {
        await saveModel({
          name,
          assetSrc,
          assetId: result.assetId,
          localPath: result.localPath,
          type: (name.toLowerCase().includes('whisper') ? 'Speech' :
                name.toLowerCase().includes('embedding') ? 'Embedding' : 'LLM') as any,
          status: 'completed'
        });
      }
    } catch (err: any) {
      setDownloads((prev) =>
        prev.map((d) => (d.id === id ? { ...d, status: 'error', error: err?.message ?? String(err) } : d))
      );
    }
  }, [saveModel]);

  const handleCatalogueDownload = (model: CatalogModel) => {
    startDownload(model.src, model.name);
    setActiveTab('model');
  };

  const handleCustomDownload = () => {
    if (!customSrc.trim()) return;
    const name = customName.trim() || customSrc.split('/').pop() || 'Custom Model';
    startDownload(customSrc.trim(), name);
    setCustomSrc('');
    setCustomName('');
  };

  const handleCancel = async (id: string) => {
    await window.qvacAPI.cancelDownload(id);
    setDownloads((prev) => prev.map((d) => (d.id === id ? { ...d, status: 'cancelled' } : d)));
  };

  const handleRemove = (id: string) => {
    setDownloads((prev) => prev.filter((d) => d.id !== id));
  };

  const handleSetActiveDownload = async (item: DownloadEntry) => {
    await saveModel({
      name: item.name,
      assetSrc: item.assetSrc,
      assetId: item.assetId,
      localPath: item.localPath,
      type: (item.name.toLowerCase().includes('whisper') ? 'Speech' :
            item.name.toLowerCase().includes('embedding') ? 'Embedding' : 'LLM') as any,
      status: 'completed',
      isActive: true
    });
  };

  const handleSetActiveCatalog = async (model: CatalogModel) => {
    await saveModel({
      name: model.name,
      assetSrc: model.src,
      type: model.type as any,
      status: 'available',
      isActive: true
    });
  };

  const activeCount = downloads.filter((d) => d.status === 'downloading' || d.status === 'queued').length;
  const filteredCatalog = CATALOG.filter((m) => filterType === 'all' || m.type === filterType);

  const tabs = [
    { id: 'account', label: 'Account' },
    { id: 'model', label: activeCount > 0 ? `Model  (${activeCount})` : 'Model' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
      {/* ── Sticky Header ── */}
      <div className="sticky top-0 z-3 border-b border-slate-800 bg-slate-950/95 backdrop-blur">
        <div className="mx-auto max-w-7xl px-8 py-6">
          <h1 className="text-3xl font-bold text-white">Settings</h1>
          <p className="mt-1 text-sm text-slate-400">Manage your account, models, and preferences</p>
        </div>
        <div className="border-t border-slate-800 flex gap-0 overflow-x-auto px-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              id={`settings-tab-${tab.id}`}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-white text-white'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Tab Content ── */}
      <div className="mx-auto max-w-7xl px-8 py-12">

        {/* ══ Account Tab ══════════════════════════════════════════════════════ */}
        {activeTab === 'account' && (
          <div className="space-y-12">
            <section>
              <h2 className="text-xl font-semibold text-white mb-1">Profile</h2>
              <p className="text-sm text-slate-400 mb-6">Set your account details</p>
              <div className="rounded-xl border border-slate-700 bg-slate-800/40 backdrop-blur p-8">
                <div className="flex gap-12">
                  <div className="flex-1 space-y-6">
                    {saveStatus === 'error' && saveError && (
                      <div className="px-4 py-2.5 bg-red-900/10 border border-red-500/30 rounded-lg text-xs text-red-400 font-medium">
                        {saveError}
                      </div>
                    )}
                    {saveStatus === 'success' && (
                      <div className="px-4 py-2.5 bg-emerald-900/10 border border-emerald-500/30 rounded-lg text-xs text-emerald-400 font-medium">
                        Profile updated successfully!
                      </div>
                    )}
                    <div className="grid grid-cols-2 gap-6">
                      <div>
                        <label className="block text-xs font-medium text-slate-400 mb-2">Nickname</label>
                        <input
                          id="profile-nickname"
                          type="text"
                          value={nickname}
                          onChange={(e) => setNickname(e.target.value)}
                          className="w-full rounded-md border border-slate-600 bg-slate-900/50 px-4 py-2.5 text-sm text-slate-100 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-400 mb-2">Email</label>
                        <input
                          id="profile-email"
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className="w-full rounded-md border border-slate-600 bg-slate-900/50 px-4 py-2.5 text-sm text-slate-100 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-6">
                      <div>
                        <label className="block text-xs font-medium text-slate-400 mb-2">First Name</label>
                        <input
                          id="profile-name"
                          type="text"
                          value={profileName}
                          onChange={(e) => setProfileName(e.target.value)}
                          className="w-full rounded-md border border-slate-600 bg-slate-900/50 px-4 py-2.5 text-sm text-slate-100 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-400 mb-2">Surname</label>
                        <input
                          id="profile-surname"
                          type="text"
                          value={profileSurname}
                          onChange={(e) => setProfileSurname(e.target.value)}
                          className="w-full rounded-md border border-slate-600 bg-slate-900/50 px-4 py-2.5 text-sm text-slate-100 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                      </div>
                    </div>
                    <div className="flex justify-end pt-4">
                      <button
                        onClick={handleSaveProfile}
                        disabled={saveStatus === 'saving'}
                        className="rounded-lg bg-gradient-to-r from-blue-600 to-blue-500 px-5 py-2.5 text-xs font-semibold text-white hover:from-blue-500 hover:to-blue-400 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-lg shadow-blue-900/30"
                      >
                        {saveStatus === 'saving' ? 'Saving...' : 'Save Changes'}
                      </button>
                    </div>
                  </div>
                  <div className="flex flex-col items-center gap-4">
                    <div className="w-32 h-32 rounded-full bg-gradient-to-br from-amber-400 via-orange-400 to-pink-400 flex items-center justify-center shadow-lg">
                      <span className="text-4xl font-bold text-white">
                        {`${profileName.charAt(0)}${profileSurname.charAt(0)}`.toUpperCase() || 'U'}
                      </span>
                    </div>
                    <button className="rounded-md border border-slate-600 px-4 py-2 text-sm font-medium text-slate-300 hover:bg-slate-700 transition-colors">
                      Edit photo
                    </button>
                  </div>
                </div>
              </div>
            </section>
          </div>
        )}

        {/* ══ Model Tab ════════════════════════════════════════════════════════ */}
        {activeTab === 'model' && (
          <div className="space-y-10">

            {/* ─ Mode toggle ─ */}
            <div className="flex items-center gap-2">
              {(['catalogue', 'custom'] as const).map((m) => (
                <button
                  key={m}
                  id={`model-mode-${m}`}
                  onClick={() => setDownloadMode(m)}
                  className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
                    downloadMode === m
                      ? 'bg-white text-slate-900'
                      : 'bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-700'
                  }`}
                >
                  {m === 'catalogue' ? 'Browse Catalogue' : 'Custom URL'}
                </button>
              ))}
            </div>

            {/* ─ Model Catalogue ─ */}
            {downloadMode === 'catalogue' && (
              <section>
                <div className="flex items-center justify-between mb-5">
                  <div>
                    <h2 className="text-xl font-semibold text-white">Model Catalogue</h2>
                    <p className="text-sm text-slate-400 mt-0.5">Pre-configured models ready to download</p>
                  </div>
                  {/* Type filter */}
                  <div className="flex items-center gap-1.5 rounded-lg border border-slate-700/60 bg-slate-800/40 p-1">
                    {(['all', 'LLM', 'Speech', 'Embedding'] as const).map((f) => (
                      <button
                        key={f}
                        id={`filter-${f}`}
                        onClick={() => setFilterType(f)}
                        className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${
                          filterType === f
                            ? 'bg-slate-600 text-white'
                            : 'text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        {f === 'all' ? 'All' : f}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {filteredCatalog.map((model) => {
                    const alreadyQueued = downloads.some(
                      (d) => d.assetSrc === model.src && (d.status === 'downloading' || d.status === 'queued')
                    );
                    const completed = downloads.some(
                      (d) => d.assetSrc === model.src && d.status === 'completed'
                    );
                    const storedModel = models.find((m) => m.assetSrc === model.src);
                    const canSetActive = model.type === 'LLM' && (completed || Boolean(storedModel));
                    const isActiveModel = activeModel?.assetSrc === model.src;

                    return (
                      <div
                        key={model.name}
                        className="relative group rounded-xl border border-slate-700/60 bg-slate-800/30 p-5 flex flex-col gap-3 hover:border-slate-600 transition-all"
                        style={{ backdropFilter: 'blur(8px)' }}
                      >
                        {/* Top badges */}
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex flex-wrap gap-1.5">
                            <span className="text-[10px] font-semibold uppercase tracking-wide bg-slate-700/60 text-slate-300 rounded px-1.5 py-0.5">
                              {model.type}
                            </span>
                            <span className={`text-[10px] font-medium border rounded px-1.5 py-0.5 flex items-center gap-1 ${methodColor(model.src)}`}>
                              {model.method === 'p2p' ? <IconP2P /> : <IconGlobe />}
                              {model.method === 'p2p' ? 'P2P' : 'HTTP'}
                            </span>
                            {model.badge && (
                              <span className="text-[10px] font-semibold bg-gradient-to-r from-amber-500/20 to-orange-500/20 text-amber-300 border border-amber-500/30 rounded px-1.5 py-0.5">
                                {model.badge}
                              </span>
                            )}
                          </div>
                          {completed && (
                            <span className="flex items-center gap-1 text-[10px] text-emerald-400 font-medium">
                              <IconCheck /> Done
                            </span>
                          )}
                        </div>

                        {/* Model info */}
                        <div>
                          <p className="text-sm font-semibold text-slate-100">{model.name}</p>
                          <p className="text-xs text-slate-400 mt-1 leading-relaxed">{model.description}</p>
                        </div>

                        {/* Footer */}
                        <div className="flex items-center justify-between mt-auto pt-2 border-t border-slate-700/40">
                          <span className="text-xs text-slate-500 font-mono">{model.size}</span>
                          {canSetActive && (
                            <button
                              id={`active-catalogue-${model.name.replace(/\s+/g, '-').toLowerCase()}`}
                              onClick={() => storedModel ? setActiveModel(storedModel.id) : handleSetActiveCatalog(model)}
                              disabled={isActiveModel}
                              className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition-all ${
                                isActiveModel
                                  ? 'bg-emerald-900/20 text-emerald-400 border border-emerald-500/30 cursor-default'
                                  : 'border border-blue-500/40 text-blue-300 hover:bg-blue-900/20'
                              }`}
                            >
                              <IconCheck /> {isActiveModel ? 'Active' : 'Set active'}
                            </button>
                          )}
                          <button
                            id={`download-catalogue-${model.name.replace(/\s+/g, '-').toLowerCase()}`}
                            onClick={() => handleCatalogueDownload(model)}
                            disabled={alreadyQueued || completed}
                            className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition-all ${
                              completed
                                ? 'bg-emerald-900/20 text-emerald-400 border border-emerald-500/30 cursor-default'
                                : alreadyQueued
                                ? 'bg-slate-700/60 text-slate-500 cursor-not-allowed border border-slate-600/40'
                                : 'bg-gradient-to-r from-blue-600 to-blue-500 text-white hover:from-blue-500 hover:to-blue-400 shadow-lg shadow-blue-900/30'
                            }`}
                          >
                            {completed ? (
                              <><IconCheck /> Downloaded</>
                            ) : alreadyQueued ? (
                              'In queue…'
                            ) : (
                              <><IconDownload /> Download</>
                            )}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            {/* ─ Custom URL Form ─ */}
            {downloadMode === 'custom' && (
              <section>
                <h2 className="text-xl font-semibold text-white mb-1">Custom Model URL</h2>
                <p className="text-sm text-slate-400 mb-6">
                  Paste an HTTP URL or a <code className="text-violet-400 font-mono text-xs bg-violet-900/20 px-1 rounded">pear://&lt;key&gt;/path</code> Hyperdrive address to download any GGUF model
                </p>

                <div className="rounded-xl border border-slate-700/60 bg-slate-800/30 p-6 space-y-5" style={{ backdropFilter: 'blur(8px)' }}>
                  {/* URL Input */}
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-2">
                      Model source <span className="text-slate-600">(HTTP or pear://)</span>
                    </label>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">
                          {customSrc.startsWith('pear://') ? <IconP2P /> : <IconGlobe />}
                        </span>
                        <input
                          id="custom-model-src"
                          type="text"
                          value={customSrc}
                          onChange={(e) => setCustomSrc(e.target.value)}
                          placeholder="https://... or pear://..."
                          className="w-full pl-9 rounded-lg border border-slate-600 bg-slate-900/60 px-4 py-3 text-sm text-slate-100 placeholder-slate-600 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Name Input */}
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-2">
                      Display name <span className="text-slate-600">(optional)</span>
                    </label>
                    <input
                      id="custom-model-name"
                      type="text"
                      value={customName}
                      onChange={(e) => setCustomName(e.target.value)}
                      placeholder="My Custom Model"
                      className="w-full rounded-lg border border-slate-600 bg-slate-900/60 px-4 py-3 text-sm text-slate-100 placeholder-slate-600 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>

                  {/* Transport indicator */}
                  {customSrc.trim() && (
                    <div className={`flex items-center gap-2 text-xs px-3 py-2 rounded-lg border ${methodColor(customSrc)}`}>
                      {customSrc.startsWith('pear://') ? <IconP2P /> : <IconGlobe />}
                      <span className="font-medium">
                        {customSrc.startsWith('pear://')
                          ? 'P2P Hyperdrive — model will be seeded by connected peers'
                          : 'HTTP download — fetching directly from remote server'}
                      </span>
                    </div>
                  )}

                  <button
                    id="custom-download-btn"
                    onClick={handleCustomDownload}
                    disabled={!customSrc.trim()}
                    className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-blue-600 to-blue-500 px-5 py-2.5 text-sm font-semibold text-white hover:from-blue-500 hover:to-blue-400 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-lg shadow-blue-900/30"
                  >
                    <IconDownload /> Start Download
                  </button>
                </div>
              </section>
            )}

            {/* ─ Download Queue ─ */}
            {downloads.length > 0 && (
              <section>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-xl font-semibold text-white">Download Queue</h2>
                    <p className="text-sm text-slate-400 mt-0.5">
                      {activeCount > 0 ? `${activeCount} active` : 'All downloads finished'}
                    </p>
                  </div>
                  {activeCount === 0 && (
                    <button
                      id="clear-all-downloads"
                      onClick={() => setDownloads([])}
                      className="text-xs text-slate-500 hover:text-slate-300 transition-colors border border-slate-700/60 rounded-lg px-3 py-1.5 hover:border-slate-600"
                    >
                      Clear all
                    </button>
                  )}
                </div>

                <div className="space-y-3">
                  {downloads.map((d) => (
                    <DownloadItem
                      key={d.id}
                      item={d}
                      activeModel={activeModel}
                      onCancel={handleCancel}
                      onRemove={handleRemove}
                      onSetActive={handleSetActiveDownload}
                    />
                  ))}
                </div>
              </section>
            )}

          </div>
        )}
      </div>
    </div>
  );
};

export default Settings;