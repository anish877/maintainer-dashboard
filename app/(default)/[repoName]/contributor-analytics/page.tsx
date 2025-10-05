'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { useContributorAnalytics } from '@/hooks/use-contributor-analytics'
import { ContributorMetrics } from '@/app/(default)/contributor-analytics/components/contributor-metrics'
import { ContributorList } from '@/app/(default)/contributor-analytics/components/contributor-list'
import { ContributorInsights } from '@/app/(default)/contributor-analytics/components/contributor-insights'
import { ContributionTrend } from '@/app/(default)/contributor-analytics/components/contribution-trend'
import { useToastNotifications } from '@/lib/toast'

type ActiveTab = 'overview' | 'contributors' | 'insights' | 'trends'

export default function RepoContributorAnalyticsPage() {
  const { data: session } = useSession()
  const params = useParams()
  const router = useRouter()
  const repoName = params.repoName as string
  const { success, error: showError } = useToastNotifications()
  
  const [selectedRepo, setSelectedRepo] = useState('')
  const [repo, setRepo] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<ActiveTab>('overview')
  const [timeRange, setTimeRange] = useState('30d')
  const [isAnalyzing, setIsAnalyzing] = useState(false)

  const selectedRepoId = selectedRepo ? repo?.id : undefined
  
  const { 
    analytics, 
    loading: analyticsLoading, 
    error: analyticsError,
    fetchAnalytics,
    analyzeContributors 
  } = useContributorAnalytics(selectedRepoId, timeRange)

  useEffect(() => {
    if (repoName) {
      fetchRepoData()
    }
  }, [repoName])

  useEffect(() => {
    if (selectedRepo) {
      handleAnalyzeContributors()
    }
  }, [selectedRepo])

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
      setSelectedRepo(repoName) // Auto-select the repo from URL
    } catch (err) {
      console.error('Error fetching repo data:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch repository data')
    } finally {
      setLoading(false)
    }
  }

  const handleAnalyzeContributors = async () => {
    if (!selectedRepoId || !repo) return
    
    console.log('Analyzing contributors for:', {
      selectedRepo,
      selectedRepoId: repo.id,
      repoName
    })
    
    setIsAnalyzing(true)
    
    try {
      await analyzeContributors(repo.id)
      success(`✅ Successfully analyzed contributors in ${selectedRepo}`)
      
    } catch (error) {
      console.error('Analysis failed:', error)
      showError(`❌ Analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setIsAnalyzing(false)
    }
  }

  const handleTimeRangeChange = (range: string) => {
    setTimeRange(range)
  }

  if (loading) {
    return (
      <div className="px-4 sm:px-6 lg:px-8 py-8 w-full max-w-[96rem] mx-auto">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto mb-4"></div>
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
              {isCollaboratorError ? '👥' : '⚠️'}
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
              className="inline-flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-emerald-700 transition-colors"
            >
              ← Go Back
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (!session) {
    return (
      <div className="px-4 sm:px-6 lg:px-8 py-8 w-full max-w-[96rem] mx-auto">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-8">
          <div className="flex items-center">
            <div className="w-12 h-12 bg-red-100 dark:bg-red-900/20 rounded-xl flex items-center justify-center mr-4">
              <svg className="w-6 h-6 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-red-800 dark:text-red-200">
                Authentication Required
              </h3>
              <p className="text-red-700 dark:text-red-300 mt-1">
                Please sign in with GitHub to use the Contributor Health Analytics.
              </p>
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
        {/* Left: Title with back button */}
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
            👥 Contributor Health Analytics
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Track contributor metrics and health for <strong>{repo.name}</strong>
          </p>
        </div>

        {/* Right: Repository info */}
        <div className="text-right">
          <div className="text-sm text-gray-500 dark:text-gray-400">
            {repo.open_issues_count} open issues
          </div>
          <div className="text-xs text-gray-400 dark:text-gray-500">
            {repo.owner.login}/{repo.name}
          </div>
        </div>
      </div>

      {/* Repository Confirmation */}
      <div className="bg-white dark:bg-gray-800 shadow-sm rounded-xl border border-gray-200 dark:border-gray-700 p-6 mb-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <div className="w-3 h-3 rounded-full mr-3 bg-green-500"></div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                Repository Selected
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                Analyzing: <strong>{selectedRepo}</strong>
              </p>
            </div>
          </div>
          <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
            <span className="mr-4">⭐ {repo.stargazers_count}</span>
            <span className="mr-4">🔧 {repo.language || 'N/A'}</span>
            <span>{repo.private ? 'Private' : 'Public'}</span>
          </div>
        </div>
      </div>

      {/* Professional Navigation Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700 mb-8">
        <nav className="-mb-px flex space-x-8">
          {[
            { 
              id: 'overview', 
              label: 'Overview', 
              icon: '📊',
              description: 'Key metrics and health distribution'
            },
            { 
              id: 'contributors', 
              label: 'Contributors', 
              icon: '👥',
              description: 'Individual contributor analysis'
            },
            { 
              id: 'insights', 
              label: 'Insights', 
              icon: '💡',
              description: 'AI-powered contributor insights'
            },
            { 
              id: 'trends', 
              label: 'Trends', 
              icon: '📈',
              description: 'Contribution patterns over time'
            }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as ActiveTab)}
              className={`py-3 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === tab.id
                  ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="text-lg">{tab.icon}</span>
                <div className="text-left">
                  <div className="font-semibold">{tab.label}</div>
                  <div className="text-xs opacity-75">{tab.description}</div>
                </div>
              </div>
            </button>
          ))}
        </nav>
      </div>

      {/* Time Range Selection */}
      <div className="bg-white dark:bg-gray-800 shadow-sm rounded-xl border border-gray-200 dark:border-gray-700 p-6 mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
              Analysis Configuration
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-300">
              Configure the time range for contributor analysis
            </p>
          </div>
          <div className="flex items-center space-x-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Time Range
            </label>
            <select
              value={timeRange}
              onChange={(e) => handleTimeRangeChange(e.target.value)}
              className="form-input"
              disabled={isAnalyzing || analyticsLoading}
            >
              <option value="7d">Last 7 days</option>
              <option value="30d">Last 30 days</option>
              <option value="90d">Last 90 days</option>
              <option value="1y">Last year</option>
            </select>
          </div>
        </div>

        {/* Progress Indicator */}
        {(isAnalyzing || analyticsLoading) && (
          <div className="mt-6">
            <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400 mb-2">
              <span>{isAnalyzing ? 'Analyzing contributors...' : 'Loading analytics...'}</span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div className="bg-gradient-to-r from-emerald-500 to-teal-600 h-2 rounded-full animate-pulse"></div>
            </div>
          </div>
        )}
      </div>

      {/* Error State */}
      {analyticsError && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-6 mb-8">
          <div className="flex items-center">
            <div className="w-12 h-12 bg-red-100 dark:bg-red-900/20 rounded-xl flex items-center justify-center mr-4">
              <svg className="w-6 h-6 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-red-800 dark:text-red-200">
                Error Loading Analytics
              </h3>
              <p className="text-red-700 dark:text-red-300 mt-1">
                {analyticsError}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Tab Content */}
      {activeTab === 'overview' && analytics && (
        <ContributorMetrics 
          metrics={analytics.metrics}
          healthDistribution={analytics.healthDistribution}
          repository={analytics.repository}
          timeRange={analytics.timeRange}
        />
      )}

      {activeTab === 'contributors' && analytics && (
        <ContributorList 
          contributors={analytics.contributors}
          repository={analytics.repository}
          timeRange={analytics.timeRange}
        />
      )}

      {activeTab === 'insights' && analytics && (
        <ContributorInsights 
          insights={analytics.insights}
          repository={analytics.repository}
          timeRange={analytics.timeRange}
        />
      )}

      {activeTab === 'trends' && analytics && (
        <ContributionTrend 
          trend={analytics.contributionTrend}
          repository={analytics.repository}
          timeRange={analytics.timeRange}
        />
      )}

      {/* Empty State */}
      {!analytics && !analyticsLoading && !analyticsError && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-12 text-center">
          <div className="w-20 h-20 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
          <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
            Ready to Analyze Contributors
          </h3>
          <p className="text-gray-600 dark:text-gray-400 max-w-md mx-auto">
            Contributors are being analyzed automatically for this repository.
          </p>
        </div>
      )}
    </div>
  )
}
