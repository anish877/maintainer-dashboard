'use client'

import { useContributorDetails } from '@/hooks/use-contributor-analytics'

interface ContributorDetailsProps {
  contributorId: string
  repository: {
    id: string
    fullName: string
    owner: string
    name: string
  }
  timeRange: string
  onClose: () => void
}

export function ContributorDetails({ contributorId, repository, timeRange, onClose }: ContributorDetailsProps) {
  const { contributor, loading, error } = useContributorDetails(contributorId, timeRange)

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-8 max-w-md w-full mx-4">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
            <span className="ml-3 text-gray-600 dark:text-gray-400">Loading contributor details...</span>
          </div>
        </div>
      </div>
    )
  }

  if (error || !contributor) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-8 max-w-md w-full mx-4">
          <div className="text-center">
            <div className="w-12 h-12 bg-red-100 dark:bg-red-900/20 rounded-xl flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
              Error Loading Details
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              {error || 'Failed to load contributor details'}
            </p>
            <button
              onClick={onClose}
              className="btn bg-gray-500 hover:bg-gray-600 text-white"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-full flex items-center justify-center text-white font-bold text-lg">
                {contributor.username.charAt(0).toUpperCase()}
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                  {contributor.username}
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {contributor.repository.fullName}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-8">
          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {contributor.totalContributions}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Total Contributions</div>
            </div>
            <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {contributor.retentionScore.toFixed(0)}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Retention Score</div>
            </div>
            <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {contributor.engagementScore.toFixed(0)}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Engagement Score</div>
            </div>
            <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {contributor.contributionStreak}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Week Streak</div>
            </div>
          </div>

          {/* Health Status */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Health Status</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Retention Score</span>
                    <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                      {contributor.retentionScore.toFixed(1)}/100
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div 
                      className="bg-gradient-to-r from-blue-500 to-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${Math.min(100, contributor.retentionScore)}%` }}
                    ></div>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Engagement Score</span>
                    <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                      {contributor.engagementScore.toFixed(1)}/100
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div 
                      className="bg-gradient-to-r from-green-500 to-green-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${Math.min(100, contributor.engagementScore)}%` }}
                    ></div>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Burnout Risk</span>
                    <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                      {contributor.burnoutRisk.toFixed(1)}/100
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div 
                      className="bg-gradient-to-r from-red-500 to-red-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${Math.min(100, contributor.burnoutRisk)}%` }}
                    ></div>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">First Contribution</span>
                  <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                    {contributor.firstContributionAt 
                      ? new Date(contributor.firstContributionAt).toLocaleDateString()
                      : 'Unknown'
                    }
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Last Contribution</span>
                  <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                    {contributor.lastContributionAt 
                      ? new Date(contributor.lastContributionAt).toLocaleDateString()
                      : 'Unknown'
                    }
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Location</span>
                  <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                    {contributor.location || 'Unknown'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Timezone</span>
                  <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                    {contributor.timezone || 'Unknown'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Recent Activity */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Recent Issues */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Recent Issues</h3>
              <div className="space-y-3">
                {contributor.recentActivity.issues.slice(0, 5).map((issue) => (
                  <div key={issue.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <div className="flex-1">
                      <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        #{issue.number} {issue.title}
                      </div>
                      <div className="text-xs text-gray-600 dark:text-gray-400">
                        {issue.state} • {new Date(issue.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                    <div className="flex space-x-1">
                      {issue.labels.slice(0, 2).map((label) => (
                        <span key={label} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-200 text-gray-800 dark:bg-gray-600 dark:text-gray-200">
                          {label}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
                {contributor.recentActivity.issues.length === 0 && (
                  <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                    No recent issues found
                  </div>
                )}
              </div>
            </div>

            {/* Recent Pull Requests */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Recent Pull Requests</h3>
              <div className="space-y-3">
                {contributor.recentActivity.pullRequests.slice(0, 5).map((pr) => (
                  <div key={pr.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <div className="flex-1">
                      <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        #{pr.number} {pr.title}
                      </div>
                      <div className="text-xs text-gray-600 dark:text-gray-400">
                        {pr.state} • +{pr.additions}/-{pr.deletions} • {new Date(pr.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                    {pr.mergedAt && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400">
                        Merged
                      </span>
                    )}
                  </div>
                ))}
                {contributor.recentActivity.pullRequests.length === 0 && (
                  <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                    No recent pull requests found
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Insights */}
          {contributor.insights.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">AI Insights</h3>
              <div className="space-y-3">
                {contributor.insights.map((insight) => (
                  <div key={insight.id} className="flex items-start space-x-3 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <div className={`w-2 h-2 rounded-full mt-2 ${
                      insight.severity === 'SUCCESS' ? 'bg-green-500' :
                      insight.severity === 'WARNING' ? 'bg-yellow-500' :
                      insight.severity === 'CRITICAL' ? 'bg-red-500' : 'bg-blue-500'
                    }`}></div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                          {insight.title}
                        </h4>
                        <span className={`text-xs px-2 py-1 rounded ${
                          insight.severity === 'SUCCESS' ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400' :
                          insight.severity === 'WARNING' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400' :
                          insight.severity === 'CRITICAL' ? 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400' : 
                          'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400'
                        }`}>
                          {insight.severity}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {insight.description}
                      </p>
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        Confidence: {insight.confidence}% • {new Date(insight.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
