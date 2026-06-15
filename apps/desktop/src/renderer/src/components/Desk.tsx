import React from 'react'

const Desk = () => {
  const cardData = [
    { title: 'Analytics', description: 'Track user behavior', label: 'Insights', color: '#120F17' },
    { title: 'Dashboard', description: 'Centralized data view', label: 'Overview', color: '#120F17' },
    { title: 'Collaboration', description: 'Work together seamlessly', label: 'Teamwork', color: '#120F17' },
    { title: 'Automation', description: 'Streamline workflows', label: 'Efficiency', color: '#120F17' },
    { title: 'Integration', description: 'Connect favorite tools', label: 'Connectivity', color: '#120F17' },
    { title: 'Security', description: 'Enterprise-grade protection', label: 'Protection', color: '#120F17' },
  ]

  return (
    <div className="min-h-screen p-8 pl-36 z-1 ">
      <div className=" mx-auto  ">
        <h1 className="text-3xl font-bold text-white pb-10">Desk</h1>

        {/* Responsive Bento Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 auto-rows-auto gap-4 ">
          {/* Card 1 - Analytics */}
          <div className="bg-lblue hover:bg-sblue border border-[#2F293A] rounded-2xl p-5 aspect-[4/3] min-h-[200px] flex flex-col justify-between">
            <div>
              <span className="text-sm font-medium text-black">Check In</span>
            </div>
            <div>
              <h3 className="text-white text-lg font-semibold mb-1">Learn</h3>
              <p className="text-black text-sm">Today's focus card</p>
            </div>
          </div>

          {/* Card 2 - Dashboard */}
          <div className="bg-blue hover:bg-dblue border border-[#2F293A] rounded-2xl p-5 aspect-[4/3] min-h-[200px] flex flex-col justify-between">
            <div>
              <span className="text-sm font-medium text-gray-400">Quick</span>
            </div>
            <div>
              <h3 className="text-white text-lg font-semibold mb-1">Quiz</h3>
              <p className="text-gray-400 text-sm">Weak areas</p>
            </div>
          </div>

          {/* Card 3 - Collaboration (spans 2 cols & 2 rows, height reduced) */}
          <div className=" bg-white/5 border border-[#2F293A] rounded-2xl p-5 flex flex-col justify-between lg:col-span-2 lg:row-span-2">
            <div>
              <span className="text-sm font-medium text-gray-400">Teamwork</span>
            </div>
            <div>
              <h3 className="text-white text-lg font-semibold mb-1">Collaboration</h3>
              <p className="text-gray-400 text-sm">Work together seamlessly</p>
            </div>
          </div>

          {/* Card 4 - Automation (spans 2 cols, height reduced) */}
          <div className=" bg-white border border-[#2F293A] rounded-2xl p-5 flex flex-col justify-between lg:col-span-2">
            <div>
              <span className="text-sm font-medium text-black">Insight</span>
            </div>
            <div>
              <h3 className="text-black text-lg font-semibold mb-1">Analytics</h3>
              <p className="text-lblue text-sm">Progress tracking</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Desk