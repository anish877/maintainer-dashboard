'use client'

import EditMenu from '@/components/edit-menu'
import LineChart01 from '@/components/charts/line-chart-01'
import { chartAreaGradient } from '@/components/charts/chartjs-config'
import { useAnalytics } from '@/hooks/use-analytics-context'

// Import utilities
import { adjustColorOpacity, getCssVariable } from '@/components/utils/utils'

export default function DashboardCard02() {
  const { stats, loading, error } = useAnalytics()

  // Create a simple line chart showing repository growth over time
  // For now, we'll simulate this data since GitHub doesn't provide historical repo creation data easily
  const chartData = {
    labels: [
      'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
    ],
    datasets: [
      // Repository count line
      {
        data: stats ? [
          Math.max(0, stats.totalRepos - 20),
          Math.max(0, stats.totalRepos - 18),
          Math.max(0, stats.totalRepos - 15),
          Math.max(0, stats.totalRepos - 12),
          Math.max(0, stats.totalRepos - 10),
          Math.max(0, stats.totalRepos - 8),
          Math.max(0, stats.totalRepos - 6),
          Math.max(0, stats.totalRepos - 4),
          Math.max(0, stats.totalRepos - 3),
          Math.max(0, stats.totalRepos - 2),
          Math.max(0, stats.totalRepos - 1),
          stats.totalRepos
        ] : Array(12).fill(0),
        fill: true,
        backgroundColor: function(context: any) {
          const chart = context.chart;
          const {ctx, chartArea} = chart;
          const gradientOrColor = chartAreaGradient(ctx, chartArea, [
            { stop: 0, color: adjustColorOpacity(getCssVariable('--color-sky-500'), 0) },
            { stop: 1, color: adjustColorOpacity(getCssVariable('--color-sky-500'), 0.2) }
          ]);
          return gradientOrColor || 'transparent';
        },   
        borderColor: getCssVariable('--color-sky-500'),
        borderWidth: 2,
        pointRadius: 0,
        pointHoverRadius: 3,
        pointBackgroundColor: getCssVariable('--color-sky-500'),
        pointHoverBackgroundColor: getCssVariable('--color-sky-500'),
        pointBorderWidth: 0,
        pointHoverBorderWidth: 0,
        clip: 20,
        tension: 0.2,
      },
    ],
  }

  // Calculate growth trend
  const publicRepos = stats?.publicRepos || 0
  const privateRepos = stats?.privateRepos || 0
  const totalRepos = stats?.totalRepos || 0

  // Show error state if there's an error
  if (error) {
    return (
      <div className="flex flex-col col-span-full sm:col-span-6 xl:col-span-4 bg-white dark:bg-gray-800 shadow-sm rounded-xl">
        <div className="px-5 pt-5">
          <header className="flex justify-between items-start mb-2">
            <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-2">Repositories</h2>
          </header>
          <div className="text-sm text-red-600 dark:text-red-400">
            Failed to load repository data
          </div>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex flex-col col-span-full sm:col-span-6 xl:col-span-4 bg-white dark:bg-gray-800 shadow-sm rounded-xl">
        <div className="px-5 pt-5">
          <header className="flex justify-between items-start mb-2">
            <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-2">Repositories</h2>
          </header>
          <div className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase mb-1">Loading...</div>
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-24 mb-2"></div>
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-16"></div>
          </div>
        </div>
        <div className="grow max-sm:max-h-[128px] xl:max-h-[128px] flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sky-500"></div>
        </div>
      </div>
    )
  }

  return(
    <div className="flex flex-col col-span-full sm:col-span-6 xl:col-span-4 bg-white dark:bg-gray-800 shadow-sm rounded-xl">
      <div className="px-5 pt-5">
        <header className="flex justify-between items-start mb-2">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-2">Repositories</h2>
          {/* Menu button */}
          <EditMenu align="right" />
        </header>
        <div className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase mb-1">Total Repositories</div>
        <div className="flex items-start">
          <div className="text-3xl font-bold text-gray-800 dark:text-gray-100 mr-2">{totalRepos}</div>
          <div className="text-sm font-medium text-blue-700 px-1.5 bg-blue-500/20 rounded-full">
            {publicRepos} public
          </div>
        </div>
        <div className="mt-2 text-sm text-gray-600 dark:text-gray-400">
          {privateRepos} private repositories
        </div>
      </div>
      {/* Chart built with Chart.js 3 */}
      <div className="grow max-sm:max-h-[128px] xl:max-h-[128px]">
        {/* Change the height attribute to adjust the chart height */}
        <LineChart01 data={chartData} width={389} height={128} />
      </div>
    </div>
  )
}