'use client'

import { useState } from 'react'
import { Check, Search, BarChart3, Lightbulb, Flame, Clock, X } from 'lucide-react'

interface ActivityReport {
  assignmentId: string
  repositoryName: string
  issueNumber: number
  assignee: {
    login: string
    avatar: string
    profile: string
  }
  timestamps: {
    issueCreated: string
    lastActivity: string
    lastComment: string | null
    issueUpdated: string
  }
  metrics: {
    minutesSinceActivity: number
    minutesSinceAssignment: number
    hoursSinceActivity: number
    daysSinceActivity: number
  }
  status: string
  recommendation: string
  urgency: string
  message: string
  recentCommits: Array<{
    sha: string
    message: string
    date: string
    url: string
    source: 'main' | 'fork'
    forkName?: string
  }>
  forkActivity: {
    hasFork: boolean
    forkName: string
    forkUrl: string
    lastForkCommit: any
    totalForkCommits: number
  }
  issueUrl: string
  lastComment: {
    body: string
    createdAt: string
    url: string
  } | null
}

interface ActivityCheckerProps {
  repositoryName: string
  assignmentId: string
  onActivityCheckStart?: () => void
  onActivityChecked?: (report: ActivityReport) => void
}

export default function ActivityChecker({ 
  repositoryName, 
  assignmentId, 
  onActivityCheckStart,
  onActivityChecked 
}: ActivityCheckerProps) {
  const [report, setReport] = useState<ActivityReport | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isChecking, setIsChecking] = useState(false)

  const checkActivity = async () => {
    setIsChecking(true)
    setError(null)
    onActivityCheckStart?.()

    try {
      const response = await fetch('/api/assignments/check-activity', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          repositoryName,
          assignmentId
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to check activity')
      }

      const data = await response.json()
      setReport(data.report)
      onActivityChecked?.(data.report)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setIsChecking(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'VERY_ACTIVE': return 'text-green-600 bg-green-100'
      case 'ACTIVE': return 'text-blue-600 bg-blue-100'
      case 'WARNING': return 'text-yellow-600 bg-yellow-100'
      case 'ALERT': return 'text-orange-600 bg-orange-100'
      case 'CRITICAL': return 'text-red-600 bg-red-100'
      default: return 'text-gray-600 bg-gray-100'
    }
  }

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'low': return 'text-green-600'
      case 'medium': return 'text-yellow-600'
      case 'high': return 'text-orange-600'
      case 'critical': return 'text-red-600'
      default: return 'text-gray-600'
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <button 
          onClick={checkActivity}
          disabled={isChecking}
          className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed rounded-md transition-colors"
        >
{isChecking ? 'Checking...' : (
            <>
              <Search className="w-4 h-4 mr-2" /> Check Activity
            </>
          )}
        </button>
        
        {report && (
          <div className="flex items-center gap-2">
            <span className={`px-2 py-1 rounded-full text-sm font-medium ${getStatusColor(report.status)}`}>
              {report.status}
            </span>
            <span className={`text-sm font-medium ${getUrgencyColor(report.urgency)}`}>
              {report.urgency} priority
            </span>
          </div>
        )}
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-600 flex items-center gap-2">
            <X className="w-4 h-4" /> {error}
          </p>
        </div>
      )}

      {report && (
        <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h3 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                <BarChart3 className="w-4 h-4" /> Activity Summary
              </h3>
              <div className="space-y-1 text-sm">
                <p><strong>Assignee:</strong> <a href={report.assignee.profile} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">{report.assignee.login}</a></p>
                <p><strong>Issue:</strong> <a href={report.issueUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">#{report.issueNumber}</a></p>
                <p><strong>Last Activity:</strong> {report.metrics.minutesSinceActivity} minutes ago</p>
                <p><strong>Since Assignment:</strong> {report.metrics.minutesSinceAssignment} minutes ago</p>
              </div>
            </div>
            
            <div>
              <h3 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                <Clock className="w-4 h-4" /> Timeline
              </h3>
              <div className="space-y-1 text-sm">
                <p><strong>Issue Created:</strong> {new Date(report.timestamps.issueCreated).toLocaleString()}</p>
                <p><strong>Last Activity:</strong> {new Date(report.timestamps.lastActivity).toLocaleString()}</p>
                {report.timestamps.lastComment && (
                  <p><strong>Last Comment:</strong> {new Date(report.timestamps.lastComment).toLocaleString()}</p>
                )}
                <p><strong>Issue Updated:</strong> {new Date(report.timestamps.issueUpdated).toLocaleString()}</p>
              </div>
            </div>
          </div>

          {/* Fork Activity Section */}
          {report.forkActivity.hasFork && (
            <div className="p-3 bg-blue-50 rounded border border-blue-200">
              <h3 className="font-semibold text-blue-900 mb-2">🍴 Fork Activity</h3>
              <div className="space-y-1 text-sm">
                <p><strong>Fork:</strong> <a href={report.forkActivity.forkUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">{report.forkActivity.forkName}</a></p>
                <p><strong>Commits in Fork:</strong> {report.forkActivity.totalForkCommits}</p>
                {report.forkActivity.lastForkCommit && (
                  <p><strong>Last Fork Commit:</strong> {new Date(report.forkActivity.lastForkCommit.date).toLocaleString()}</p>
                )}
              </div>
            </div>
          )}

          <div className="p-3 bg-white rounded border">
            <h3 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
              <Lightbulb className="w-4 h-4" /> Recommendation
            </h3>
            <p className="text-gray-700">{report.recommendation}</p>
            <p className="text-sm text-gray-600 mt-1">{report.message}</p>
          </div>

          {report.recentCommits.length > 0 && (
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">📝 Recent Commits</h3>
              <div className="space-y-2">
                {report.recentCommits.map((commit, index) => (
                  <div key={index} className="p-2 bg-white rounded border text-sm">
                    <div className="flex items-center justify-between">
                      <p className="font-mono text-xs text-gray-500">{commit.sha.substring(0, 7)}</p>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        commit.source === 'fork' 
                          ? 'bg-blue-100 text-blue-800' 
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {commit.source === 'fork' ? '🍴 Fork' : '🏠 Main'}
                      </span>
                    </div>
                    <p className="text-gray-900">{commit.message}</p>
                    <p className="text-gray-500">{new Date(commit.date).toLocaleString()}</p>
                    {commit.source === 'fork' && commit.forkName && (
                      <p className="text-xs text-blue-600">From: {commit.forkName}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {report.lastComment && (
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">💬 Last Comment</h3>
              <div className="p-3 bg-white rounded border">
                <p className="text-gray-700">{report.lastComment.body}</p>
                <p className="text-sm text-gray-500 mt-1">
                  {new Date(report.lastComment.createdAt).toLocaleString()}
                </p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
