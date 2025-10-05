'use client'

import EditMenu from '@/components/edit-menu'
import BarChart01 from '@/components/charts/bar-chart-01'
import { useGitHubIssues } from '@/hooks/use-github-analytics'

// Import utilities
import { getCssVariable } from '@/components/utils/utils'

export default function DashboardCard04() {
  const { issues, loading, error } = useGitHubIssues()

  // Transform issues data for the chart
  const chartData = {
    labels: ['Open Issues', 'Closed Issues'],
    datasets: [
      {
        label: 'Issues',
        data: [
          issues?.openIssues || 0,
          issues?.closedIssues || 0,
        ],
        backgroundColor: [
          getCssVariable('--color-rose-500'),
          getCssVariable('--color-emerald-500'),
        ],
        hoverBackgroundColor: [
          getCssVariable('--color-rose-600'),
          getCssVariable('--color-emerald-600'),
        ],
        borderWidth: 0,
      },
    ],
  }

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
      <div className="px-5 pt-5 flex-shrink-0">
        <header className="flex justify-between items-start mb-2">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-2">GitHub Issues</h2>
          {/* Menu button */}
          <EditMenu align="right" />
        </header>
        <div className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase mb-1">Issue Status</div>
        <div className="flex items-start">
          <div className="text-3xl font-bold text-gray-800 dark:text-gray-100 mr-2">{totalIssues}</div>
          <div className="text-sm font-medium text-green-700 px-1.5 bg-green-500/20 rounded-full">
            {resolutionRate}% resolved
          </div>
        </div>
      </div>
      {/* Chart built with Chart.js 3 */}
      <div className="flex-1 overflow-hidden">
        <div className="h-full w-full">
          <BarChart01 data={chartData} width={389} height={120} />
        </div>
      </div>
    </div>
  )
}