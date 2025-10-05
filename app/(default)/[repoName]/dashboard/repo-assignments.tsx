'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import ActivityChecker from '@/app/(default)/assignments/activity-checker'
import { AlertTriangle, Clock, CheckCircle, XCircle, User, Calendar, Search, X, ClipboardList, Bell, Check } from 'lucide-react'

interface RepoAssignment {
  id: string
  repositoryName: string
  issueNumber: number
  assigneeLogin: string
  assignee: { username: string; image: string }
  status: string
  daysInactive: number
  urgency: string
  message: string
  action: string
  actionUrl: string
  issueUrl: string
  aiAnalysis: {
    isActive: boolean
    workType: string
    confidence: number
    isBlocked: boolean
    nextSteps: string
  }
  maintainerActions: {
    removeFromIssue: string
    sendReminder: string
    viewProfile: string
  }
}

interface RepoAssignmentsProps {
  repoName: string
}

export default function RepoAssignments({ repoName }: RepoAssignmentsProps) {
  const [assignments, setAssignments] = useState<RepoAssignment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [updatingStatus, setUpdatingStatus] = useState<Set<string>>(new Set())
  const [stats, setStats] = useState({
    active: 0,
    warning: 0,
    alert: 0,
    autoUnassigned: 0
  })

  useEffect(() => {
    fetchAssignments()
  }, [repoName])

  const fetchAssignments = async () => {
    try {
      setLoading(true)
      setError(null)
      
      console.log(`Fetching assignments for repository: ${repoName}`)
      
      const response = await fetch(`/api/assignments/repo/${repoName}`, {
        credentials: 'include'
      })
      
      console.log(`📡 API Response: ${response.status} ${response.statusText}`)
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
        console.error(`API Error: ${response.status}`, errorData)
        throw new Error(`API Error ${response.status}: ${errorData.error || response.statusText}`)
      }
      
      const data = await response.json()
      console.log(`API Success:`, { 
        repository: data.repository, 
        total: data.total, 
        assignmentsCount: data.assignments.length 
      })
      
      setAssignments(data.assignments)
      setStats(data.stats)
    } catch (err) {
      console.error('Error fetching repository assignments:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch assignments')
    } finally {
      setLoading(false)
    }
  }

  const handleAssignmentAction = async (assignmentId: string, action: string) => {
    try {
      const response = await fetch(`/api/assignments/repo/${repoName}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          action,
          assignmentId
        })
      })

      if (!response.ok) {
        throw new Error(`Failed to ${action}`)
      }

      const result = await response.json()
      console.log(`${action} successful:`, result)
      
      // Refresh assignments
      await fetchAssignments()
    } catch (err) {
      console.error(`Error ${action}:`, err)
    }
  }

  const getStatusBadge = (status: string, urgency: string) => {
    const baseClasses = "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
    
    switch (status) {
      case 'ACTIVE':
        return `${baseClasses} bg-green-100 text-green-800 dark:bg-green-800/30 dark:text-green-400`
      case 'WARNING':
        return `${baseClasses} bg-yellow-100 text-yellow-800 dark:bg-yellow-800/30 dark:text-yellow-400`
      case 'ALERT':
        return `${baseClasses} bg-orange-100 text-orange-800 dark:bg-orange-800/30 dark:text-orange-400`
      case 'CRITICAL':
        return `${baseClasses} bg-red-100 text-red-800 dark:bg-red-800/30 dark:text-red-400`
      case 'AUTO_UNASSIGNED':
        return `${baseClasses} bg-red-100 text-red-800 dark:bg-red-800/30 dark:text-red-400`
      default:
        return `${baseClasses} bg-gray-100 text-gray-800 dark:bg-gray-800/30 dark:text-gray-400`
    }
  }

  const getUrgencyIcon = (urgency: string) => {
    switch (urgency) {
      case 'critical':
        return <AlertTriangle className="w-4 h-4" />
      case 'high':
        return <AlertTriangle className="w-4 h-4" />
      case 'medium':
        return <Bell className="w-4 h-4" />
      case 'low':
        return <Check className="w-4 h-4" />
      default:
        return <ClipboardList className="w-4 h-4" />
    }
  }

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 shadow-sm rounded-xl">
        <div className="px-5 pt-5">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-32"></div>
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-16 bg-gray-200 dark:bg-gray-700 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-white dark:bg-gray-800 shadow-sm rounded-xl">
        <div className="px-5 pt-5">
          <div className="text-center py-8">
            <div className="text-red-600 dark:text-red-400 mb-2"><X className="w-4 h-4 inline mr-1" /> Error loading assignments</div>
            <p className="text-sm text-gray-500 dark:text-gray-400">{error}</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white dark:bg-gray-800 shadow-sm rounded-xl">
      {/* Header */}
      <div className="px-5 pt-5">
        <header className="flex justify-between items-start mb-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-1">
              Issue Assignments
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Fork-aware cookie licking detection for {repoName}
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <div className="text-xs text-gray-500 dark:text-gray-400">
              {stats.active} active • {stats.warning} warning • {stats.alert} alert
            </div>
          </div>
        </header>
      </div>

      {/* Stats Cards */}
      <div className="px-5 pb-4">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded-lg">
            <div className="text-sm font-medium text-green-800 dark:text-green-400">Active</div>
            <div className="text-2xl font-bold text-green-900 dark:text-green-300">{stats.active}</div>
          </div>
          <div className="bg-yellow-50 dark:bg-yellow-900/20 p-3 rounded-lg">
            <div className="text-sm font-medium text-yellow-800 dark:text-yellow-400">Warning</div>
            <div className="text-2xl font-bold text-yellow-900 dark:text-yellow-300">{stats.warning}</div>
          </div>
          <div className="bg-orange-50 dark:bg-orange-900/20 p-3 rounded-lg">
            <div className="text-sm font-medium text-orange-800 dark:text-orange-400">Alert</div>
            <div className="text-2xl font-bold text-orange-900 dark:text-orange-300">{stats.alert}</div>
          </div>
          <div className="bg-red-50 dark:bg-red-900/20 p-3 rounded-lg">
            <div className="text-sm font-medium text-red-800 dark:text-red-400">Unassigned</div>
            <div className="text-2xl font-bold text-red-900 dark:text-red-300">{stats.autoUnassigned}</div>
          </div>
        </div>
      </div>

      {/* Assignments Table */}
      <div className="px-5 pb-5">
        {assignments.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-gray-400 dark:text-gray-500 mb-2"><ClipboardList className="w-8 h-8 mx-auto" /></div>
            <p className="text-sm text-gray-500 dark:text-gray-400">No assignments found for this repository</p>
          </div>
        ) : (
          <div className="space-y-3">
            {assignments.map((assignment) => (
              <div key={assignment.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-3 mb-2">
                      <div className="flex-shrink-0">
                        <img
                          className="h-8 w-8 rounded-full"
                          src={assignment.assignee.image}
                          alt={assignment.assignee.username}
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2">
                          <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                            {assignment.assignee.username}
                          </span>
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            #{assignment.issueNumber}
                          </span>
                        </div>
                        <div className="flex items-center space-x-2 mt-1">
                          <span className={getStatusBadge(assignment.status, assignment.urgency)}>
                            {updatingStatus.has(assignment.id) ? (
                              <span className="flex items-center">
                                <span className="animate-spin mr-1">⟳</span> Updating...
                              </span>
                            ) : (
                              <>
                                {getUrgencyIcon(assignment.urgency)} {assignment.status}
                              </>
                            )}
                          </span>
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            {assignment.daysInactive} days inactive
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    {/* AI Analysis */}
                    <div className="mt-2 p-2 bg-gray-50 dark:bg-gray-700/50 rounded text-xs">
                      <div className="flex items-center space-x-2 mb-1">
                        <span className="font-medium text-gray-700 dark:text-gray-300">AI Analysis:</span>
                        <span className="text-gray-600 dark:text-gray-400">
                          {assignment.aiAnalysis.workType} • {Math.round(assignment.aiAnalysis.confidence * 100)}% confidence
                        </span>
                      </div>
                      <div className="text-gray-600 dark:text-gray-400">
                        {assignment.aiAnalysis.nextSteps}
                      </div>
                    </div>
                    
                    {/* Manual Activity Checker */}
                    <div className="mt-3">
                      <ActivityChecker 
                        repositoryName={assignment.repositoryName}
                        assignmentId={assignment.id}
                        onActivityCheckStart={() => {
                          setUpdatingStatus(prev => new Set(prev).add(assignment.id))
                        }}
                        onActivityChecked={(report) => {
                          console.log('🔄 Activity checked for assignment:', assignment.id, 'New status:', report.status)
                          // Update the assignment status in real-time
                          setAssignments(prevAssignments => 
                            prevAssignments.map(prevAssignment => 
                              prevAssignment.id === assignment.id 
                                ? { 
                                    ...prevAssignment, 
                                    status: report.status, 
                                    urgency: report.urgency,
                                    message: report.message
                                  }
                                : prevAssignment
                            )
                          )
                          // Remove from updating set
                          setUpdatingStatus(prev => {
                            const newSet = new Set(prev)
                            newSet.delete(assignment.id)
                            return newSet
                          })
                          console.log('✅ Assignment updated with new status:', report.status)
                        }}
                      />
                    </div>
                  </div>
                  
                  {/* Actions */}
                  <div className="flex items-center space-x-2 ml-4">
                    <a
                      href={assignment.issueUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center px-2 py-1 text-xs font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded"
                    >
                      View Issue
                    </a>
                    <button
                      onClick={() => handleAssignmentAction(assignment.id, 'remove_from_issue')}
                      className="inline-flex items-center px-2 py-1 text-xs font-medium text-red-700 dark:text-red-400 bg-red-100 dark:bg-red-900/20 hover:bg-red-200 dark:hover:bg-red-900/30 rounded"
                    >
                      Remove
                    </button>
                    <button
                      onClick={() => handleAssignmentAction(assignment.id, 'send_reminder')}
                      className="inline-flex items-center px-2 py-1 text-xs font-medium text-blue-700 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/20 hover:bg-blue-200 dark:hover:bg-blue-900/30 rounded"
                    >
                      Remind
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
