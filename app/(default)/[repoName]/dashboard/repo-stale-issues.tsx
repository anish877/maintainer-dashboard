'use client'

import { useState } from 'react'

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

interface RepoStaleIssuesProps {
  repoName: string
  owner: string
}

export default function RepoStaleIssues({ repoName, owner }: RepoStaleIssuesProps) {
  const [staleIssues, setStaleIssues] = useState<StaleIssue[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [scanned, setScanned] = useState(false)
  const [daysThreshold, setDaysThreshold] = useState(120) // This will be treated as minutes for testing (2 hours)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  const handleScanStaleIssues = async () => {
    setLoading(true)
    setError(null)

    try {
      const repository = `${owner}/${repoName}`
      const response = await fetch(`/api/stale-issues?repo=${repository}&days=${daysThreshold}`)
      
      if (!response.ok) {
        throw new Error('Failed to fetch stale issues')
      }
      
      const data = await response.json()
      console.log('🔍 API Response:', data)
      console.log('📋 Cleanup Queue:', data.cleanupQueue)
      console.log('📊 Summary:', data.summary)
      setStaleIssues(data.cleanupQueue || [])
      setScanned(true)
    } catch (err) {
      console.error('Error fetching stale issues:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch stale issues')
    } finally {
      setLoading(false)
    }
  }

  const handleIssueAction = async (action: string, issue: StaleIssue) => {
    console.log(`🔧 Handling action: ${action} for issue #${issue.issueNumber}`)
    setActionLoading(`${action}-${issue.issueNumber}`)

    try {
      const requestBody = {
        action,
        repository: issue.repository,
        issueNumber: issue.issueNumber,
        analysis: issue.analysis
      }
      console.log('📤 Sending request:', requestBody)

      const response = await fetch('/api/stale-issues', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      })

      console.log(`📥 Response status: ${response.status}`)

      if (!response.ok) {
        throw new Error('Failed to process action')
      }

      const result = await response.json()
      console.log('📥 Response data:', result)
      
      if (result.success) {
        console.log(`✅ Action ${action} successful, removing issue #${issue.issueNumber} from list`)
        // Remove the issue from the list or update its status
        setStaleIssues(prev => {
          const filtered = prev.filter(i => i.issueNumber !== issue.issueNumber)
          console.log(`📋 Updated stale issues list: ${filtered.length} remaining`)
          return filtered
        })
      } else {
        console.log(`❌ Action ${action} failed:`, result.message)
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
    <div className="bg-white dark:bg-gray-800 shadow-sm rounded-xl p-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100">
          🗑️ Stale Issue Detection
        </h3>
        
        <div className="flex items-center gap-3">
            <label className="text-sm text-gray-600 dark:text-gray-400">
              Minutes:
            </label>
          <input
            type="number"
            value={daysThreshold}
            onChange={(e) => setDaysThreshold(parseInt(e.target.value))}
            min="1"
            max="1440"
            className="w-20 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded focus:ring-2 focus:ring-purple-500 focus:border-transparent dark:bg-gray-700 dark:text-white text-sm"
          />
          <button
            onClick={handleScanStaleIssues}
            disabled={loading}
            className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
          >
            {loading ? '🔄 Scanning...' : '🔍 Scan Stale Issues'}
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 mb-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <span className="text-red-400">⚠️</span>
            </div>
            <div className="ml-3">
              <div className="text-sm text-red-700 dark:text-red-300">
                {error}
              </div>
            </div>
          </div>
        </div>
      )}

      {!scanned && !loading && (
        <div className="text-center py-8">
          <div className="text-4xl mb-3">🔍</div>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Click "Scan Stale Issues" to detect issues that may need attention
          </p>
        </div>
      )}

      {scanned && staleIssues.length === 0 && !loading && (
        <div className="text-center py-8">
          <div className="text-4xl mb-3">🎉</div>
          <p className="text-sm text-gray-600 dark:text-gray-300 font-medium">
            No Stale Issues Found
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Great! This repository doesn't have any stale issues.
          </p>
        </div>
      )}

      {staleIssues.length > 0 && (
        <div className="space-y-4">
          <div className="grid grid-cols-4 gap-4 mb-4">
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
              <div className="text-2xl font-bold text-gray-800 dark:text-gray-100">
                {staleIssues.length}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                Total Stale
              </div>
            </div>
            <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-3">
              <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                {staleIssues.filter(i => i.analysis.cleanupPriority === 'critical').length}
              </div>
              <div className="text-xs text-red-500 dark:text-red-400">
                Critical
              </div>
            </div>
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3">
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {staleIssues.filter(i => i.analysis.suggestedAction === 'comment').length}
              </div>
              <div className="text-xs text-blue-500 dark:text-blue-400">
                Need Comment
              </div>
            </div>
            <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-3">
              <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                {staleIssues.filter(i => i.analysis.suggestedAction === 'close').length}
              </div>
              <div className="text-xs text-red-500 dark:text-red-400">
                Ready to Close
              </div>
            </div>
          </div>

          <div className="space-y-3 max-h-96 overflow-y-auto">
            {staleIssues.map((issue) => (
              <div 
                key={issue.issueId} 
                className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 border border-gray-200 dark:border-gray-600"
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <a
                        href={`https://github.com/${issue.repository}/issues/${issue.issueNumber}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm font-medium text-gray-900 dark:text-gray-100 hover:text-purple-600 dark:hover:text-purple-400"
                      >
                        #{issue.issueNumber}
                      </a>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getPriorityColor(issue.analysis.cleanupPriority)}`}>
                        {issue.analysis.cleanupPriority}
                      </span>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getActionColor(issue.analysis.suggestedAction)}`}>
                        {issue.analysis.suggestedAction}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                      {issue.analysis.staleReason.replace('_', ' ')} • {issue.daysSinceActivity} minutes since activity
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {Math.round(issue.analysis.confidence * 100)}% confidence
                    </p>
                  </div>
                  <div className="flex gap-2">
                    {issue.analysis.suggestedAction === 'comment' && (
                      <button
                        onClick={() => handleIssueAction('comment', issue)}
                        disabled={actionLoading === `comment-${issue.issueNumber}`}
                        className="text-xs bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 disabled:opacity-50"
                      >
                        {actionLoading === `comment-${issue.issueNumber}` ? '...' : '💬 Comment'}
                      </button>
                    )}
                    {issue.analysis.suggestedAction === 'close' && issue.analysis.confidence > 0.8 && (
                      <button
                        onClick={() => handleIssueAction('close', issue)}
                        disabled={actionLoading === `close-${issue.issueNumber}`}
                        className="text-xs bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700 disabled:opacity-50"
                      >
                        {actionLoading === `close-${issue.issueNumber}` ? '...' : '🔒 Close'}
                      </button>
                    )}
                    <button
                      onClick={() => handleIssueAction('remove', issue)}
                      disabled={actionLoading === `remove-${issue.issueNumber}`}
                      className="text-xs bg-gray-600 text-white px-3 py-1 rounded hover:bg-gray-700 disabled:opacity-50"
                      title="Remove this issue from stale detection"
                    >
                      {actionLoading === `remove-${issue.issueNumber}` ? '...' : '🗑️ Remove'}
                    </button>
                    <button
                      onClick={() => handleIssueAction('delete', issue)}
                      disabled={actionLoading === `delete-${issue.issueNumber}`}
                      className="text-xs bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700 disabled:opacity-50"
                      title="Delete this issue from GitHub (permanent)"
                    >
                      {actionLoading === `delete-${issue.issueNumber}` ? '...' : '💀 Delete'}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
