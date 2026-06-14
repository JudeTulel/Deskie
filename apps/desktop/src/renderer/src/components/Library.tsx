import React from 'react'

const Library = () => {
  const cardData = [
    { title: 'Analytics', description: 'Track user behavior', label: 'Insights', color: '#120F17' },
    { title: 'Dashboard', description: 'Centralized data view', label: 'Overview', color: '#120F17' },
    { title: 'Collaboration', description: 'Work together seamlessly', label: 'Teamwork', color: '#120F17' },
    { title: 'Automation', description: 'Streamline workflows', label: 'Efficiency', color: '#120F17' },
    { title: 'Integration', description: 'Connect favorite tools', label: 'Connectivity', color: '#120F17' },
    { title: 'Security', description: 'Enterprise-grade protection', label: 'Protection', color: '#120F17' },
  ]

  return (
    <div className="min-h-screen p-8 pl-36">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-white mb-6">Library</h1>
        
        {/* Responsive Bento Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 auto-rows-auto gap-4">
          {/* Card 1 */}
          <div className="bg-[#120F17] border border-[#2F293A] rounded-2xl p-5 aspect-[4/3] min-h-[200px] flex flex-col justify-between">
            <div className="text-white">
              <span className="text-sm font-medium text-gray-400">Insights</span>
            </div>
            <div>
              <h3 className="text-white text-lg font-semibold mb-1">Analytics</h3>
              <p className="text-gray-400 text-sm">Track user behavior</p>
            </div>
          </div>

          {/* Card 2 */}
          <div className="bg-[#120F17] border border-[#2F293A] rounded-2xl p-5 aspect-[4/3] min-h-[200px] flex flex-col justify-between">
            <div>
              <span className="text-sm font-medium text-gray-400">Overview</span>
            </div>
            <div>
              <h3 className="text-white text-lg font-semibold mb-1">Dashboard</h3>
              <p className="text-gray-400 text-sm">Centralized data view</p>
            </div>
          </div>

          {/* Card 3 - spans 2 columns and 2 rows on large screens */}
          <div className="bg-[#120F17] border border-[#2F293A] rounded-2xl p-5 min-h-[200px] flex flex-col justify-between lg:col-span-2 lg:row-span-2 aspect-auto">
            <div>
              <span className="text-sm font-medium text-gray-400">Teamwork</span>
            </div>
            <div>
              <h3 className="text-white text-lg font-semibold mb-1">Collaboration</h3>
              <p className="text-gray-400 text-sm">Work together seamlessly</p>
            </div>
          </div>

          {/* Card 4 - spans 2 columns on large screens, starts at row 2 automatically */}
          <div className="bg-[#120F17] border border-[#2F293A] rounded-2xl p-5 aspect-[4/3] min-h-[200px] flex flex-col justify-between lg:col-span-2">
            <div>
              <span className="text-sm font-medium text-gray-400">Efficiency</span>
            </div>
            <div>
              <h3 className="text-white text-lg font-semibold mb-1">Automation</h3>
              <p className="text-gray-400 text-sm">Streamline workflows</p>
            </div>
          </div>

          
        </div>
      </div>
    </div>
  )
}

export default Library