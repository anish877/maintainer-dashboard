'use client'

interface ContributorMetricsProps {
  metrics: {
    totalContributors: number
    firstTimeContributors: number
    atRiskContributors: number
    risingStars: number
    avgRetentionScore: number
    avgEngagementScore: number
    diversity: {
      countries: number
      timezones: number
      geographicDistribution: string[]
    }
  }
  healthDistribution: {
    excellent: number
    good: number
    fair: number
    poor: number
  }
  repository: {
    id: string
    fullName: string
    owner: string
    name: string
  }
  timeRange: string
}

export function ContributorMetrics({ metrics, healthDistribution, repository, timeRange }: ContributorMetricsProps) {
  const totalContributors = metrics.totalContributors
  const healthDistributionTotal = healthDistribution.excellent + healthDistribution.good + healthDistribution.fair + healthDistribution.poor

  return (
    <div className="space-y-8">
      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Contributors */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Contributors</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">{totalContributors}</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/20 rounded-xl flex items-center justify-center">
              <svg className="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
          </div>
        </div>

        {/* First-time Contributors */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">First-time Contributors</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">{metrics.firstTimeContributors}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                {totalContributors > 0 ? Math.round((metrics.firstTimeContributors / totalContributors) * 100) : 0}% of total
              </p>
            </div>
            <div className="w-12 h-12 bg-green-100 dark:bg-green-900/20 rounded-xl flex items-center justify-center">
              <svg className="w-6 h-6 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
          </div>
        </div>

        {/* At-risk Contributors */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">At-risk Contributors</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">{metrics.atRiskContributors}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                {totalContributors > 0 ? Math.round((metrics.atRiskContributors / totalContributors) * 100) : 0}% of total
              </p>
            </div>
            <div className="w-12 h-12 bg-orange-100 dark:bg-orange-900/20 rounded-xl flex items-center justify-center">
              <svg className="w-6 h-6 text-orange-600 dark:text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
          </div>
        </div>

        {/* Rising Stars */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Rising Stars</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">{metrics.risingStars}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                {totalContributors > 0 ? Math.round((metrics.risingStars / totalContributors) * 100) : 0}% of total
              </p>
            </div>
            <div className="w-12 h-12 bg-yellow-100 dark:bg-yellow-900/20 rounded-xl flex items-center justify-center">
              <svg className="w-6 h-6 text-yellow-600 dark:text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Health Scores */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Average Scores */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-6">Average Health Scores</h3>
          <div className="space-y-4">
            {/* Retention Score */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Retention Score</span>
                <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">{metrics.avgRetentionScore.toFixed(1)}</span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div 
                  className="bg-gradient-to-r from-blue-500 to-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${Math.min(100, metrics.avgRetentionScore)}%` }}
                ></div>
              </div>
            </div>

            {/* Engagement Score */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Engagement Score</span>
                <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">{metrics.avgEngagementScore.toFixed(1)}</span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div 
                  className="bg-gradient-to-r from-green-500 to-green-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${Math.min(100, metrics.avgEngagementScore)}%` }}
                ></div>
              </div>
            </div>
          </div>
        </div>

        {/* Health Distribution */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-6">Health Distribution</h3>
          <div className="space-y-4">
            {/* Excellent */}
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="w-3 h-3 bg-green-500 rounded-full mr-3"></div>
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Excellent</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">{healthDistribution.excellent}</span>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  ({healthDistributionTotal > 0 ? Math.round((healthDistribution.excellent / healthDistributionTotal) * 100) : 0}%)
                </span>
              </div>
            </div>

            {/* Good */}
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="w-3 h-3 bg-blue-500 rounded-full mr-3"></div>
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Good</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">{healthDistribution.good}</span>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  ({healthDistributionTotal > 0 ? Math.round((healthDistribution.good / healthDistributionTotal) * 100) : 0}%)
                </span>
              </div>
            </div>

            {/* Fair */}
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="w-3 h-3 bg-yellow-500 rounded-full mr-3"></div>
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Fair</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">{healthDistribution.fair}</span>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  ({healthDistributionTotal > 0 ? Math.round((healthDistribution.fair / healthDistributionTotal) * 100) : 0}%)
                </span>
              </div>
            </div>

            {/* Poor */}
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="w-3 h-3 bg-red-500 rounded-full mr-3"></div>
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Poor</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">{healthDistribution.poor}</span>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  ({healthDistributionTotal > 0 ? Math.round((healthDistribution.poor / healthDistributionTotal) * 100) : 0}%)
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Diversity Metrics */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-6">Diversity Metrics</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Geographic Distribution */}
          <div className="text-center">
            <div className="w-16 h-16 bg-purple-100 dark:bg-purple-900/20 rounded-xl flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h4 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{metrics.diversity.countries}</h4>
            <p className="text-sm text-gray-600 dark:text-gray-400">Countries Represented</p>
            {metrics.diversity.geographicDistribution.length > 0 && (
              <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                {metrics.diversity.geographicDistribution.slice(0, 3).join(', ')}
                {metrics.diversity.geographicDistribution.length > 3 && ` +${metrics.diversity.geographicDistribution.length - 3} more`}
              </div>
            )}
          </div>

          {/* Time Zones */}
          <div className="text-center">
            <div className="w-16 h-16 bg-indigo-100 dark:bg-indigo-900/20 rounded-xl flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h4 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{metrics.diversity.timezones}</h4>
            <p className="text-sm text-gray-600 dark:text-gray-400">Time Zones</p>
          </div>

          {/* Time Range */}
          <div className="text-center">
            <div className="w-16 h-16 bg-teal-100 dark:bg-teal-900/20 rounded-xl flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-teal-600 dark:text-teal-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <h4 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{timeRange}</h4>
            <p className="text-sm text-gray-600 dark:text-gray-400">Analysis Period</p>
          </div>
        </div>
      </div>
    </div>
  )
}
