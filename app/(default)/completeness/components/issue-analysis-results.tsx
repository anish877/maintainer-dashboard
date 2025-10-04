'use client'

import { useState } from 'react'

interface AnalysisResult {
  issueNumber: number
  title: string
  url: string
  author: string
  createdAt: string
  updatedAt: string
  labels: string[]
  completeness: any
  qualityScore: number
  isComplete: boolean
  missingElements: string[]
  suggestions: string[]
}

interface Repository {
  owner: string
  repo: string
  fullName: string
}

interface ResultsProps {
  results: AnalysisResult[]
  repository: Repository
  onRequestComment: (issueNumber: number, templateId?: string) => void
}

export function IssueAnalysisResults({ results, repository, onRequestComment }: ResultsProps) {
  const [filter, setFilter] = useState<'all' | 'complete' | 'incomplete'>('all')
  const [sortBy, setSortBy] = useState<'score' | 'number' | 'title' | 'date'>('score')
  const [selectedIssue, setSelectedIssue] = useState<AnalysisResult | null>(null)

  const filteredResults = results.filter(result => {
    if (filter === 'complete') return result.isComplete
    if (filter === 'incomplete') return !result.isComplete
    return true
  })

  const sortedResults = [...filteredResults].sort((a, b) => {
    switch (sortBy) {
      case 'score':
        return b.qualityScore - a.qualityScore
      case 'number':
        return b.issueNumber - a.issueNumber
      case 'title':
        return a.title.localeCompare(b.title)
      case 'date':
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      default:
        return 0
    }
  })

  return (
    <div className="space-y-6">
      {/* Results Header */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                Issue Analysis Results
              </h2>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                {filteredResults.length} issues analyzed in {repository.fullName}
              </p>
            </div>
            
            <div className="flex gap-4">
              {/* Filter */}
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value as any)}
                className="form-input"
              >
                <option value="all">All Issues ({results.length})</option>
                <option value="complete">Complete Only ({results.filter(r => r.isComplete).length})</option>
                <option value="incomplete">Incomplete Only ({results.filter(r => !r.isComplete).length})</option>
              </select>

              {/* Sort */}
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="form-input"
              >
                <option value="score">Sort by Score</option>
                <option value="number">Sort by Number</option>
                <option value="title">Sort by Title</option>
                <option value="date">Sort by Date</option>
              </select>
            </div>
          </div>
        </div>

        {/* Results List */}
        <div className="divide-y divide-gray-200 dark:divide-gray-700">
          {sortedResults.map((result) => (
            <IssueAnalysisCard
              key={result.issueNumber}
              result={result}
              onSelect={() => setSelectedIssue(result)}
              onRequestComment={onRequestComment}
              isSelected={selectedIssue?.issueNumber === result.issueNumber}
            />
          ))}
        </div>

        {sortedResults.length === 0 && (
          <div className="p-8 text-center">
            <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
              No issues found
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              No issues match the current filter criteria.
            </p>
          </div>
        )}
      </div>

      {/* Issue Detail Modal */}
      {selectedIssue && (
        <IssueDetailModal
          issue={selectedIssue}
          onClose={() => setSelectedIssue(null)}
          onRequestComment={onRequestComment}
        />
      )}
    </div>
  )
}

function IssueAnalysisCard({ 
  result, 
  onSelect, 
  onRequestComment,
  isSelected 
}: { 
  result: AnalysisResult
  onSelect: () => void
  onRequestComment: (issueNumber: number, templateId?: string) => void
  isSelected: boolean 
}) {
  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600 dark:text-green-400'
    if (score >= 60) return 'text-yellow-600 dark:text-yellow-400'
    if (score >= 40) return 'text-orange-600 dark:text-orange-400'
    return 'text-red-600 dark:text-red-400'
  }

  const getScoreBg = (score: number) => {
    if (score >= 80) return 'bg-green-100 dark:bg-green-900/20'
    if (score >= 60) return 'bg-yellow-100 dark:bg-yellow-900/20'
    if (score >= 40) return 'bg-orange-100 dark:bg-orange-900/20'
    return 'bg-red-100 dark:bg-red-900/20'
  }

  return (
    <div 
      className={`p-6 cursor-pointer transition-all ${
        isSelected 
          ? 'bg-violet-50 dark:bg-violet-900/10 border-l-4 border-violet-500' 
          : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'
      }`}
      onClick={onSelect}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <a
              href={result.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-lg font-semibold text-violet-600 dark:text-violet-400 hover:underline"
              onClick={(e) => e.stopPropagation()}
            >
              #{result.issueNumber}: {result.title}
            </a>
            {result.isComplete && (
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400">
                ✓ Complete
              </span>
            )}
          </div>
          
          <div className="text-sm text-gray-600 dark:text-gray-400 mb-3">
            by <span className="font-medium">{result.author}</span> • {new Date(result.createdAt).toLocaleDateString()}
          </div>

          {/* Completeness Breakdown */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
            {Object.entries(result.completeness).slice(0, 6).map(([key, check]: [string, any]) => (
              <div key={key} className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${
                  check.present ? 'bg-green-500' : 'bg-red-500'
                }`}></div>
                <span className="text-sm text-gray-600 dark:text-gray-400 capitalize">
                  {key.replace(/([A-Z])/g, ' $1').trim()}
                </span>
              </div>
            ))}
          </div>

          {/* Missing Elements */}
          {result.missingElements.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-3">
              {result.missingElements.map((element, index) => (
                <span key={index} className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400">
                  ❌ {element}
                </span>
              ))}
            </div>
          )}

          {/* Labels */}
          {result.labels.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {result.labels.slice(0, 3).map((label, index) => (
                <span key={index} className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400">
                  {label}
                </span>
              ))}
              {result.labels.length > 3 && (
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400">
                  +{result.labels.length - 3} more
                </span>
              )}
            </div>
          )}
        </div>

        <div className="ml-6 flex flex-col items-end gap-3">
          {/* Quality Score */}
          <div className="text-right">
            <div className={`text-2xl font-bold ${getScoreColor(result.qualityScore)}`}>
              {result.qualityScore}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">Quality Score</div>
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            {!result.isComplete && (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onRequestComment(result.issueNumber)
                }}
                className="btn bg-blue-500 text-white hover:bg-blue-600 text-sm"
              >
                💬 Request Comment
              </button>
            )}
            <button
              onClick={onSelect}
              className="btn bg-gray-500 text-white hover:bg-gray-600 text-sm"
            >
              📋 View Details
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function IssueDetailModal({ 
  issue, 
  onClose, 
  onRequestComment 
}: { 
  issue: AnalysisResult
  onClose: () => void
  onRequestComment: (issueNumber: number, templateId?: string) => void
}) {
  const getQualityColor = (quality: string) => {
    switch (quality) {
      case 'excellent': return 'text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/20'
      case 'good': return 'text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/20'
      case 'fair': return 'text-yellow-600 dark:text-yellow-400 bg-yellow-100 dark:bg-yellow-900/20'
      case 'poor': return 'text-orange-600 dark:text-orange-400 bg-orange-100 dark:bg-orange-900/20'
      default: return 'text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/20'
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Issue Analysis Details
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              #{issue.issueNumber}: {issue.title}
            </p>
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

        {/* Modal Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Issue Info */}
            <div>
              <h4 className="text-md font-semibold text-gray-900 dark:text-gray-100 mb-4">
                Issue Information
              </h4>
              <div className="space-y-3">
                <div>
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Author:</span>
                  <span className="ml-2 text-sm text-gray-900 dark:text-gray-100">{issue.author}</span>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Created:</span>
                  <span className="ml-2 text-sm text-gray-900 dark:text-gray-100">
                    {new Date(issue.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Updated:</span>
                  <span className="ml-2 text-sm text-gray-900 dark:text-gray-100">
                    {new Date(issue.updatedAt).toLocaleDateString()}
                  </span>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Labels:</span>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {issue.labels.map((label, index) => (
                      <span key={index} className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400">
                        {label}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Quality Score */}
            <div>
              <h4 className="text-md font-semibold text-gray-900 dark:text-gray-100 mb-4">
                Quality Assessment
              </h4>
              <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
                <div className="text-center">
                  <div className={`text-4xl font-bold ${
                    issue.qualityScore >= 80 ? 'text-green-600 dark:text-green-400' :
                    issue.qualityScore >= 60 ? 'text-yellow-600 dark:text-yellow-400' :
                    issue.qualityScore >= 40 ? 'text-orange-600 dark:text-orange-400' :
                    'text-red-600 dark:text-red-400'
                  }`}>
                    {issue.qualityScore}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Overall Quality Score</div>
                  <div className={`text-sm font-medium mt-2 ${
                    issue.isComplete ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                  }`}>
                    {issue.isComplete ? '✓ Complete' : '⚠ Needs Attention'}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Completeness Breakdown */}
          <div className="mt-6">
            <h4 className="text-md font-semibold text-gray-900 dark:text-gray-100 mb-4">
              Completeness Breakdown
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Object.entries(issue.completeness).map(([key, check]: [string, any]) => (
                <div key={key} className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-900 dark:text-gray-100 capitalize">
                      {key.replace(/([A-Z])/g, ' $1').trim()}
                    </span>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getQualityColor(check.quality)}`}>
                      {check.quality}
                    </span>
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                    {check.details}
                  </div>
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${
                      check.present ? 'bg-green-500' : 'bg-red-500'
                    }`}></div>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      Confidence: {Math.round(check.confidence * 100)}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Suggestions */}
          {issue.suggestions.length > 0 && (
            <div className="mt-6">
              <h4 className="text-md font-semibold text-gray-900 dark:text-gray-100 mb-4">
                Improvement Suggestions
              </h4>
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
                <ul className="space-y-2">
                  {issue.suggestions.map((suggestion, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <span className="text-blue-500 mt-1">💡</span>
                      <span className="text-sm text-gray-700 dark:text-gray-300">{suggestion}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="mt-6 flex justify-end gap-3">
            <button
              onClick={onClose}
              className="btn bg-gray-500 text-white hover:bg-gray-600"
            >
              Close
            </button>
            {!issue.isComplete && (
              <button
                onClick={() => {
                  onRequestComment(issue.issueNumber)
                  onClose()
                }}
                className="btn bg-blue-500 text-white hover:bg-blue-600"
              >
                💬 Request Auto-Comment
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
