import React, { useState } from 'react'
import AccountSettings from './pages/AccountSettings'
import ModelSettings from './pages/ModelSettings'

const TABS = [
  { id: 'account', label: 'Account' },
  { id: 'model',   label: 'Model' },
]

const Settings: React.FC = () => {
  const [activeTab, setActiveTab] = useState('account')

  // ModelSettings surfaces its active download count via a callback
  const [activeDownloadCount, setActiveDownloadCount] = useState(0)

  return (
    <div className="min-h-screen pl-16">

      {/* ── Header — full width, flush to left sidebar ── */}
      <div className="sticky top-0 z-10 w-full border-b border-slate-800">
        <div className="px-8 pt-6 pb-0 flex items-end justify-between">
          {/* Title block */}
          <div className="pb-4">
            <h1 className="text-3xl font-bold text-white">Settings</h1>
            <p className="mt-1 text-sm text-slate-400">Manage your account, models, and preferences</p>
          </div>

          {/* Tabs — right-aligned, sit on the border */}
          <div className="flex gap-0">
            {TABS.map((tab) => {
              const label = tab.id === 'model' && activeDownloadCount > 0
                ? `Model (${activeDownloadCount})`
                : tab.label
              return (
                <button
                  key={tab.id}
                  id={`settings-tab-${tab.id}`}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-5 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                    activeTab === tab.id
                      ? 'border-white text-white'
                      : 'border-transparent text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {label}
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* ── Content ── */}
      <div className="px-8 py-8">
        {activeTab === 'account' && <AccountSettings />}
        {activeTab === 'model'   && <ModelSettings onActiveCountChange={setActiveDownloadCount} />}
      </div>
    </div>
  )
}

export default Settings