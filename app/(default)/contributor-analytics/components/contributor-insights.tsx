'use client'

interface Insight {
  id: string
  type: string
  title: string
  description: string
  severity: string
  confidence: number
  contributor: string
  createdAt: string
}

interface ContributorInsightsProps {
  insights: Insight[]
  repository: {
    id: string
    fullName: string
    owner: string
    name: string
  }
  timeRange: string
}

export function ContributorInsights({ insights, repository, timeRange }: ContributorInsightsProps) {
  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'SUCCESS':
        return '✅'
      case 'WARNING':
        return '⚠️'
      case 'CRITICAL':
        return '🚨'
      case 'INFO':
      default:
        return 'ℹ️'
    }
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'SUCCESS':
        return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400 border-green-200 dark:border-green-800'
      case 'WARNING':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800'
      case 'CRITICAL':
        return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400 border-red-200 dark:border-red-800'
      case 'INFO':
      default:
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400 border-blue-200 dark:border-blue-800'
    }
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'RISING_STAR':
        return '🌟'
      case 'AT_RISK':
        return '⚠️'
      case 'BURNOUT_WARNING':
        return '🔥'
      case 'HIGH_PERFORMER':
        return '🏆'
      case 'FIRST_TIME_CONTRIBUTOR':
        return '🎉'
      case 'DIVERSITY_INSIGHT':
        return '🌍'
      case 'ACTIVITY_SPIKE':
        return '📈'
      case 'ACTIVITY_DECLINE':
        return '📉'
      case 'QUALITY_IMPROVEMENT':
        return '✨'
      case 'COLLABORATION_STRONG':
        return '🤝'
      default:
        return '💡'
    }
  }

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'RISING_STAR':
        return 'Rising Star'
      case 'AT_RISK':
        return 'At Risk'
      case 'BURNOUT_WARNING':
        return 'Burnout Warning'
      case 'HIGH_PERFORMER':
        return 'High Performer'
      case 'FIRST_TIME_CONTRIBUTOR':
        return 'First-time Contributor'
      case 'DIVERSITY_INSIGHT':
        return 'Diversity Insight'
      case 'ACTIVITY_SPIKE':
        return 'Activity Spike'
      case 'ACTIVITY_DECLINE':
        return 'Activity Decline'
      case 'QUALITY_IMPROVEMENT':
        return 'Quality Improvement'
      case 'COLLABORATION_STRONG':
        return 'Strong Collaboration'
      default:
        return 'General Insight'
    }
  }

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 80) return 'text-green-600 dark:text-green-400'
    if (confidence >= 60) return 'text-yellow-600 dark:text-yellow-400'
    return 'text-red-600 dark:text-red-400'
  }

  const getConfidenceBgColor = (confidence: number) => {
    if (confidence >= 80) return 'bg-green-100 dark:bg-green-900/20'
    if (confidence >= 60) return 'bg-yellow-100 dark:bg-yellow-900/20'
    return 'bg-red-100 dark:bg-red-900/20'
  }

  // Group insights by type
  const groupedInsights = insights.reduce((acc, insight) => {
    if (!acc[insight.type]) {
      acc[insight.type] = []
    }
    acc[insight.type].push(insight)
    return acc
  }, {} as Record<string, Insight[]>)

  // Sort insights by severity and confidence
  const sortedInsights = insights.sort((a, b) => {
    const severityOrder = { CRITICAL: 0, WARNING: 1, INFO: 2, SUCCESS: 3 }
    const aSeverity = severityOrder[a.severity as keyof typeof severityOrder] ?? 2
    const bSeverity = severityOrder[b.severity as keyof typeof severityOrder] ?? 2
    
    if (aSeverity !== bSeverity) {
      return aSeverity - bSeverity
    }
    
    return b.confidence - a.confidence
  })

  return (
    <div className="space-y-6">
      {/* Insights Summary */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Insights Summary</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="text-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">{insights.length}</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Total Insights</div>
          </div>
          <div className="text-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <div className="text-2xl font-bold text-red-600 dark:text-red-400">
              {insights.filter(i => i.severity === 'CRITICAL').length}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Critical</div>
          </div>
          <div className="text-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
              {insights.filter(i => i.severity === 'WARNING').length}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Warnings</div>
          </div>
          <div className="text-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">
              {insights.filter(i => i.severity === 'SUCCESS').length}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Success</div>
          </div>
        </div>
      </div>

      {/* Insights by Type */}
      {Object.keys(groupedInsights).length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Insights by Type</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.entries(groupedInsights).map(([type, typeInsights]) => (
              <div key={type} className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div className="flex items-center space-x-2 mb-2">
                  <span className="text-lg">{getTypeIcon(type)}</span>
                  <span className="font-medium text-gray-900 dark:text-gray-100">
                    {getTypeLabel(type)}
                  </span>
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  {typeInsights.length} insight{typeInsights.length !== 1 ? 's' : ''}
                </div>
                <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                  Avg confidence: {Math.round(typeInsights.reduce((sum, i) => sum + i.confidence, 0) / typeInsights.length)}%
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Individual Insights */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Recent Insights</h3>
        {sortedInsights.map((insight) => (
          <div
            key={insight.id}
            className={`bg-white dark:bg-gray-800 rounded-xl border p-6 ${getSeverityColor(insight.severity)}`}
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center space-x-3">
                <span className="text-2xl">{getSeverityIcon(insight.severity)}</span>
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="text-lg">{getTypeIcon(insight.type)}</span>
                    <h4 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                      {insight.title}
                    </h4>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    {getTypeLabel(insight.type)} • {insight.contributor}
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getSeverityColor(insight.severity)}`}>
                  {insight.severity}
                </span>
                <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getConfidenceBgColor(insight.confidence)} ${getConfidenceColor(insight.confidence)}`}>
                  {insight.confidence}% confidence
                </div>
              </div>
            </div>
            
            <p className="text-gray-700 dark:text-gray-300 mb-4">
              {insight.description}
            </p>
            
            <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
              <span>
                Generated {new Date(insight.createdAt).toLocaleDateString()}
              </span>
              <span>
                Repository: {repository.fullName}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Empty State */}
      {insights.length === 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-12 text-center">
          <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
            No insights available
          </h3>
          <p className="text-gray-600 dark:text-gray-400">
            Run contributor analysis to generate AI-powered insights about your contributors.
          </p>
        </div>
      )}
    </div>
  )
}
