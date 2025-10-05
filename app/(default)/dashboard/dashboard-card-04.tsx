'use client'

import EditMenu from '@/components/edit-menu'
import { useGitHubIssues } from '@/hooks/use-github-analytics'

export default function DashboardCard04() {
  const { issues, loading, error } = useGitHubIssues()

  const totalIssues = issues?.totalIssues || 0
  const openIssues = issues?.openIssues || 0
  const closedIssues = issues?.closedIssues || 0
  const resolutionRate = totalIssues > 0 ? Math.round((closedIssues / totalIssues) * 100) : 0

  // Show error state if there's an error
  if (error) {
    return (
      <div className="flex flex-col col-span-full sm:col-span-6 xl:col-span-4 bg-white dark:bg-gray-800 shadow-sm rounded-xl h-[280px]">
        <div className="px-5 pt-5 flex-shrink-0">
          <header className="flex justify-between items-start mb-2">
            <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-2">GitHub Issues</h2>
          </header>
          <div className="text-sm text-red-600 dark:text-red-400">
            Failed to load issues data
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-gray-500 dark:text-gray-400 text-sm">No chart data available</div>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex flex-col col-span-full sm:col-span-6 xl:col-span-4 bg-white dark:bg-gray-800 shadow-sm rounded-xl h-[280px]">
        <div className="px-5 pt-5 flex-shrink-0">
          <header className="flex justify-between items-start mb-2">
            <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-2">GitHub Issues</h2>
          </header>
          <div className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase mb-1">Loading...</div>
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-24 mb-2"></div>
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-16"></div>
          </div>
        </div>
        <div className="flex-1">
          <div className="animate-pulse">
            <div className="h-20 bg-gray-200 dark:bg-gray-700 rounded"></div>
          </div>
        </div>
      </div>
    )
  }

  return(
    <div className="flex flex-col col-span-full sm:col-span-6 xl:col-span-4 bg-white dark:bg-gray-800 shadow-sm rounded-xl h-[280px]">
      <div className="px-5 pt-5 flex-1 flex flex-col justify-center">
        <header className="flex justify-between items-start mb-4">
          <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">GitHub Issues</h2>
          <EditMenu align="right" />
        </header>
        
        <div className="space-y-4">
          <div className="text-center">
            <div className="text-4xl font-bold text-gray-800 dark:text-gray-100 mb-1">{totalIssues}</div>
            <div className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Issues</div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center">
              <div className="text-xl font-bold text-red-600 dark:text-red-400">{openIssues}</div>
              <div className="text-xs text-gray-600 dark:text-gray-400">Open</div>
            </div>
            <div className="text-center">
              <div className="text-xl font-bold text-green-600 dark:text-green-400">{closedIssues}</div>
              <div className="text-xs text-gray-600 dark:text-gray-400">Closed</div>
            </div>
          </div>
          
          <div className="text-center">
            <div className="text-sm font-semibold text-green-700 dark:text-green-400 px-2 py-1 bg-green-100 dark:bg-green-900/20 rounded-full inline-block">
              {resolutionRate}% resolved
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}