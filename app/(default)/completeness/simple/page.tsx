'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useGitHubRepos } from '@/hooks/use-github-repos'
import { useToastNotifications } from '@/lib/toast'

interface SimpleAnalysisResult {
  issueNumber: number
  title: string
  url: string
  author: string
  createdAt: string
  updatedAt: string
  labels: string[]
  completeness: {
    overallScore: number
    confidence: number
    missingElements: string[]
    suggestions: string[]
    needsImage: boolean
    isComplete: boolean
    reasoning: string
  }
  generatedComment?: {
    content: string
    isHelpful: boolean
    tone: string
  }
}

interface RepositoryAnalysisResponse {
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
    needsCommentsCount: number
  }
  issues: SimpleAnalysisResult[]
  message: string
}

export default function SimpleCompletenessPage() {
  const { data: session } = useSession()
  const { repos, loading: reposLoading } = useGitHubRepos()
  const { success, error: showError } = useToastNotifications()
  
  const [selectedRepo, setSelectedRepo] = useState('')
  const [analysisResults, setAnalysisResults] = useState<RepositoryAnalysisResponse | null>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [editingComments, setEditingComments] = useState<Record<number, string>>({})
  const [postingComments, setPostingComments] = useState<Set<number>>(new Set())

  const handleAnalyzeRepository = async () => {
    if (!selectedRepo) return
    
    setIsAnalyzing(true)
    setAnalysisResults(null)
    
    try {
      const [owner, repo] = selectedRepo.split('/')
      
      const response = await fetch('/api/completeness/simple-analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ owner, repo })
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Analysis failed')
      }
      
      const data = await response.json()
      setAnalysisResults(data)
      
      // Initialize editing comments with generated comments
      const initialEditingComments: Record<number, string> = {}
      data.issues.forEach((issue: SimpleAnalysisResult) => {
        if (issue.generatedComment) {
          initialEditingComments[issue.issueNumber] = issue.generatedComment.content
        }
      })
      setEditingComments(initialEditingComments)
      
      success(`✅ Successfully analyzed ${data.issues.length} issues in ${data.repository.fullName}`)
      
    } catch (error) {
      console.error('Analysis failed:', error)
      showError(`❌ Analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setIsAnalyzing(false)
    }
  }

  const handleCommentEdit = (issueNumber: number, comment: string) => {
    setEditingComments(prev => ({
      ...prev,
      [issueNumber]: comment
    }))
  }

  const handlePostComment = async (issueNumber: number) => {
    if (!selectedRepo || !analysisResults) return
    
    const comment = editingComments[issueNumber]
    if (!comment?.trim()) return
    
    setPostingComments(prev => new Set([...prev, issueNumber]))
    
    try {
      const [owner, repo] = selectedRepo.split('/')
      
      const response = await fetch('/api/completeness/post-comment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          owner,
          repo,
          issueNumber,
          comment: comment.trim()
        })
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to post comment')
      }
      
      success(`✅ Comment posted to issue #${issueNumber}`)
      
      // Remove the comment from editing state
      setEditingComments(prev => {
        const newState = { ...prev }
        delete newState[issueNumber]
        return newState
      })
      
      // Update the analysis results to mark this issue as commented
      setAnalysisResults(prev => {
        if (!prev) return prev
        return {
          ...prev,
          issues: prev.issues.map(issue => 
            issue.issueNumber === issueNumber
              ? { ...issue, generatedComment: undefined } // Remove generated comment
              : issue
          ),
          metrics: {
            ...prev.metrics,
            needsCommentsCount: Math.max(0, prev.metrics.needsCommentsCount - 1)
          }
        }
      })
      
    } catch (error) {
      console.error('Comment posting failed:', error)
      showError(`❌ Failed to post comment: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setPostingComments(prev => {
        const newSet = new Set(prev)
        newSet.delete(issueNumber)
        return newSet
      })
    }
  }

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600 bg-green-100 dark:text-green-400 dark:bg-green-900/20'
    if (score >= 60) return 'text-yellow-600 bg-yellow-100 dark:text-yellow-400 dark:bg-yellow-900/20'
    if (score >= 40) return 'text-orange-600 bg-orange-100 dark:text-orange-400 dark:bg-orange-900/20'
    return 'text-red-600 bg-red-100 dark:text-red-400 dark:bg-red-900/20'
  }

  const getScoreLabel = (score: number) => {
    if (score >= 80) return 'Complete'
    if (score >= 60) return 'Good'
    if (score >= 40) return 'Fair'
    return 'Needs Work'
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
                Please sign in with GitHub to use the Issue Completeness Checker.
              </p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-8 w-full max-w-[96rem] mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
              Simple Issue Completeness Checker
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2 max-w-2xl">
              Select a repository and let AI analyze issues for completeness. Review and approve helpful comments to improve issue quality.
            </p>
          </div>
        </div>
      </div>

      {/* Repository Selection */}
      <div className="bg-white dark:bg-gray-800 shadow-sm rounded-xl border border-gray-200 dark:border-gray-700 mb-8">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Repository Selection
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Choose a repository to analyze issues for completeness
          </p>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="md:col-span-3">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Select Repository
              </label>
              {reposLoading ? (
                <div className="form-input w-full flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500 mr-3"></div>
                  Loading repositories...
                </div>
              ) : (
                <select
                  value={selectedRepo}
                  onChange={(e) => setSelectedRepo(e.target.value)}
                  className="form-input w-full"
                  disabled={isAnalyzing}
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
            
            <div className="flex items-end">
              <button
                onClick={handleAnalyzeRepository}
                disabled={!selectedRepo || isAnalyzing || reposLoading}
                className="btn bg-gradient-to-r from-blue-500 to-purple-600 text-white hover:from-blue-600 hover:to-purple-700 w-full disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
              >
                {isAnalyzing ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Analyzing...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    Analyze Issues
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Analysis Results */}
      {analysisResults && (
        <>
          {/* Metrics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Issues</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{analysisResults.metrics.totalIssues}</p>
                </div>
                <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/20 rounded-xl flex items-center justify-center">
                  <svg className="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Complete Issues</p>
                  <p className="text-2xl font-bold text-green-600 dark:text-green-400">{analysisResults.metrics.completeIssues}</p>
                </div>
                <div className="w-12 h-12 bg-green-100 dark:bg-green-900/20 rounded-xl flex items-center justify-center">
                  <svg className="w-6 h-6 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Average Score</p>
                  <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">{analysisResults.metrics.averageQualityScore}/100</p>
                </div>
                <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/20 rounded-xl flex items-center justify-center">
                  <svg className="w-6 h-6 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Need Comments</p>
                  <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">{analysisResults.metrics.needsCommentsCount}</p>
                </div>
                <div className="w-12 h-12 bg-orange-100 dark:bg-orange-900/20 rounded-xl flex items-center justify-center">
                  <svg className="w-6 h-6 text-orange-600 dark:text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                </div>
              </div>
            </div>
          </div>

          {/* Issues List */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                Issue Analysis Results
              </h2>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                {analysisResults.message}
              </p>
            </div>
            
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {analysisResults.issues.map((issue) => (
                <div key={issue.issueNumber} className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <a
                          href={issue.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-lg font-semibold text-gray-900 dark:text-gray-100 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                        >
                          #{issue.issueNumber}: {issue.title}
                        </a>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getScoreColor(issue.completeness.overallScore)}`}>
                          {issue.completeness.overallScore}/100 - {getScoreLabel(issue.completeness.overallScore)}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400 mb-3">
                        <span>by @{issue.author}</span>
                        <span>•</span>
                        <span>{new Date(issue.createdAt).toLocaleDateString()}</span>
                        {issue.labels.length > 0 && (
                          <>
                            <span>•</span>
                            <div className="flex gap-1">
                              {issue.labels.slice(0, 3).map((label) => (
                                <span key={label} className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded text-xs">
                                  {label}
                                </span>
                              ))}
                              {issue.labels.length > 3 && (
                                <span className="text-xs">+{issue.labels.length - 3} more</span>
                              )}
                            </div>
                          </>
                        )}
                      </div>

                      {issue.completeness.missingElements.length > 0 && (
                        <div className="mb-3">
                          <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Missing Elements:</p>
                          <div className="flex flex-wrap gap-1">
                            {issue.completeness.missingElements.map((element) => (
                              <span key={element} className="px-2 py-1 bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-300 rounded text-xs">
                                {element}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {issue.completeness.needsImage && (
                        <div className="mb-3">
                          <span className="inline-flex items-center px-2 py-1 bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded text-xs">
                            📸 Needs Screenshot/Image
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {issue.generatedComment && (
                    <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
                      <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Generated Comment:
                      </h4>
                      <textarea
                        value={editingComments[issue.issueNumber] || ''}
                        onChange={(e) => handleCommentEdit(issue.issueNumber, e.target.value)}
                        className="w-full p-3 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 resize-none"
                        rows={4}
                        placeholder="Edit the comment..."
                      />
                      <div className="flex justify-end mt-3">
                        <button
                          onClick={() => handlePostComment(issue.issueNumber)}
                          disabled={!editingComments[issue.issueNumber]?.trim() || postingComments.has(issue.issueNumber)}
                          className="btn bg-green-600 hover:bg-green-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {postingComments.has(issue.issueNumber) ? (
                            <>
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                              Posting...
                            </>
                          ) : (
                            <>
                              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                              </svg>
                              Post Comment
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Empty State */}
      {!analysisResults && !isAnalyzing && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-12 text-center">
          <div className="w-20 h-20 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
            Ready to Analyze Issues
          </h3>
          <p className="text-gray-600 dark:text-gray-400 max-w-md mx-auto">
            Select a repository above and click "Analyze Issues" to begin analyzing issues for completeness.
          </p>
        </div>
      )}
    </div>
  )
}
