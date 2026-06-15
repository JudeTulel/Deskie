import React, { useState } from 'react'

const AccountSettings: React.FC = () => {
  const [profileName, setProfileName] = useState('Bartosz')
  const [profileSurname, setProfileSurname] = useState('Mcdaniel')
  const [email, setEmail] = useState('bartmcdaniel@thecosystem.com')

  return (
    <div className="space-y-12">
      <section>
        <h2 className="text-xl font-semibold text-white mb-1">Profile</h2>
        <p className="text-sm text-slate-400 mb-6">Set your account details</p>
        <div className="rounded-xl border border-slate-700 bg-slate-800/40 backdrop-blur p-8">
          <div className="flex gap-12">
            <div className="flex-1 space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-2">Name</label>
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
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-2">Email</label>
                <input
                  id="profile-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-md border border-blue-500 bg-slate-900/50 px-4 py-2.5 text-sm text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>
            <div className="flex flex-col items-center gap-4">
              <div className="w-32 h-32 rounded-full bg-gradient-to-br from-amber-400 via-orange-400 to-pink-400 flex items-center justify-center shadow-lg">
                <span className="text-4xl font-bold text-white">BM</span>
              </div>
              <button className="rounded-md border border-slate-600 px-4 py-2 text-sm font-medium text-slate-300 hover:bg-slate-700 transition-colors">
                Edit photo
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}

export default AccountSettings