'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useGitHubRepos } from '@/hooks/use-github-repos'
import { useContributorAnalytics } from '@/hooks/use-contributor-analytics'
import { ContributorMetrics } from './components/contributor-metrics'
import { ContributorList } from './components/contributor-list'
import { ContributorInsights } from './components/contributor-insights'
import { ContributionTrend } from './components/contribution-trend'
import { useToastNotifications } from '@/lib/toast'

type ActiveTab = 'overview' | 'contributors' | 'insights' | 'trends'

export default function ContributorAnalyticsPage() {
  const { data: session } = useSession()
  const { repos, loading: reposLoading, refetch: refetchRepos } = useGitHubRepos()
  const { success, error: showError } = useToastNotifications()
  
  const [selectedRepo, setSelectedRepo] = useState('')
  const [activeTab, setActiveTab] = useState<ActiveTab>('overview')
  const [timeRange, setTimeRange] = useState('30d')
  const [isAnalyzing, setIsAnalyzing] = useState(false)

  const selectedRepoId = selectedRepo ? repos.find(r => r.fullName === selectedRepo)?.id : undefined
  
  const { 
    analytics, 
    loading: analyticsLoading, 
    error: analyticsError,
    fetchAnalytics,
    analyzeContributors 
  } = useContributorAnalytics(selectedRepoId, timeRange)

  const handleRepoChange = (repoFullName: string) => {
    setSelectedRepo(repoFullName)
  }

  const handleAnalyzeContributors = async () => {
    if (!selectedRepoId) return
    
    console.log('Analyzing contributors for:', {
      selectedRepo,
      selectedRepoId,
      repos: repos.map(r => ({ id: r.id, fullName: r.fullName }))
    })
    
    setIsAnalyzing(true)
    
    try {
      await analyzeContributors(selectedRepoId)
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
      {/* Professional Header */}
      <div className="mb-8">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl flex items-center justify-center shadow-lg">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
              Contributor Health Analytics
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2 max-w-2xl">
              Track contributor metrics, identify at-risk contributors, recognize rising stars, and monitor diversity across your repositories.
            </p>
          </div>
        </div>

        {/* Professional Navigation Tabs */}
        <div className="border-b border-gray-200 dark:border-gray-700">
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
      </div>

      {/* Repository Selection */}
      <div className="bg-white dark:bg-gray-800 shadow-sm rounded-xl border border-gray-200 dark:border-gray-700 mb-8">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Repository Selection
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Choose a repository to analyze contributor health metrics
          </p>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Select Repository
              </label>
              {reposLoading ? (
                <div className="form-input w-full flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-emerald-500 mr-3"></div>
                  Loading repositories...
                </div>
              ) : (
                <select
                  value={selectedRepo}
                  onChange={(e) => handleRepoChange(e.target.value)}
                  className="form-input w-full"
                  disabled={isAnalyzing || analyticsLoading}
                >
                  <option value="">Choose a repository...</option>
                  {repos.map((repo) => (
                    <option key={repo.id} value={repo.fullName}>
                      {repo.fullName} {repo.visibility === 'Private' ? '🔒' : '🌐'} ({repo.openIssues} open issues)
                    </option>
                  ))}
                </select>
              )}
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Time Range
              </label>
              <select
                value={timeRange}
                onChange={(e) => handleTimeRangeChange(e.target.value)}
                className="form-input w-full"
                disabled={isAnalyzing || analyticsLoading}
              >
                <option value="7d">Last 7 days</option>
                <option value="30d">Last 30 days</option>
                <option value="90d">Last 90 days</option>
                <option value="1y">Last year</option>
              </select>
            </div>
            
            <div className="flex items-end space-x-2">
              <button
                onClick={refetchRepos}
                disabled={reposLoading}
                className="btn bg-gray-500 hover:bg-gray-600 text-white disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
              >
                {reposLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Syncing...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Refresh Repos
                  </>
                )}
              </button>
              <button
                onClick={handleAnalyzeContributors}
                disabled={!selectedRepoId || isAnalyzing || analyticsLoading}
                className="btn bg-gradient-to-r from-emerald-500 to-teal-600 text-white hover:from-emerald-600 hover:to-teal-700 flex-1 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
              >
                {isAnalyzing ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Analyzing...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                    Analyze Contributors
                  </>
                )}
              </button>
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
            Select a repository above and click "Analyze Contributors" to begin tracking contributor health metrics.
          </p>
        </div>
      )}
    </div>
  )
}
