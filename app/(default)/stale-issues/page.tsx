'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

interface StaleIssue {
  issueId: string
  issueNumber: number
  repository: string
  analysis: {
    isStale: boolean
    staleReason: string
    confidence: number
    reasoning: string
    suggestedAction: string
    cleanupPriority: string
  }
  lastActivity: string
  daysSinceActivity: number
  priority: number
  status: string
  createdAt: string
  actions: string[]
}

interface StaleIssuesSummary {
  total: number
  byPriority: {
    critical: number
    high: number
    medium: number
    low: number
  }
  byAction: {
    close: number
    comment: number
    wait: number
    escalate: number
  }
}

export default function StaleIssuesPage() {
  const router = useRouter()
  const [staleIssues, setStaleIssues] = useState<StaleIssue[]>([])
  const [summary, setSummary] = useState<StaleIssuesSummary | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedRepo, setSelectedRepo] = useState('')
  const [daysThreshold, setDaysThreshold] = useState(30) // This will be treated as minutes for testing
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  const handleScanStaleIssues = async () => {
    if (!selectedRepo) {
      setError('Please select a repository')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/stale-issues?repo=${selectedRepo}&days=${daysThreshold}`)
      
      if (!response.ok) {
        throw new Error('Failed to fetch stale issues')
      }
      
      const data = await response.json()
      setStaleIssues(data.cleanupQueue || [])
      setSummary(data.summary)
    } catch (err) {
      console.error('Error fetching stale issues:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch stale issues')
    } finally {
      setLoading(false)
    }
  }

  const handleIssueAction = async (action: string, issue: StaleIssue) => {
    setActionLoading(`${action}-${issue.issueNumber}`)

    try {
      const response = await fetch('/api/stale-issues', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          repository: issue.repository,
          issueNumber: issue.issueNumber,
          analysis: issue.analysis
        })
      })

      if (!response.ok) {
        throw new Error('Failed to process action')
      }

      const result = await response.json()
      
      if (result.success) {
        // Remove the issue from the list or update its status
        setStaleIssues(prev => prev.filter(i => i.issueNumber !== issue.issueNumber))
      } else {
        setError(result.message || 'Action failed')
      }
    } catch (err) {
      console.error('Error processing action:', err)
      setError(err instanceof Error ? err.message : 'Action failed')
    } finally {
      setActionLoading(null)
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
      case 'high': return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200'
      case 'medium': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
      case 'low': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
    }
  }

  const getActionColor = (action: string) => {
    switch (action) {
      case 'close': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
      case 'comment': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
      case 'wait': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
      case 'escalate': return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
    }
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-8 w-full max-w-[96rem] mx-auto">
      
      {/* Page header */}
      <div className="sm:flex sm:justify-between sm:items-center mb-8">
        <div className="mb-4 sm:mb-0">
          <h1 className="text-2xl md:text-3xl text-gray-800 dark:text-gray-100 font-bold">
            Stale Issue Resolver
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            AI-powered detection and resolution of stale issues
          </p>
        </div>
      </div>

      {/* Controls */}
      <div className="bg-white dark:bg-gray-800 shadow-sm rounded-xl p-6 mb-8">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4">
          Scan Configuration
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Repository
            </label>
            <input
              type="text"
              value={selectedRepo}
              onChange={(e) => setSelectedRepo(e.target.value)}
              placeholder="owner/repository"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Minutes Threshold (for testing)
            </label>
            <input
              type="number"
              value={daysThreshold}
              onChange={(e) => setDaysThreshold(parseInt(e.target.value))}
              min="1"
              max="1440"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
            />
          </div>
          
          <div className="flex items-end">
            <button
              onClick={handleScanStaleIssues}
              disabled={loading || !selectedRepo}
              className="w-full bg-purple-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'Scanning...' : '🔍 Scan Stale Issues'}
            </button>
          </div>
        </div>
      </div>

      {/* Error display */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-6">
          <div className="flex">
            <div className="flex-shrink-0">
              <span className="text-red-400">⚠️</span>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800 dark:text-red-200">
                Error
              </h3>
              <div className="mt-2 text-sm text-red-700 dark:text-red-300">
                {error}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Summary */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white dark:bg-gray-800 shadow-sm rounded-xl p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0 text-3xl">📋</div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                    Total Stale Issues
                  </dt>
                  <dd className="text-lg font-medium text-gray-800 dark:text-gray-100">
                    {summary.total}
                  </dd>
                </dl>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 shadow-sm rounded-xl p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0 text-3xl">🔴</div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                    Critical Priority
                  </dt>
                  <dd className="text-lg font-medium text-gray-800 dark:text-gray-100">
                    {summary.byPriority.critical}
                  </dd>
                </dl>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 shadow-sm rounded-xl p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0 text-3xl">💬</div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                    Need Comments
                  </dt>
                  <dd className="text-lg font-medium text-gray-800 dark:text-gray-100">
                    {summary.byAction.comment}
                  </dd>
                </dl>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 shadow-sm rounded-xl p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0 text-3xl">🔒</div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                    Ready to Close
                  </dt>
                  <dd className="text-lg font-medium text-gray-800 dark:text-gray-100">
                    {summary.byAction.close}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Stale Issues Table */}
      {staleIssues.length > 0 && (
        <div className="bg-white dark:bg-gray-800 shadow-sm rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100">
              Stale Issues Queue
            </h3>
          </div>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Issue
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Priority
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Reason
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Action
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Days Since
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {staleIssues.map((issue) => (
                  <tr key={issue.issueId} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10">
                          <span className="text-2xl">⚠️</span>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                            #{issue.issueNumber}
                          </div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            {issue.repository}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPriorityColor(issue.analysis.cleanupPriority)}`}>
                        {issue.analysis.cleanupPriority}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900 dark:text-gray-100">
                        {issue.analysis.staleReason.replace('_', ' ')}
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        {Math.round(issue.analysis.confidence * 100)}% confidence
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getActionColor(issue.analysis.suggestedAction)}`}>
                        {issue.analysis.suggestedAction}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                      {issue.daysSinceActivity} minutes
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        {issue.analysis.suggestedAction === 'comment' && (
                          <button
                            onClick={() => handleIssueAction('comment', issue)}
                            disabled={actionLoading === `comment-${issue.issueNumber}`}
                            className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 disabled:opacity-50"
                          >
                            {actionLoading === `comment-${issue.issueNumber}` ? 'Posting...' : '💬 Comment'}
                          </button>
                        )}
                        {issue.analysis.suggestedAction === 'close' && issue.analysis.confidence > 0.8 && (
                          <button
                            onClick={() => handleIssueAction('close', issue)}
                            disabled={actionLoading === `close-${issue.issueNumber}`}
                            className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 disabled:opacity-50"
                          >
                            {actionLoading === `close-${issue.issueNumber}` ? 'Closing...' : '🔒 Close'}
                          </button>
                        )}
                        <a
                          href={`https://github.com/${issue.repository}/issues/${issue.issueNumber}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-300"
                        >
                          🔗 View
                        </a>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Empty state */}
      {!loading && staleIssues.length === 0 && summary && (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">🎉</div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
            No Stale Issues Found
          </h3>
          <p className="text-gray-500 dark:text-gray-400">
            Great! This repository doesn't have any stale issues.
          </p>
        </div>
      )}
    </div>
  )
}
