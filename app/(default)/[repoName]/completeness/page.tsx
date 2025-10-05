'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { useToastNotifications } from '@/lib/toast'
import { Users, AlertTriangle, CheckCircle, Rocket, RefreshCw, Settings } from 'lucide-react'

interface AnalysisResults {
  repository: {
    owner: string
    repo: string
    fullName: string
  }
  metrics: {
    totalIssues: number
    analyzedIssues: number
    completeIssues: number
    incompleteIssues: number
    averageQualityScore: number
    completenessRate: number
    highQualityCount: number
    lowQualityCount: number
    analysisSuccessRate: number
  }
  issues: Array<{
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
  }>
  message: string
}

type ActiveTab = 'analyze' | 'approve' | 'templates'

export default function RepoCompletenessPage() {
  const params = useParams()
  const router = useRouter()
  const { data: session, status } = useSession()
  const { success, error: showError } = useToastNotifications()
  const repoName = params.repoName as string
  
  const [repo, setRepo] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<ActiveTab>('analyze')
  const [analysisResults, setAnalysisResults] = useState<AnalysisResults | null>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [progress, setProgress] = useState({ current: 0, total: 0 })
  const [refreshApprovalQueue, setRefreshApprovalQueue] = useState(0)

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

  const handleAnalyzeRepository = async () => {
    if (!repo) return
    
    setIsAnalyzing(true)
    setAnalysisResults(null)
    setProgress({ current: 0, total: 0 })
    
    try {
      const [owner, repoName] = repo.full_name.split('/')
      
      // Start analysis with progress tracking
      const response = await fetch('/api/completeness/analyze-repository', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          owner, 
          repo: repoName,
          includeComments: true,
          batchSize: 5, // Smaller batches for better UX
          trackProgress: true
        })
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        if (errorData.code === 'NO_TEMPLATES_AVAILABLE') {
          throw new Error('No templates configured. Please create templates first in the Template Manager tab.')
        }
        if (errorData.code === 'REPOSITORY_NOT_FOUND') {
          throw new Error('Repository not found in database. Please sync your repositories first by visiting the Repositories page.')
        }
        throw new Error(errorData.error || 'Analysis failed')
      }
      
      const data = await response.json()
      setAnalysisResults(data)
      
      success(`✅ Successfully analyzed ${data.issues.length} issues in ${data.repository.fullName}`)
      
    } catch (error) {
      console.error('Analysis failed:', error)
      showError(`❌ Analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setIsAnalyzing(false)
      setProgress({ current: 0, total: 0 })
    }
  }

  const handleRequestComment = async (issueNumber: number, templateId?: string) => {
    if (!repo || !analysisResults) return
    
    try {
      const [owner, repoName] = repo.full_name.split('/')
      
      const response = await fetch('/api/completeness/request-comment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          owner,
          repo: repoName,
          issueNumber,
          templateId
        })
      })
      
      const data = await response.json()
      
      if (!response.ok) {
        if (data.code === 'NO_TEMPLATES_AVAILABLE') {
          throw new Error('No templates configured. Please create templates first in the Template Manager tab.')
        }
        throw new Error(data.error || 'Failed to request comment')
      }
      
      success(`✅ Comment request created for issue #${issueNumber}`)
      
      // Switch to approval tab to show the new pending comment
      setActiveTab('approve')
      // Trigger refresh of approval queue
      setRefreshApprovalQueue(prev => prev + 1)
      
    } catch (error) {
      console.error('Comment request failed:', error)
      showError(`❌ Failed to request comment: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  if (loading) {
    return (
      <div className="px-4 sm:px-6 lg:px-8 py-8 w-full max-w-[96rem] mx-auto">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-violet-600 mx-auto mb-4"></div>
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
              className="inline-flex items-center gap-2 bg-violet-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-violet-700 transition-colors"
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
              <p className="text-sm text-red-700 dark:text-red-300 mt-1">Please sign in to use the Issue Completeness Checker.</p>
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
          <div className="w-16 h-16 bg-gradient-to-br from-violet-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg">
            <CheckCircle className="w-8 h-8 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
              Issue Completeness Checker
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2 max-w-2xl">
              Analyze repository issues for completeness and maintain quality standards with AI-powered workflows and maintainer approval.
            </p>
          </div>
        </div>

        {/* Repository Info */}
        <div className="bg-white dark:bg-gray-800 shadow-sm rounded-xl border border-gray-200 dark:border-gray-700 p-6 mb-6">
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
              onClick={() => router.back()}
              className="inline-flex items-center gap-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
            >
              ← Back
            </button>
          </div>
        </div>

        {/* Professional Navigation Tabs */}
        <div className="border-b border-gray-200 dark:border-gray-700">
          <nav className="-mb-px flex space-x-8">
            {[
              { 
                id: 'analyze', 
                label: 'Analyze Issues', 
                icon: '🔍',
                description: 'Analyze repository issues for completeness'
              },
              { 
                id: 'approve', 
                label: 'Approval Queue', 
                icon: '✅',
                description: 'Review and approve automated comments'
              },
              { 
                id: 'templates', 
                label: 'Template Manager', 
                icon: '📝',
                description: 'Create and manage comment templates'
              }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as ActiveTab)}
                className={`py-3 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === tab.id
                    ? 'border-violet-500 text-violet-600 dark:text-violet-400'
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

      {/* Analysis Controls */}
      {activeTab === 'analyze' && (
        <div className="bg-white dark:bg-gray-800 shadow-sm rounded-xl border border-gray-200 dark:border-gray-700 mb-8">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Repository Analysis
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Choose a repository to analyze issues for completeness
            </p>
          </div>
          <div className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                  Start Analysis
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  AI will analyze all open issues in this repository for completeness and quality.
                </p>
              </div>
              <button
                onClick={handleAnalyzeRepository}
                disabled={isAnalyzing}
                className="btn bg-gradient-to-r from-violet-500 to-purple-600 text-white hover:from-violet-600 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
              >
                {isAnalyzing ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Analyzing...
                  </>
                ) : (
                  <>
                    <Rocket className="w-4 h-4 mr-2" />
                    Start Analysis
                  </>
                )}
              </button>
            </div>

            {/* Progress Indicator */}
            {isAnalyzing && (
              <div className="mt-6">
                <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400 mb-2">
                  <span>Analyzing issues...</span>
                  <span>{progress.current} / {progress.total}</span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div 
                    className="bg-gradient-to-r from-violet-500 to-purple-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${progress.total > 0 ? (progress.current / progress.total) * 100 : 0}%` }}
                  ></div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab Content */}
      {activeTab === 'analyze' && (
        <>
          {analysisResults && (
            <div className="bg-white dark:bg-gray-800 shadow-sm rounded-xl p-6 mb-8">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Analysis Results</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                    {analysisResults.metrics.totalIssues}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">Total Issues</div>
                </div>
                <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                    {analysisResults.metrics.completeIssues}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">Complete</div>
                </div>
                <div className="text-center p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                  <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                    {analysisResults.metrics.incompleteIssues}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">Incomplete</div>
                </div>
                <div className="text-center p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                  <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                    {Math.round(analysisResults.metrics.completenessRate)}%
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">Completeness Rate</div>
                </div>
              </div>

              <div className="space-y-4">
                {analysisResults.issues.map((issue, index) => (
                  <div key={index} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <a 
                            href={issue.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-medium text-gray-900 dark:text-gray-100 hover:text-violet-600 dark:hover:text-violet-400"
                          >
                            #{issue.issueNumber} {issue.title}
                          </a>
                          <span className={`px-2 py-1 text-xs rounded-full ${
                            issue.isComplete 
                              ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                              : 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400'
                          }`}>
                            {issue.isComplete ? 'Complete' : 'Incomplete'}
                          </span>
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            Quality: {Math.round(issue.qualityScore)}/100
                          </span>
                        </div>
                        
                        {!issue.isComplete && issue.missingElements.length > 0 && (
                          <div className="mb-2">
                            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Missing elements:</p>
                            <div className="flex flex-wrap gap-1">
                              {issue.missingElements.map((element, idx) => (
                                <span key={idx} className="px-2 py-1 text-xs bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400 rounded">
                                  {element}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        {issue.suggestions.length > 0 && (
                          <div className="mb-2">
                            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Suggestions:</p>
                            <ul className="text-sm text-gray-600 dark:text-gray-400">
                              {issue.suggestions.map((suggestion, idx) => (
                                <li key={idx} className="mb-1">• {suggestion}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                      
                      <div className="ml-4">
                        <button
                          onClick={() => handleRequestComment(issue.issueNumber)}
                          className="btn-sm bg-violet-500 hover:bg-violet-600 text-white"
                        >
                          Request Comment
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {activeTab === 'approve' && (
        <div className="bg-white dark:bg-gray-800 shadow-sm rounded-xl p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Approval Queue</h2>
          <p className="text-gray-600 dark:text-gray-400">Review and approve automated comments for this repository.</p>
        </div>
      )}

      {activeTab === 'templates' && (
        <div className="bg-white dark:bg-gray-800 shadow-sm rounded-xl p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Template Manager</h2>
          <p className="text-gray-600 dark:text-gray-400">Create and manage comment templates for this repository.</p>
        </div>
      )}

      {/* Empty State for Analysis Tab */}
      {activeTab === 'analyze' && !analysisResults && !isAnalyzing && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-12 text-center">
          <div className="w-20 h-20 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-10 h-10 text-gray-400" />
          </div>
          <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
            Ready to Analyze Issues
          </h3>
          <p className="text-gray-600 dark:text-gray-400 max-w-md mx-auto">
            Click "Start Analysis" to begin analyzing issues for completeness in this repository.
          </p>
        </div>
      )}
    </div>
  )
}
