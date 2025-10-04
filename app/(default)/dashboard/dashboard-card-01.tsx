'use client'

import EditMenu from '@/components/edit-menu'
import LineChart01 from '@/components/charts/line-chart-01'
import { chartAreaGradient } from '@/components/charts/chartjs-config'
import { useGitHubCommits } from '@/hooks/use-github-analytics'

// Import utilities
import { adjustColorOpacity, getCssVariable } from '@/components/utils/utils'

export default function DashboardCard01() {
  const { commits, loading, error } = useGitHubCommits(undefined, 5)

  // Transform commit data for the chart
  const chartData = {
    labels: commits.map(commit => {
      const date = new Date(commit.date)
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    }),
    datasets: [
      // Commits line
      {
        data: commits.map(commit => commit.commits),
        fill: true,
        backgroundColor: function(context: any) {
          const chart = context.chart;
          const {ctx, chartArea} = chart;
          const gradientOrColor = chartAreaGradient(ctx, chartArea, [
            { stop: 0, color: adjustColorOpacity(getCssVariable('--color-violet-500'), 0) },
            { stop: 1, color: adjustColorOpacity(getCssVariable('--color-violet-500'), 0.2) }
          ]);
          return gradientOrColor || 'transparent';
        },   
        borderColor: getCssVariable('--color-violet-500'),
        borderWidth: 2,
        pointRadius: 0,
        pointHoverRadius: 3,
        pointBackgroundColor: getCssVariable('--color-violet-500'),
        pointHoverBackgroundColor: getCssVariable('--color-violet-500'),
        pointBorderWidth: 0,
        pointHoverBorderWidth: 0,
        clip: 20,
        tension: 0.2,
      },
    ],
  }

  // Calculate total commits and trend
  const totalCommits = commits.reduce((sum, commit) => sum + commit.commits, 0)
  const lastWeekCommits = commits.slice(-7).reduce((sum, commit) => sum + commit.commits, 0)
  const previousWeekCommits = commits.slice(-14, -7).reduce((sum, commit) => sum + commit.commits, 0)
  const trendPercentage = previousWeekCommits > 0 ? Math.round(((lastWeekCommits - previousWeekCommits) / previousWeekCommits) * 100) : 0

  // Show error state if there's an error
  if (error) {
    return (
      <div className="flex flex-col col-span-full sm:col-span-6 xl:col-span-4 bg-white dark:bg-gray-800 shadow-sm rounded-xl">
        <div className="px-5 pt-5">
          <header className="flex justify-between items-start mb-2">
            <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-2">Commits Activity</h2>
          </header>
          <div className="text-sm text-red-600 dark:text-red-400">
            Failed to load commits data
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
            <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-2">Commits Activity</h2>
          </header>
          <div className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase mb-1">Loading...</div>
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-24 mb-2"></div>
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-16"></div>
          </div>
        </div>
        <div className="grow max-sm:max-h-[128px] xl:max-h-[128px] flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-500"></div>
        </div>
      </div>
    )
  }

  return(
    <div className="flex flex-col col-span-full sm:col-span-6 xl:col-span-4 bg-white dark:bg-gray-800 shadow-sm rounded-xl">
      <div className="px-5 pt-5">
        <header className="flex justify-between items-start mb-2">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-2">Commits Activity</h2>
          {/* Menu button */}
          <EditMenu align="right" />
        </header>
        <div className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase mb-1">Last 5 Days</div>
        <div className="flex items-start">
          <div className="text-3xl font-bold text-gray-800 dark:text-gray-100 mr-2">{totalCommits}</div>
          <div className={`text-sm font-medium px-1.5 rounded-full ${
            trendPercentage >= 0 
              ? 'text-green-700 bg-green-500/20' 
              : 'text-red-700 bg-red-500/20'
          }`}>
            {trendPercentage >= 0 ? '+' : ''}{trendPercentage}%
          </div>
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
