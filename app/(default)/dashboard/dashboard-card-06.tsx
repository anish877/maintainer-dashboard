'use client'

import DoughnutChart from '@/components/charts/doughnut-chart'
import { useGitHubAnalytics } from '@/hooks/use-github-analytics'

// Import utilities
import { getCssVariable } from '@/components/utils/utils'

const colors = [
  '--color-violet-500',
  '--color-sky-500', 
  '--color-emerald-500',
  '--color-amber-500',
  '--color-rose-500',
  '--color-indigo-500',
  '--color-pink-500',
  '--color-teal-500',
  '--color-orange-500',
  '--color-cyan-500'
]

export default function DashboardCard06() {
  const { stats, loading, error } = useGitHubAnalytics()

  // Transform language data for the chart
  const languageEntries = stats ? Object.entries(stats.languages).slice(0, 10) : []
  const otherCount = stats ? Object.entries(stats.languages).slice(10).reduce((sum, [, count]) => sum + count, 0) : 0

  const chartData = {
    labels: [
      ...languageEntries.map(([lang]) => lang),
      ...(otherCount > 0 ? ['Other'] : [])
    ],
    datasets: [
      {
        label: 'Programming Languages',
        data: [
          ...languageEntries.map(([, count]) => count),
          ...(otherCount > 0 ? [otherCount] : [])
        ],
        backgroundColor: [
          ...languageEntries.map((_, index) => getCssVariable(colors[index % colors.length])),
          ...(otherCount > 0 ? [getCssVariable('--color-gray-500')] : [])
        ],
        hoverBackgroundColor: [
          ...languageEntries.map((_, index) => getCssVariable(colors[index % colors.length].replace('500', '600'))),
          ...(otherCount > 0 ? [getCssVariable('--color-gray-600')] : [])
        ],
        borderWidth: 0,
      },
    ],
  }

  // Show error state if there's an error
  if (error) {
    return (
      <div className="flex flex-col col-span-full sm:col-span-6 xl:col-span-4 bg-white dark:bg-gray-800 shadow-sm rounded-xl">
        <div className="px-5 pt-5">
          <header className="flex justify-between items-start mb-2">
            <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-2">Programming Languages</h2>
          </header>
          <div className="text-sm text-red-600 dark:text-red-400">
            Failed to load language data
          </div>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex flex-col col-span-full sm:col-span-6 xl:col-span-4 bg-white dark:bg-gray-800 shadow-sm rounded-xl">
        <header className="px-5 py-4 border-b border-gray-100 dark:border-gray-700/60">
          <h2 className="font-semibold text-gray-800 dark:text-gray-100">Programming Languages</h2>
        </header>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-500"></div>
        </div>
      </div>
    )
  }

  return(
    <div className="flex flex-col col-span-full sm:col-span-6 xl:col-span-4 bg-white dark:bg-gray-800 shadow-sm rounded-xl">
      <header className="px-5 py-4 border-b border-gray-100 dark:border-gray-700/60">
        <h2 className="font-semibold text-gray-800 dark:text-gray-100">Programming Languages</h2>
      </header>
      {/* Chart built with Chart.js 3 */}
      {/* Change the height attribute to adjust the chart height */}
      <DoughnutChart data={chartData} width={389} height={260} />
    </div>
  )
}
