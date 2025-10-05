'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { useToastNotifications } from '@/lib/toast'
import { Users, AlertTriangle, Heart, Activity, TrendingUp, RefreshCw, BarChart3 } from 'lucide-react'

interface HealthMetrics {
  repository: {
    owner: string
    repo: string
    fullName: string
  }
  overallHealth: number
  metrics: {
    codeQuality: number
    communityHealth: number
    maintainability: number
    responsiveness: number
    documentation: number
  }
  insights: {
    strengths: string[]
    weaknesses: string[]
    recommendations: string[]
  }
  trends: {
    healthTrend: 'improving' | 'declining' | 'stable'
    lastUpdated: string
    nextCheck: string
  }
}

export default function RepoHealthPage() {
  const params = useParams()
  const router = useRouter()
  const { data: session, status } = useSession()
  const { success, error: showError } = useToastNotifications()
  const repoName = params.repoName as string
  
  const [repo, setRepo] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [healthMetrics, setHealthMetrics] = useState<HealthMetrics | null>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [lastChecked, setLastChecked] = useState<string | null>(null)

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
    } catch (err) {
      console.error('Error fetching repo data:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch repository data')
    } finally {
      setLoading(false)
    }
  }

  const analyzeHealth = async () => {
    if (!repo) return
    
    setIsAnalyzing(true)
    setHealthMetrics(null)
    
    try {
      const [owner, repoName] = repo.full_name.split('/')
      
      const response = await fetch('/api/health/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          owner, 
          repo: repoName
        })
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Health analysis failed')
      }
      
      const data = await response.json()
      setHealthMetrics(data)
      setLastChecked(new Date().toISOString())
      
      success(`✅ Health analysis completed for ${data.repository.fullName}`)
      
    } catch (error) {
      console.error('Health analysis failed:', error)
      showError(`❌ Health analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setIsAnalyzing(false)
    }
  }

  const getHealthColor = (score: number) => {
    if (score >= 80) return 'text-green-600 dark:text-green-400'
    if (score >= 60) return 'text-yellow-600 dark:text-yellow-400'
    if (score >= 40) return 'text-orange-600 dark:text-orange-400'
    return 'text-red-600 dark:text-red-400'
  }

  const getHealthBgColor = (score: number) => {
    if (score >= 80) return 'bg-green-50 dark:bg-green-900/20'
    if (score >= 60) return 'bg-yellow-50 dark:bg-yellow-900/20'
    if (score >= 40) return 'bg-orange-50 dark:bg-orange-900/20'
    return 'bg-red-50 dark:bg-red-900/20'
  }

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'improving': return <TrendingUp className="w-4 h-4 text-green-500" />
      case 'declining': return <TrendingUp className="w-4 h-4 text-red-500 rotate-180" />
      default: return <Activity className="w-4 h-4 text-gray-500" />
    }
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
              className="inline-flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-emerald-700 transition-colors"
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
              <p className="text-sm text-red-700 dark:text-red-300 mt-1">Please sign in to use the Repository Health Analytics.</p>
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
            <Heart className="w-5 h-5 mr-2" /> Repository Health Analytics
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Monitor repository health, community engagement, and maintainability for <strong>{repo.name}</strong>
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

      {/* Repository Info */}
      <div className="bg-white dark:bg-gray-800 shadow-sm rounded-xl border border-gray-200 dark:border-gray-700 p-6 mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Repository: {repo.full_name}
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              {repo.description || 'No description available'}
            </p>
            <div className="flex items-center mt-2 text-sm text-gray-500 dark:text-gray-400">
              <span className="mr-4">⭐ {repo.stargazers_count}</span>
              <span className="mr-4">🔧 {repo.language}</span>
              <span className="mr-4">📝 {repo.open_issues_count} open issues</span>
              <span>{repo.private ? '🔒 Private' : '🌐 Public'}</span>
            </div>
          </div>
          <button
            onClick={analyzeHealth}
            disabled={isAnalyzing}
            className="btn bg-gradient-to-r from-emerald-500 to-teal-600 text-white hover:from-emerald-600 hover:to-teal-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
          >
            {isAnalyzing ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Analyzing...
              </>
            ) : (
              <>
                <BarChart3 className="w-4 h-4 mr-2" />
                Analyze Health
              </>
            )}
          </button>
        </div>
      </div>

      {/* Health Metrics */}
      {healthMetrics && (
        <div className="space-y-8">
          {/* Overall Health Score */}
          <div className="bg-white dark:bg-gray-800 shadow-sm rounded-xl p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                Overall Health Score
              </h2>
              <div className="flex items-center space-x-2">
                {getTrendIcon(healthMetrics.trends.healthTrend)}
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  {healthMetrics.trends.healthTrend}
                </span>
              </div>
            </div>
            
            <div className="text-center">
              <div className={`inline-flex items-center justify-center w-32 h-32 rounded-full ${getHealthBgColor(healthMetrics.overallHealth)} mb-4`}>
                <div className="text-center">
                  <div className={`text-4xl font-bold ${getHealthColor(healthMetrics.overallHealth)}`}>
                    {Math.round(healthMetrics.overallHealth)}
                  </div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">/ 100</div>
                </div>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                {healthMetrics.overallHealth >= 80 ? 'Excellent' : 
                 healthMetrics.overallHealth >= 60 ? 'Good' : 
                 healthMetrics.overallHealth >= 40 ? 'Fair' : 'Needs Improvement'}
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                Repository health analysis completed
              </p>
            </div>
          </div>

          {/* Detailed Metrics */}
          <div className="bg-white dark:bg-gray-800 shadow-sm rounded-xl p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-6">
              Detailed Metrics
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {Object.entries(healthMetrics.metrics).map(([key, value]) => (
                <div key={key} className={`p-4 rounded-lg ${getHealthBgColor(value)}`}>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-medium text-gray-900 dark:text-gray-100 capitalize">
                      {key.replace(/([A-Z])/g, ' $1').trim()}
                    </h3>
                    <span className={`text-lg font-bold ${getHealthColor(value)}`}>
                      {Math.round(value)}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full transition-all duration-300 ${
                        value >= 80 ? 'bg-green-500' :
                        value >= 60 ? 'bg-yellow-500' :
                        value >= 40 ? 'bg-orange-500' : 'bg-red-500'
                      }`}
                      style={{ width: `${value}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Insights */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Strengths */}
            <div className="bg-white dark:bg-gray-800 shadow-sm rounded-xl p-6">
              <h3 className="text-lg font-semibold text-green-600 dark:text-green-400 mb-4 flex items-center">
                <TrendingUp className="w-5 h-5 mr-2" />
                Strengths
              </h3>
              <ul className="space-y-2">
                {healthMetrics.insights.strengths.map((strength, index) => (
                  <li key={index} className="text-sm text-gray-600 dark:text-gray-400 flex items-start">
                    <span className="text-green-500 mr-2">✓</span>
                    {strength}
                  </li>
                ))}
              </ul>
            </div>

            {/* Weaknesses */}
            <div className="bg-white dark:bg-gray-800 shadow-sm rounded-xl p-6">
              <h3 className="text-lg font-semibold text-red-600 dark:text-red-400 mb-4 flex items-center">
                <AlertTriangle className="w-5 h-5 mr-2" />
                Areas for Improvement
              </h3>
              <ul className="space-y-2">
                {healthMetrics.insights.weaknesses.map((weakness, index) => (
                  <li key={index} className="text-sm text-gray-600 dark:text-gray-400 flex items-start">
                    <span className="text-red-500 mr-2">⚠</span>
                    {weakness}
                  </li>
                ))}
              </ul>
            </div>

            {/* Recommendations */}
            <div className="bg-white dark:bg-gray-800 shadow-sm rounded-xl p-6">
              <h3 className="text-lg font-semibold text-blue-600 dark:text-blue-400 mb-4 flex items-center">
                <Heart className="w-5 h-5 mr-2" />
                Recommendations
              </h3>
              <ul className="space-y-2">
                {healthMetrics.insights.recommendations.map((recommendation, index) => (
                  <li key={index} className="text-sm text-gray-600 dark:text-gray-400 flex items-start">
                    <span className="text-blue-500 mr-2">💡</span>
                    {recommendation}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Trends */}
          <div className="bg-white dark:bg-gray-800 shadow-sm rounded-xl p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
              Health Trends
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-1">
                  {healthMetrics.trends.healthTrend}
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400">Current Trend</div>
              </div>
              <div className="text-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-1">
                  {new Date(healthMetrics.trends.lastUpdated).toLocaleDateString()}
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400">Last Updated</div>
              </div>
              <div className="text-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-1">
                  {new Date(healthMetrics.trends.nextCheck).toLocaleDateString()}
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400">Next Check</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!healthMetrics && !isAnalyzing && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-12 text-center">
          <div className="w-20 h-20 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-6">
            <Heart className="w-10 h-10 text-gray-400" />
          </div>
          <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
            Ready to Analyze Repository Health
          </h3>
          <p className="text-gray-600 dark:text-gray-400 max-w-md mx-auto">
            Click "Analyze Health" to get comprehensive insights into your repository's health, community engagement, and maintainability.
          </p>
        </div>
      )}
    </div>
  )
}
