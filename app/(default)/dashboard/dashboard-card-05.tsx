'use client'

import EditMenu from '@/components/edit-menu'
import { useGitHubAnalytics } from '@/hooks/use-github-analytics'
import { Folder, Star, GitFork, Bug } from 'lucide-react'

export default function DashboardCard05() {
  const { stats, loading } = useGitHubAnalytics()

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
      icon: Folder,
      color: 'text-blue-600'
    },
    {
      label: 'Total Stars',
      value: stats?.totalStars?.toLocaleString() || '0',
      icon: Star,
      color: 'text-yellow-600'
    },
    {
      label: 'Total Forks',
      value: stats?.totalForks?.toLocaleString() || '0',
      icon: GitFork,
      color: 'text-green-600'
    },
    {
      label: 'Open Issues',
      value: stats?.totalIssues?.toLocaleString() || '0',
      icon: Bug,
      color: 'text-red-600'
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
          {statsData.map((stat, index) => {
            const IconComponent = stat.icon
            return (
              <div key={index} className="flex items-center justify-between">
                <div className="flex items-center">
                  <IconComponent className={`w-5 h-5 mr-3 ${stat.color}`} />
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-400">{stat.label}</span>
                </div>
                <div className={`text-lg font-bold ${stat.color}`}>
                  {stat.value}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}