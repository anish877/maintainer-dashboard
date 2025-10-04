'use client'

import EditMenu from '@/components/edit-menu'
import { useAnalytics } from '@/hooks/use-analytics-context'

export default function DashboardCard05() {
  const { stats, loading } = useAnalytics()

  if (loading) {
    return (
      <div className="flex flex-col col-span-full sm:col-span-6 xl:col-span-4 bg-white dark:bg-gray-800 shadow-sm rounded-xl">
        <div className="px-5 pt-5">
          <header className="flex justify-between items-start mb-2">
            <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-2">GitHub Overview</h2>
          </header>
          <div className="animate-pulse space-y-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-20"></div>
                <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-12"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  const statsData = [
    {
      label: 'Total Repositories',
      value: stats?.totalRepos || 0,
      icon: '📁',
      color: 'text-blue-600'
    },
    {
      label: 'Total Stars',
      value: stats?.totalStars?.toLocaleString() || '0',
      icon: '⭐',
      color: 'text-yellow-600'
    },
    {
      label: 'Total Forks',
      value: stats?.totalForks?.toLocaleString() || '0',
      icon: '🍴',
      color: 'text-green-600'
    },
    {
      label: 'Total Commits',
      value: stats?.totalCommits?.toLocaleString() || '0',
      icon: '💾',
      color: 'text-purple-600'
    }
  ]

  return(
    <div className="flex flex-col col-span-full sm:col-span-6 xl:col-span-4 bg-white dark:bg-gray-800 shadow-sm rounded-xl">
      <div className="px-5 pt-5">
        <header className="flex justify-between items-start mb-2">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-2">GitHub Overview</h2>
          {/* Menu button */}
          <EditMenu align="right" />
        </header>
        <div className="space-y-4">
          {statsData.map((stat, index) => (
            <div key={index} className="flex items-center justify-between">
              <div className="flex items-center">
                <span className="text-2xl mr-3">{stat.icon}</span>
                <span className="text-sm font-medium text-gray-600 dark:text-gray-400">{stat.label}</span>
              </div>
              <div className={`text-lg font-bold ${stat.color}`}>
                {stat.value}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}