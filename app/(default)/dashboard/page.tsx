'use client'

import { useSession } from 'next-auth/react'
import { useState } from 'react'
import FilterButton from '@/components/dropdown-filter'
import Datepicker from '@/components/datepicker'
import DashboardCard01 from './dashboard-card-01'
import DashboardCard02 from './dashboard-card-02'
import DashboardCard03 from './dashboard-card-03'
import DashboardCard04 from './dashboard-card-04'
import DashboardCard05 from './dashboard-card-05'
import DashboardCard06 from './dashboard-card-06'
import DashboardCard07 from './dashboard-card-07'
import DashboardCard08 from './dashboard-card-08'
import DashboardCard09 from './dashboard-card-09'
import DashboardCard10 from './dashboard-card-10'
import DashboardCard11 from './dashboard-card-11'
import { AnalyticsProvider } from '@/hooks/use-analytics-context'

export default function Dashboard() {
  const { data: session } = useSession()
  const [refreshKey, setRefreshKey] = useState(0)
  
  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1)
  }
  
  return (
    <AnalyticsProvider>
      <div className="px-4 sm:px-6 lg:px-8 py-8 w-full max-w-[96rem] mx-auto">
      {/* Dashboard actions */}
      <div className="sm:flex sm:justify-between sm:items-center mb-8">
        {/* Left: Title */}
        <div className="mb-4 sm:mb-0">
          <h1 className="text-2xl md:text-3xl text-gray-800 dark:text-gray-100 font-bold">
            GitHub Dashboard
          </h1>
          {session?.user && (
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Welcome back, {session.user.name || session.user.username || session.user.email}! 👋
              {session.user.username && (
                <span className="ml-2 text-xs bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded-full">
                  @{session.user.username}
                </span>
              )}
            </p>
          )}
        </div>
        {/* Right: Actions */}
        <div className="grid grid-flow-col sm:auto-cols-max justify-start sm:justify-end gap-2">
          {/* Refresh button */}
          <button 
            onClick={handleRefresh}
            className="btn bg-violet-500 text-white hover:bg-violet-600 dark:bg-violet-600 dark:hover:bg-violet-700"
          >
            <svg className="fill-current shrink-0 xs:hidden" width="16" height="16" viewBox="0 0 16 16">
              <path d="M8 3a5 5 0 1 0 4.546 2.914.5.5 0 0 1 .908-.417A6 6 0 1 1 8 2v1z"/>
              <path d="M8 4.466V.534a.25.25 0 0 1 .41-.192l2.36 1.966c.12.1.12.284 0 .384L8.41 4.658A.25.25 0 0 1 8 4.466z"/>
            </svg>
            <span className="max-xs:sr-only">Refresh</span>
          </button>
          {/* Filter button */}        
          <FilterButton align="right" />
          {/* Datepicker built with React Day Picker */}
          <Datepicker />
          {/* Add view button */}
          <button className="btn bg-gray-900 text-gray-100 hover:bg-gray-800 dark:bg-gray-100 dark:text-gray-800 dark:hover:bg-white">
            <svg className="fill-current shrink-0 xs:hidden" width="16" height="16" viewBox="0 0 16 16">
              <path d="M15 7H9V1c0-.6-.4-1-1-1S7 .4 7 1v6H1c-.6 0-1 .4-1 1s.4 1 1 1h6v6c0 .6.4 1 1 1s1-.4 1-1V9h6c.6 0 1-.4 1-1s-.4-1-1-1z" />
            </svg>
            <span className="max-xs:sr-only">Add View</span>
          </button>              
        </div>
      </div>

      {/* Cards */}
      <div key={refreshKey} className="grid grid-cols-12 gap-6">

        {/* GitHub Commits Activity */}
        <DashboardCard01 />
        {/* GitHub Repositories */}
        <DashboardCard02 />
        {/* GitHub Stars */}
        <DashboardCard03 />
        {/* GitHub Issues */}
        <DashboardCard04 />
        {/* GitHub Overview Stats */}
        <DashboardCard05 />
        {/* Programming Languages Distribution */}
        <DashboardCard06 />
        {/* Recent Activity Table */}
        <DashboardCard07 />
        {/* Line chart (Sales Over Time) */}
        <DashboardCard08 />
        {/* Stacked bar chart (Sales VS Refunds) */}
        <DashboardCard09 />
        {/* Card (Recent Activity) */}
        <DashboardCard10 />
        {/* Card (Income/Expenses) */}
        <DashboardCard11 />        

      </div>
      </div>
    </AnalyticsProvider>
  )
}
