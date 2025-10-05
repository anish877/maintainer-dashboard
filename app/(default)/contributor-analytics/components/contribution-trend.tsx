'use client'

import { useState } from 'react'

interface TrendData {
  date: string
  total: number
  issues: number
  prs: number
  commits: number
}

interface ContributionTrendProps {
  trend: TrendData[]
  repository: {
    id: string
    fullName: string
    owner: string
    name: string
  }
  timeRange: string
}

export function ContributionTrend({ trend, repository, timeRange }: ContributionTrendProps) {
  const [selectedMetric, setSelectedMetric] = useState<'total' | 'issues' | 'prs' | 'commits'>('total')

  // Calculate summary statistics
  const totalContributions = trend.reduce((sum, day) => sum + day.total, 0)
  const totalIssues = trend.reduce((sum, day) => sum + day.issues, 0)
  const totalPRs = trend.reduce((sum, day) => sum + day.prs, 0)
  const totalCommits = trend.reduce((sum, day) => sum + day.commits, 0)
  const avgDailyContributions = trend.length > 0 ? totalContributions / trend.length : 0

  // Find peak days
  const peakDay = trend.reduce((max, day) => day.total > max.total ? day : max, trend[0])
  const mostActiveDay = trend.reduce((max, day) => day.total > max.total ? day : max, trend[0])

  // Calculate growth rate (comparing first half to second half)
  const midPoint = Math.floor(trend.length / 2)
  const firstHalf = trend.slice(0, midPoint)
  const secondHalf = trend.slice(midPoint)
  const firstHalfAvg = firstHalf.length > 0 ? firstHalf.reduce((sum, day) => sum + day.total, 0) / firstHalf.length : 0
  const secondHalfAvg = secondHalf.length > 0 ? secondHalf.reduce((sum, day) => sum + day.total, 0) / secondHalf.length : 0
  const growthRate = firstHalfAvg > 0 ? ((secondHalfAvg - firstHalfAvg) / firstHalfAvg) * 100 : 0

  const getMetricLabel = (metric: string) => {
    switch (metric) {
      case 'total': return 'Total Contributions'
      case 'issues': return 'Issues Created'
      case 'prs': return 'Pull Requests'
      case 'commits': return 'Commits'
      default: return 'Contributions'
    }
  }

  const getMetricColor = (metric: string) => {
    switch (metric) {
      case 'total': return 'from-emerald-500 to-teal-600'
      case 'issues': return 'from-blue-500 to-blue-600'
      case 'prs': return 'from-purple-500 to-purple-600'
      case 'commits': return 'from-green-500 to-green-600'
      default: return 'from-gray-500 to-gray-600'
    }
  }

  const getMetricIcon = (metric: string) => {
    switch (metric) {
      case 'total': return '📊'
      case 'issues': return '🐛'
      case 'prs': return '🔀'
      case 'commits': return '💻'
      default: return '📈'
    }
  }

  // Find max value for scaling
  const maxValue = Math.max(...trend.map(day => day[selectedMetric]))

  return (
    <div className="space-y-6">
      {/* Summary Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Contributions</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{totalContributions}</p>
            </div>
            <div className="w-10 h-10 bg-emerald-100 dark:bg-emerald-900/20 rounded-xl flex items-center justify-center">
              <span className="text-lg">📊</span>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Daily Average</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{avgDailyContributions.toFixed(1)}</p>
            </div>
            <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/20 rounded-xl flex items-center justify-center">
              <span className="text-lg">📈</span>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Peak Day</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{peakDay?.total || 0}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {peakDay ? new Date(peakDay.date).toLocaleDateString() : 'N/A'}
              </p>
            </div>
            <div className="w-10 h-10 bg-yellow-100 dark:bg-yellow-900/20 rounded-xl flex items-center justify-center">
              <span className="text-lg">🔥</span>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Growth Rate</p>
              <p className={`text-2xl font-bold ${growthRate >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                {growthRate >= 0 ? '+' : ''}{growthRate.toFixed(1)}%
              </p>
            </div>
            <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/20 rounded-xl flex items-center justify-center">
              <span className="text-lg">{growthRate >= 0 ? '📈' : '📉'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Metric Selector */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Contribution Trends</h3>
        <div className="flex flex-wrap gap-2 mb-6">
          {(['total', 'issues', 'prs', 'commits'] as const).map((metric) => (
            <button
              key={metric}
              onClick={() => setSelectedMetric(metric)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                selectedMetric === metric
                  ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400'
                  : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              <span className="mr-2">{getMetricIcon(metric)}</span>
              {getMetricLabel(metric)}
            </button>
          ))}
        </div>

        {/* Trend Chart */}
        <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-md font-semibold text-gray-900 dark:text-gray-100">
              {getMetricLabel(selectedMetric)} Over Time
            </h4>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              {timeRange} period
            </div>
          </div>

          {/* Simple Bar Chart */}
          <div className="space-y-2">
            {trend.slice(-14).map((day, index) => {
              const value = day[selectedMetric]
              const percentage = maxValue > 0 ? (value / maxValue) * 100 : 0
              const isToday = index === trend.slice(-14).length - 1
              
              return (
                <div key={day.date} className="flex items-center space-x-3">
                  <div className="w-16 text-xs text-gray-600 dark:text-gray-400 text-right">
                    {new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </div>
                  <div className="flex-1 bg-gray-200 dark:bg-gray-600 rounded-full h-6 relative">
                    <div
                      className={`h-6 rounded-full bg-gradient-to-r ${getMetricColor(selectedMetric)} transition-all duration-500 ${
                        isToday ? 'ring-2 ring-emerald-300 dark:ring-emerald-600' : ''
                      }`}
                      style={{ width: `${percentage}%` }}
                    >
                      {value > 0 && (
                        <div className="flex items-center justify-end h-full pr-2">
                          <span className="text-xs font-medium text-white">
                            {value}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                  {isToday && (
                    <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                      Today
                    </span>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Breakdown by Type */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Contribution Breakdown</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <div className="text-2xl mb-2">🐛</div>
            <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">{totalIssues}</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Issues Created</div>
            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {totalContributions > 0 ? Math.round((totalIssues / totalContributions) * 100) : 0}% of total
            </div>
          </div>

          <div className="text-center p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
            <div className="text-2xl mb-2">🔀</div>
            <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">{totalPRs}</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Pull Requests</div>
            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {totalContributions > 0 ? Math.round((totalPRs / totalContributions) * 100) : 0}% of total
            </div>
          </div>

          <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
            <div className="text-2xl mb-2">💻</div>
            <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">{totalCommits}</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Commits</div>
            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {totalContributions > 0 ? Math.round((totalCommits / totalContributions) * 100) : 0}% of total
            </div>
          </div>
        </div>
      </div>

      {/* Empty State */}
      {trend.length === 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-12 text-center">
          <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
            No trend data available
          </h3>
          <p className="text-gray-600 dark:text-gray-400">
            Run contributor analysis to generate contribution trend data.
          </p>
        </div>
      )}
    </div>
  )
}
