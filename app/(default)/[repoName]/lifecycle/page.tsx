'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { useToastNotifications } from '@/lib/toast'
import { Users, AlertTriangle, BarChart3, RefreshCw, Rocket, MessageSquare } from 'lucide-react'

interface LifecycleAnalysis {
  issueNumber: number;
  title: string;
  currentStatus: string;
  timeInEachStatus: {
    open: number;
    inProgress: number;
    inReview: number;
    inTesting: number;
  };
  totalTimeOpen: number;
  predictedResolutionTime: number;
  predictionConfidence: number;
  isStuck: boolean;
  stuckReason?: string;
  efficiencyScore: number;
  bottleneckAnalysis: string;
  suggestedActions: string[];
  similarIssues: {
    issueNumber: number;
    title: string;
    resolutionTime: number;
    similarity: number;
  }[];
}

interface LifecycleSummary {
  totalIssues: number;
  averageResolutionTime: number;
  stuckIssues: number;
  efficiencyTrend: 'improving' | 'declining' | 'stable';
  bottleneckInsights: string[];
  recommendations: string[];
}

export default function IssueLifecyclePage() {
  const params = useParams()
  const router = useRouter()
  const { data: session, status } = useSession()
  const { success, error: showError } = useToastNotifications()
  const repoName = params.repoName as string
  
  const [repo, setRepo] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [analysisResults, setAnalysisResults] = useState<LifecycleAnalysis[]>([])
  const [summary, setSummary] = useState<LifecycleSummary | null>(null)
  const [processingIssues, setProcessingIssues] = useState<Set<number>>(new Set())
  const [analysisError, setAnalysisError] = useState<string | null>(null)
  const [isSyncing, setIsSyncing] = useState(false)
  const [needsSync, setNeedsSync] = useState(false)

  useEffect(() => {
    if (repoName) {
      fetchRepoData()
    }
  }, [repoName])

  const fetchRepoData = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const response = await fetch(`/api/github/repos/${repoName}`)
      
      if (!response.ok) {
        const errorData = await response.json()
        if (response.status === 403 && errorData.isCollaborator) {
          setError('You are not the owner of this repository. You may be a collaborator.')
          return
        }
        throw new Error(errorData.error || 'Failed to fetch repository data')
      }
      
      const data = await response.json()
      setRepo(data.repo)
      
      // Check if issues are synced in database
      await checkIssuesInDatabase(data.repo.owner.login, data.repo.name)
      
    } catch (err) {
      console.error('Error fetching repo data:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch repository data')
    } finally {
      setLoading(false)
    }
  }

  const checkIssuesInDatabase = async (owner: string, repoName: string) => {
    try {
      const response = await fetch('/api/lifecycle/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          owner,
          repo: repoName
        }),
      })

      const data = await response.json()
      
      // If no issues found in database, show sync button
      if (data.needsSync || (data.summary && data.summary.totalIssues === 0)) {
        setNeedsSync(true)
      } else {
        setNeedsSync(false)
        // If issues are found, automatically run analysis
        if (data.results && data.results.length > 0) {
          setAnalysisResults(data.results)
          setSummary(data.summary)
        }
      }
    } catch (error) {
      console.error('Error checking issues in database:', error)
      setNeedsSync(true) // Default to showing sync button on error
    }
  }

  const analyzeLifecycle = async () => {
    setIsAnalyzing(true)
    setAnalysisError(null)
    setAnalysisResults([])
    setSummary(null)

    try {
      const response = await fetch('/api/lifecycle/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          owner: repo.owner.login,
          repo: repo.name,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to analyze lifecycle')
      }

      setAnalysisResults(data.results)
      setSummary(data.summary)
      setNeedsSync(data.needsSync || false)
      success(`Lifecycle analysis complete! Analyzed ${data.results.length} issues and identified ${data.summary.stuckIssues} stuck issues.`)
    } catch (err) {
      setAnalysisError(err instanceof Error ? err.message : 'An error occurred during analysis')
    } finally {
      setIsAnalyzing(false)
    }
  }

  const updateIssueStatus = async (issueNumber: number, action: string, metadata: any) => {
    setProcessingIssues(prev => new Set(prev).add(issueNumber))
    
    try {
      const response = await fetch('/api/lifecycle/update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          owner: repo.owner.login,
          repo: repo.name,
          issueNumber,
          action,
          metadata,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update issue')
      }

      success(`✅ Issue #${issueNumber} updated successfully`)
      
      // Refresh analysis
      await analyzeLifecycle()
      
    } catch (err) {
      console.error('Error updating issue:', err)
      showError(`❌ Failed to update issue: ${err instanceof Error ? err.message : 'Unknown error'}`)
    } finally {
      setProcessingIssues(prev => {
        const newSet = new Set(prev)
        newSet.delete(issueNumber)
        return newSet
      })
    }
  }

  const syncIssues = async () => {
    setIsSyncing(true)
    setAnalysisError(null)

    try {
      const response = await fetch('/api/github/sync-issues', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          owner: repo.owner.login,
          repo: repo.name,
          limit: 100,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to sync issues')
      }

      success(`✅ Successfully synced ${data.syncedCount} issues to database!`)
      setNeedsSync(false)
      
      // Automatically run analysis after sync
      await analyzeLifecycle()
      
    } catch (err) {
      setAnalysisError(err instanceof Error ? err.message : 'An error occurred during sync')
    } finally {
      setIsSyncing(false)
    }
  }

  const formatTime = (minutes: number): string => {
    if (minutes < 60) return `${minutes}m`
    if (minutes < 1440) return `${Math.floor(minutes / 60)}h`
    return `${Math.floor(minutes / 1440)}d`
  }

  const getStatusColor = (status: string): string => {
    switch (status.toLowerCase()) {
      case 'open': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400'
      case 'in_progress': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400'
      case 'in_review': return 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400'
      case 'in_testing': return 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400'
      case 'stuck': return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
      case 'closed': return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400'
    }
  }

  if (loading) {
    return (
      <div className="px-4 sm:px-6 lg:px-8 py-8 w-full max-w-[96rem] mx-auto">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-500 dark:text-gray-400">Loading repository data...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error || !repo) {
    const isCollaboratorError = error?.includes('not the owner of this repository')
    
    return (
      <div className="px-4 sm:px-6 lg:px-8 py-8 w-full max-w-[96rem] mx-auto">
        <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="text-red-500 mb-4 text-4xl">
{isCollaboratorError ? <Users className="w-12 h-12 mx-auto" /> : <AlertTriangle className="w-12 h-12 mx-auto" />}
          </div>
            <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100 mb-2">
              {isCollaboratorError ? 'Not Repository Owner' : 'Repository Not Found'}
            </h2>
            <p className="text-gray-500 dark:text-gray-400 mb-4">
              {isCollaboratorError
                ? 'You appear to be a collaborator on this repository, but you are not the owner. Some features may be limited.'
                : error || 'The requested repository could not be found.'
              }
            </p>
            <button
              onClick={() => router.back()}
              className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors"
            >
              ← Go Back
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (status === 'unauthenticated') {
    return (
      <div className="px-4 sm:px-6 lg:px-8 py-8 w-full max-w-[96rem] mx-auto">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6">
          <div className="flex items-center">
            <svg className="w-5 h-5 text-red-400 mr-3" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            <div>
              <h3 className="text-sm font-medium text-red-800 dark:text-red-200">Authentication Required</h3>
              <p className="text-sm text-red-700 dark:text-red-300 mt-1">Please sign in to use the Issue Lifecycle Tracker.</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-8 w-full max-w-[96rem] mx-auto">
      {/* Page header */}
      <div className="sm:flex sm:justify-between sm:items-center mb-8">
        <div className="mb-4 sm:mb-0">
          <div className="flex items-center space-x-4 mb-2">
            <button
              onClick={() => router.back()}
              className="inline-flex items-center gap-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
            >
              ← Back
            </button>
          </div>
          <h1 className="text-2xl md:text-3xl text-gray-800 dark:text-gray-100 font-bold">
            <BarChart3 className="w-5 h-5 mr-2" /> Issue Lifecycle Tracker
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Track issue journey, predict resolution times, and identify bottlenecks in <strong>{repo.name}</strong>
          </p>
        </div>

        <div className="text-right">
          <div className="text-sm text-gray-500 dark:text-gray-400">
            {repo.open_issues_count} open issues
            {needsSync && (
              <span className="ml-2 text-amber-600 dark:text-amber-400 font-medium">
                (not synced)
              </span>
            )}
          </div>
          <div className="text-xs text-gray-400 dark:text-gray-500">
            {repo.owner.login}/{repo.name}
          </div>
        </div>
      </div>

      {/* Analysis Controls */}
      <div className="bg-white dark:bg-gray-800 shadow-sm rounded-xl p-6 mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-2">
              Lifecycle Analysis
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              AI will analyze all issues to track their journey, predict resolution times, and identify bottlenecks.
            </p>
          </div>
          <div className="flex gap-3">
            {needsSync && (
              <button
                onClick={syncIssues}
                disabled={isSyncing}
                className="btn bg-green-600 text-white hover:bg-green-700 dark:bg-green-600 dark:hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSyncing ? (
                  <>
                    <div className="h-4 w-4 bg-white/20 rounded mr-2 animate-pulse"></div>
                    Syncing...
                  </>
                ) : (
                  <>
                    <svg className="fill-current shrink-0 mr-2" width="16" height="16" viewBox="0 0 16 16">
                      <path d="M8 0C3.58 0 0 3.58 0 8s3.58 8 8 8 8-3.58 8-8-3.58-8-8-8zm0 14c-3.31 0-6-2.69-6-6s2.69-6 6-6 6 2.69 6 6-2.69 6-6 6zm-1-9h2v2H7V5zm0 3h2v4H7V8z"/>
                    </svg>
                    🔄 Sync Issues
                  </>
                )}
              </button>
            )}
            <button
              onClick={analyzeLifecycle}
              disabled={isAnalyzing || isSyncing}
              className="btn bg-blue-600 text-white hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isAnalyzing ? (
                <>
                  <div className="h-4 w-4 bg-white/20 rounded mr-2 animate-pulse"></div>
                  Analyzing...
                </>
              ) : (
                <>
                  <svg className="fill-current shrink-0 mr-2" width="16" height="16" viewBox="0 0 16 16">
                    <path d="M8 0C3.58 0 0 3.58 0 8s3.58 8 8 8 8-3.58 8-8-3.58-8-8-8zm0 14c-3.31 0-6-2.69-6-6s2.69-6 6-6 6 2.69 6 6-2.69 6-6 6zm-1-9h2v2H7V5zm0 3h2v4H7V8z"/>
                  </svg>
                  <Rocket className="w-4 h-4 mr-2" /> Analyze Lifecycle
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Error state */}
      {analysisError && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6 mb-8">
          <div className="flex items-center">
            <svg className="w-5 h-5 text-red-400 mr-3" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            <div>
              <h3 className="text-sm font-medium text-red-800 dark:text-red-200">Analysis Error</h3>
              <p className="text-sm text-red-700 dark:text-red-300 mt-1">{analysisError}</p>
            </div>
          </div>
        </div>
      )}

      {/* Summary */}
      {summary && (
        <div className="bg-white dark:bg-gray-800 shadow-sm rounded-xl p-6 mb-8">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4">Lifecycle Summary</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {needsSync ? repo.open_issues_count || 0 : summary.totalIssues}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                Total Issues
                {needsSync && (
                  <div className="text-amber-600 dark:text-amber-400">(from GitHub)</div>
                )}
              </div>
            </div>
            <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">{Math.floor(summary.averageResolutionTime / 60)}h</div>
              <div className="text-xs text-gray-500 dark:text-gray-400">Avg Resolution</div>
            </div>
            <div className="text-center p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
              <div className="text-2xl font-bold text-red-600 dark:text-red-400">{summary.stuckIssues}</div>
              <div className="text-xs text-gray-500 dark:text-gray-400">Stuck Issues</div>
            </div>
            <div className="text-center p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
              <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">{summary.efficiencyTrend}</div>
              <div className="text-xs text-gray-500 dark:text-gray-400">Efficiency Trend</div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-sm font-medium text-gray-800 dark:text-gray-100 mb-2">Bottleneck Insights</h3>
              <ul className="space-y-1">
                {summary.bottleneckInsights.map((insight, idx) => (
                  <li key={idx} className="text-sm text-gray-600 dark:text-gray-400">• {insight}</li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-800 dark:text-gray-100 mb-2">Recommendations</h3>
              <ul className="space-y-1">
                {summary.recommendations.map((rec, idx) => (
                  <li key={idx} className="text-sm text-gray-600 dark:text-gray-400">• {rec}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Analysis Results */}
      {analysisResults.length > 0 && (
        <div className="bg-white dark:bg-gray-800 shadow-sm rounded-xl p-6">
          <header className="flex justify-between items-start mb-6">
            <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-2">
              Issue Lifecycle Analysis
            </h2>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              {analysisResults.length} issues analyzed
            </div>
          </header>
          
          <div className="space-y-6">
            {analysisResults.map((result, index) => (
              <div key={index} className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-6 border border-gray-200 dark:border-gray-600">
                {/* Issue Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h4 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-2">
                      Issue #{result.issueNumber}
                    </h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                      {result.title}
                    </p>
                    <div className="flex items-center space-x-2">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(result.currentStatus)}`}>
                        {result.currentStatus}
                      </span>
                      {result.isStuck && (
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400">
                          🔴 Stuck
                        </span>
                      )}
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                        result.efficiencyScore >= 70 ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400' :
                        result.efficiencyScore >= 40 ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400' :
                        'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
                      }`}>
                        {result.efficiencyScore}/100 efficiency
                      </span>
                    </div>
                  </div>
                </div>
                
                {/* Time Tracking */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  <div className="text-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <div className="text-lg font-bold text-blue-600 dark:text-blue-400">{formatTime(result.timeInEachStatus.open)}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">Open</div>
                  </div>
                  <div className="text-center p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                    <div className="text-lg font-bold text-yellow-600 dark:text-yellow-400">{formatTime(result.timeInEachStatus.inProgress)}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">In Progress</div>
                  </div>
                  <div className="text-center p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                    <div className="text-lg font-bold text-purple-600 dark:text-purple-400">{formatTime(result.timeInEachStatus.inReview)}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">In Review</div>
                  </div>
                  <div className="text-center p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                    <div className="text-lg font-bold text-orange-600 dark:text-orange-400">{formatTime(result.timeInEachStatus.inTesting)}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">In Testing</div>
                  </div>
                </div>

                {/* Predictions */}
                <div className="mb-4">
                  <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">AI Predictions</div>
                  <div className="bg-white dark:bg-gray-800 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-gray-600 dark:text-gray-400">Predicted Resolution Time:</span>
                      <span className="font-medium text-gray-800 dark:text-gray-200">{formatTime(result.predictedResolutionTime)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600 dark:text-gray-400">Confidence:</span>
                      <span className="font-medium text-gray-800 dark:text-gray-200">{Math.round(result.predictionConfidence * 100)}%</span>
                    </div>
                  </div>
                </div>

                {/* Bottleneck Analysis */}
                <div className="mb-4">
                  <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Bottleneck Analysis</div>
                  <div className="bg-white dark:bg-gray-800 rounded-lg p-3">
                    <p className="text-sm text-gray-700 dark:text-gray-300">{result.bottleneckAnalysis}</p>
                  </div>
                </div>

                {/* Stuck Reason */}
                {result.isStuck && result.stuckReason && (
                  <div className="mb-4">
                    <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Why It's Stuck</div>
                    <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-3">
                      <p className="text-sm text-red-700 dark:text-red-300">{result.stuckReason}</p>
                    </div>
                  </div>
                )}

                {/* Suggested Actions */}
                {result.suggestedActions.length > 0 && (
                  <div className="mb-4">
                    <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Suggested Actions</div>
                    <ul className="space-y-1">
                      {result.suggestedActions.map((action, idx) => (
                        <li key={idx} className="text-sm text-gray-600 dark:text-gray-400">• {action}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-gray-600">
                  {result.isStuck && (
                    <button
                      onClick={() => updateIssueStatus(result.issueNumber, 'mark_stuck', {
                        reason: 'Manually marked as stuck for attention',
                        suggestedActions: result.suggestedActions
                      })}
                      disabled={processingIssues.has(result.issueNumber)}
                      className="btn bg-red-600 text-white hover:bg-red-700 dark:bg-red-600 dark:hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {processingIssues.has(result.issueNumber) ? (
                        <>
                          <div className="h-4 w-4 bg-white/20 rounded mr-2 animate-pulse"></div>
                          Processing...
                        </>
                      ) : (
                        <>
                          🔴 Mark as Stuck
                        </>
                      )}
                    </button>
                  )}
                  
                  <button
                    onClick={() => updateIssueStatus(result.issueNumber, 'add_comment', {
                      comment: `**Lifecycle Analysis Update**\n\n**Current Status**: ${result.currentStatus}\n**Efficiency Score**: ${result.efficiencyScore}/100\n**Predicted Resolution**: ${formatTime(result.predictedResolutionTime)}\n\n**Bottleneck Analysis**:\n${result.bottleneckAnalysis}\n\n**Suggested Actions**:\n${result.suggestedActions.map(action => `• ${action}`).join('\n')}`,
                      commentType: 'lifecycle_analysis'
                    })}
                    disabled={processingIssues.has(result.issueNumber)}
                    className="btn bg-blue-600 text-white hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {processingIssues.has(result.issueNumber) ? (
                      <>
                        <div className="h-4 w-4 bg-white/20 rounded mr-2 animate-pulse"></div>
                        Processing...
                      </>
                    ) : (
                      <>
                        <MessageSquare className="w-4 h-4 mr-2" /> Add Analysis Comment
                      </>
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {!isAnalyzing && analysisResults.length === 0 && !analysisError && (
        <div className="bg-white dark:bg-gray-800 shadow-sm rounded-xl p-12 text-center">
          <div className="text-gray-400 dark:text-gray-500 mb-4">
            <BarChart3 className="w-24 h-24 mx-auto" />
          </div>
          <h3 className="text-lg font-medium text-gray-800 dark:text-gray-100 mb-2">
            Ready to Track Issue Lifecycle
          </h3>
          <p className="text-gray-500 dark:text-gray-400 mb-6">
            Click "Analyze Lifecycle" to track each issue's journey, predict resolution times, and identify bottlenecks.
          </p>
        </div>
      )}
    </div>
  )
}

