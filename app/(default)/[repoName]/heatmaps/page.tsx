'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { useToastNotifications } from '@/lib/toast'
import Datepicker from '@/components/datepicker'
import TimeOfDayChart from '@/components/charts/time-of-day-chart'
import GeographicChart from '@/components/charts/geographic-chart'
import BusiestDaysChart from '@/components/charts/busiest-days-chart'
import ResponseTimeChart from '@/components/charts/response-time-chart'

export default function RepoHeatmapsPage() {
  const params = useParams()
  const router = useRouter()
  const { data: session, status } = useSession()
  const { success, error: showError } = useToastNotifications()
  const repoName = params.repoName as string
  
  const [repo, setRepo] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedPeriod, setSelectedPeriod] = useState('30')
  const [isLoading, setIsLoading] = useState(false)
  const [heatmapData, setHeatmapData] = useState<any>(null)
  const [heatmapError, setHeatmapError] = useState<string | null>(null)

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
          // User is a collaborator but not the owner
          setError('You are not the owner of this repository. You may be a collaborator.')
          return
        }
        throw new Error(errorData.error || 'Failed to fetch repository data')
      }
      
      const data = await response.json()
      setRepo(data.repo)
    } catch (err) {
      console.error('Error fetching repo data:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch repository data')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!repo) {
      showError('Repository data not available')
      return
    }

    setIsLoading(true)
    setHeatmapError(null)
    setHeatmapData(null)

    try {
      // Use the actual repo data to get owner and repo name
      const owner = repo.owner.login
      const repoNameOnly = repo.name
      
      console.log('🔍 [HEATMAPS FRONTEND DEBUG] Repository selection:', {
        repoName,
        owner,
        repoNameOnly,
        period: selectedPeriod,
        repoData: repo
      })
      
      const response = await fetch('/api/github/heatmaps', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          owner,
          repo: repoNameOnly,
          period: selectedPeriod,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch heatmap data')
      }

      setHeatmapData(data)
      success('Heatmap data loaded successfully')
    } catch (err) {
      setHeatmapError(err instanceof Error ? err.message : 'An error occurred')
      showError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const { name, value } = e.target
    if (name === 'period') {
      setSelectedPeriod(value)
    }
  }

  if (status === 'loading') {
    return (
      <div className="px-4 sm:px-6 lg:px-8 py-8 w-full max-w-[96rem] mx-auto">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-500"></div>
        </div>
      </div>
    )
  }

  if (!session) {
    return (
      <div className="px-4 sm:px-6 lg:px-8 py-8 w-full max-w-[96rem] mx-auto">
        <div className="text-center py-12">
          <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-4">
            Authentication Required
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            Please sign in to access contribution heatmaps and insights.
          </p>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="px-4 sm:px-6 lg:px-8 py-8 w-full max-w-[96rem] mx-auto">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-500"></div>
        </div>
      </div>
    )
  }

  if (error || !repo) {
    const isAuthError = error?.includes('Authentication required') || error?.includes('GitHub token') || error?.includes('Access denied')
    const isCollaboratorError = error?.includes('not the owner of this repository')
    
    return (
      <div className="px-4 sm:px-6 lg:px-8 py-8 w-full max-w-[96rem] mx-auto">
        <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center max-w-md">
          <div className="text-red-500 mb-4 text-4xl">
            {isAuthError ? '🔐' : isCollaboratorError ? '👥' : '⚠️'}
          </div>
            <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100 mb-2">
              {isAuthError ? 'Authentication Issue' : isCollaboratorError ? 'Not Repository Owner' : 'Repository Not Found'}
            </h2>
            <p className="text-gray-500 dark:text-gray-400 mb-6">
              {isAuthError 
                ? 'Your GitHub token may have expired or lacks permissions. Please sign out and sign back in to refresh your access.'
                : isCollaboratorError
                ? 'You appear to be a collaborator on this repository, but you are not the owner. Some features may be limited.'
                : error || 'The requested repository could not be found.'
              }
            </p>
            <div className="space-y-3">
              {isAuthError && (
                <>
                  <button
                    onClick={() => {
                      window.location.href = '/api/auth/signout'
                    }}
                    className="inline-flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-red-700 transition-colors w-full justify-center"
                  >
                    🔄 Sign Out & Refresh Token
                  </button>
                  <button
                    onClick={() => router.push('/repos')}
                    className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors w-full justify-center"
                  >
                    📋 View All Repositories
                  </button>
                </>
              )}
              <button
                onClick={() => router.back()}
                className="inline-flex items-center gap-2 bg-gray-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-gray-700 transition-colors w-full justify-center"
              >
                ← Go Back
              </button>
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
        {/* Left: Title */}
        <div className="mb-4 sm:mb-0">
          <div className="flex items-center gap-3 mb-2">
            <button
              onClick={() => router.push(`/${repoName}/dashboard`)}
              className="inline-flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back to Dashboard
            </button>
          </div>
          <h1 className="text-2xl md:text-3xl text-gray-800 dark:text-gray-100 font-bold">
            Contribution Heatmaps & Insights
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            <span className="font-medium">{repoName}</span> - Visualize contribution patterns, identify optimal release times, and understand community availability
          </p>
        </div>

        {/* Right: Actions */}
        <div className="grid grid-flow-col sm:auto-cols-max justify-start sm:justify-end gap-2">
          {/* Datepicker built with React Day Picker */}
          <Datepicker />
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-12 gap-6">
        {/* Configuration Panel */}
        <div className="col-span-12 lg:col-span-4">
          <div className="bg-white dark:bg-gray-800 shadow-sm rounded-xl">
            <div className="px-5 pt-5">
              <header className="flex justify-between items-start mb-6">
                <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-2">
                  Analysis Configuration
                </h2>
              </header>

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Repository Info */}
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-violet-100 dark:bg-violet-900/30 rounded-lg flex items-center justify-center">
                      <svg className="w-5 h-5 text-violet-600 dark:text-violet-400" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zm0 4a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1V8zm8 0a1 1 0 011-1h4a1 1 0 011 1v2a1 1 0 01-1 1h-4a1 1 0 01-1-1V8zm0 4a1 1 0 011-1h4a1 1 0 011 1v2a1 1 0 01-1 1h-4a1 1 0 01-1-1v-2z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-800 dark:text-gray-100">{repoName}</h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400">{repo.description || 'No description available'}</p>
                    </div>
                  </div>
                </div>

                {/* Time Period Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Analysis Period
                  </label>
                  <select
                    name="period"
                    value={selectedPeriod}
                    onChange={handleInputChange}
                    className="form-select w-full bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-800 dark:text-gray-100"
                  >
                    <option value="7">Last 7 days</option>
                    <option value="30">Last 30 days</option>
                    <option value="90">Last 90 days</option>
                    <option value="365">Last year</option>
                  </select>
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={isLoading}
                  className="btn w-full bg-violet-500 text-white hover:bg-violet-600 dark:bg-violet-600 dark:hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <svg className="fill-current shrink-0 mr-2" width="16" height="16" viewBox="0 0 16 16">
                        <path d="M8 0a8 8 0 1 1 0 16A8 8 0 0 1 8 0zM4.5 7.5a.5.5 0 0 0 0 1h5.793l-2.147 2.146a.5.5 0 0 0 .708.708l3-3a.5.5 0 0 0 0-.708l-3-3a.5.5 0 1 0-.708.708L10.293 7.5H4.5z"/>
                      </svg>
                      Generate Heatmaps
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>
        </div>

        {/* Results Panel */}
        <div className="col-span-12 lg:col-span-8">
          {heatmapError && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-6 mb-6">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3 flex-1">
                  <h3 className="text-sm font-medium text-red-800 dark:text-red-200">
                    Error loading heatmap data
                  </h3>
                  <div className="mt-2 text-sm text-red-700 dark:text-red-300">
                    {heatmapError}
                  </div>
                  {heatmapError.includes('Access denied') && (
                    <div className="mt-3">
                      <button
                        onClick={() => {
                          window.location.href = '/api/auth/signout'
                        }}
                        className="inline-flex items-center gap-2 bg-red-600 text-white px-3 py-1.5 rounded text-xs font-medium hover:bg-red-700 transition-colors"
                      >
                        🔄 Refresh Token
                      </button>
                    </div>
                  )}
                  {heatmapError.includes('Repository not found') && (
                    <div className="mt-3">
                      <button
                        onClick={() => {
                          setHeatmapError(null)
                          setHeatmapData(null)
                        }}
                        className="inline-flex items-center gap-2 bg-blue-600 text-white px-3 py-1.5 rounded text-xs font-medium hover:bg-blue-700 transition-colors"
                      >
                        🔄 Try Different Repository
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {!heatmapData && !heatmapError && (
            <div className="bg-white dark:bg-gray-800 shadow-sm rounded-xl p-6">
              <div className="text-center py-12">
                <svg className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-gray-100">No heatmap data</h3>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  Select a time period and click "Generate Heatmaps" to view contribution patterns for {repoName}.
                </p>
              </div>
            </div>
          )}

          {heatmapData && (
            <div className="space-y-6">
              {/* Check if repository has any data */}
              {heatmapData.summary.totalCommits === 0 && heatmapData.summary.totalIssues === 0 && heatmapData.summary.totalPullRequests === 0 ? (
                <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl p-6">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                        No Activity Found
                      </h3>
                      <div className="mt-2 text-sm text-yellow-700 dark:text-yellow-300">
                        This repository has no commits, issues, or pull requests in the selected time period. Try selecting a longer time period.
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  {/* Time of Day Activity */}
                  <div className="bg-white dark:bg-gray-800 shadow-sm rounded-xl p-6">
                    <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4">
                      Time of Day Activity
                    </h3>
                    <TimeOfDayChart data={heatmapData.timeOfDayActivity} />
                  </div>

              {/* Geographic Distribution */}
              <div className="bg-white dark:bg-gray-800 shadow-sm rounded-xl p-6">
                <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4">
                  Geographic Distribution
                </h3>
                <GeographicChart data={heatmapData.geographicDistribution} />
              </div>

              {/* Busiest Days/Weeks */}
              <div className="bg-white dark:bg-gray-800 shadow-sm rounded-xl p-6">
                <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4">
                  Busiest Days & Weeks
                </h3>
                <BusiestDaysChart data={heatmapData.busiestDays} />
              </div>

              {/* Response Time Metrics */}
              <div className="bg-white dark:bg-gray-800 shadow-sm rounded-xl p-6">
                <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4">
                  Response Time Metrics
                </h3>
                <ResponseTimeChart data={heatmapData.responseMetrics} />
              </div>

              {/* Insights */}
              <div className="bg-white dark:bg-gray-800 shadow-sm rounded-xl p-6">
                <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4">
                  Insights & Recommendations
                </h3>
                <div className="space-y-4">
                  <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                    <h4 className="font-medium text-blue-800 dark:text-blue-200 mb-2">Optimal Release Times</h4>
                    <p className="text-sm text-blue-700 dark:text-blue-300">
                      Based on contribution patterns, the best times for releases are around {heatmapData.timeOfDayActivity.hourlyData[heatmapData.timeOfDayActivity.peakHour]?.label || 'peak hours'} UTC. 
                      Consider scheduling releases during high-activity periods for maximum visibility.
                    </p>
                  </div>
                  <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                    <h4 className="font-medium text-green-800 dark:text-green-200 mb-2">Community Availability</h4>
                    <p className="text-sm text-green-700 dark:text-green-300">
                      Your community is most active on {heatmapData.busiestDays.find(d => d.count === Math.max(...heatmapData.busiestDays.map(d => d.count)))?.dayName || 'weekdays'}. 
                      Consider scheduling important discussions during these times for better engagement.
                    </p>
                  </div>
                  <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg p-4">
                    <h4 className="font-medium text-purple-800 dark:text-purple-200 mb-2">Maintainer Coverage</h4>
                    <p className="text-sm text-purple-700 dark:text-purple-300">
                      Current response rate: {Math.round((heatmapData.responseMetrics.issues.responseRate + heatmapData.responseMetrics.pullRequests.responseRate) / 2)}%. 
                      {Math.round((heatmapData.responseMetrics.issues.responseRate + heatmapData.responseMetrics.pullRequests.responseRate) / 2) < 70 && 
                        ' Consider expanding maintainer coverage during low-activity periods.'}
                    </p>
                  </div>
                  <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
                    <h4 className="font-medium text-amber-800 dark:text-amber-200 mb-2">Geographic Insights</h4>
                    <p className="text-sm text-amber-700 dark:text-amber-300">
                      Your community spans across {heatmapData.geographicDistribution.filter(d => d.count > 0).length} major regions, 
                      with {heatmapData.geographicDistribution.find(d => d.count === Math.max(...heatmapData.geographicDistribution.map(d => d.count)))?.region || 'multiple regions'} 
                      contributing {Math.max(...heatmapData.geographicDistribution.map(d => d.percentage))}% of activity.
                    </p>
                  </div>
                </div>
              </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

