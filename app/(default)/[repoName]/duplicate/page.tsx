'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { useToastNotifications } from '@/lib/toast'

interface DuplicateAnalysis {
  issueNumber: number;
  title: string;
  body: string;
  similarIssues: {
    issueNumber: number;
    title: string;
    similarity: number;
    reason: string;
    confidence: number;
  }[];
  analysis: {
    isDuplicate: boolean;
    confidence: number;
    reasoning: string;
    suggestedAction: 'mark_duplicate' | 'not_duplicate' | 'review_required';
  };
}

export default function DuplicateDetectionPage() {
  const params = useParams()
  const router = useRouter()
  const { data: session, status } = useSession()
  const { success, error: showError } = useToastNotifications()
  const repoName = params.repoName as string
  
  const [repo, setRepo] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [analysisResults, setAnalysisResults] = useState<DuplicateAnalysis[]>([])
  const [approvingIssues, setApprovingIssues] = useState<Set<number>>(new Set())
  const [analysisError, setAnalysisError] = useState<string | null>(null)

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
        throw new Error('Failed to fetch repository data')
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

  const analyzeDuplicates = async () => {
    setIsAnalyzing(true)
    setAnalysisError(null)
    setAnalysisResults([])

    try {
      const response = await fetch('/api/duplicate/analyze', {
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
        throw new Error(data.error || 'Failed to analyze duplicates')
      }

      setAnalysisResults(data.results)
      success(`🔍 Analysis complete! Found ${data.results.length} issues with potential duplicates.`)
    } catch (err) {
      setAnalysisError(err instanceof Error ? err.message : 'An error occurred during analysis')
    } finally {
      setIsAnalyzing(false)
    }
  }

  const approveAnalysis = async (issueNumber: number, action: 'mark_duplicate' | 'not_duplicate', duplicateOf?: number) => {
    setApprovingIssues(prev => new Set(prev).add(issueNumber))
    
    try {
      const response = await fetch('/api/duplicate/apply', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          owner: repo.owner.login,
          repo: repo.name,
          issueNumber,
          action,
          duplicateOf,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to apply duplicate analysis')
      }

      // Remove this issue from results
      setAnalysisResults(prev => prev.filter(result => result.issueNumber !== issueNumber))
      
      if (action === 'mark_duplicate' && duplicateOf) {
        success(`✅ Marked issue #${issueNumber} as duplicate of #${duplicateOf} and posted comment on GitHub`)
      } else {
        success(`✅ Posted analysis comment on issue #${issueNumber}`)
      }
      
    } catch (err) {
      console.error('Error applying analysis:', err)
      showError(`❌ Failed to apply analysis: ${err instanceof Error ? err.message : 'Unknown error'}`)
    } finally {
      setApprovingIssues(prev => {
        const newSet = new Set(prev)
        newSet.delete(issueNumber)
        return newSet
      })
    }
  }

  if (loading) {
    return (
      <div className="px-4 sm:px-6 lg:px-8 py-8 w-full max-w-[96rem] mx-auto">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
            <p className="text-gray-500 dark:text-gray-400">Loading repository data...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error || !repo) {
    return (
      <div className="px-4 sm:px-6 lg:px-8 py-8 w-full max-w-[96rem] mx-auto">
        <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="text-red-500 mb-4 text-4xl">
            ⚠️
          </div>
            <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100 mb-2">
              Repository Not Found
            </h2>
            <p className="text-gray-500 dark:text-gray-400 mb-4">
              {error || 'The requested repository could not be found.'}
            </p>
            <button
              onClick={() => router.back()}
              className="inline-flex items-center gap-2 bg-purple-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-purple-700 transition-colors"
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
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            <div>
              <h3 className="text-sm font-medium text-red-800 dark:text-red-200">Authentication Required</h3>
              <p className="text-sm text-red-700 dark:text-red-300 mt-1">Please sign in to use the Duplicate Detection feature.</p>
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
            🔍 Duplicate Detection
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            AI-powered analysis to find and link similar issues in <strong>{repo.name}</strong>
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

      {/* Analysis Controls */}
      <div className="bg-white dark:bg-gray-800 shadow-sm rounded-xl p-6 mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-2">
              Duplicate Analysis
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              AI will analyze all open issues and find potential duplicates with similarity scores and reasoning.
            </p>
          </div>
          <button
            onClick={analyzeDuplicates}
            disabled={isAnalyzing}
            className="btn bg-purple-600 text-white hover:bg-purple-700 dark:bg-purple-600 dark:hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isAnalyzing ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Analyzing...
              </>
            ) : (
              <>
                <svg className="fill-current shrink-0 mr-2" width="16" height="16" viewBox="0 0 16 16">
                  <path d="M8 0C3.58 0 0 3.58 0 8s3.58 8 8 8 8-3.58 8-8-3.58-8-8-8zm0 14c-3.31 0-6-2.69-6-6s2.69-6 6-6 6 2.69 6 6-2.69 6-6 6zm-1-9h2v2H7V5zm0 3h2v4H7V8z"/>
                </svg>
                🚀 Analyze Duplicates
              </>
            )}
          </button>
        </div>
      </div>

      {/* Error state */}
      {analysisError && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6 mb-8">
          <div className="flex items-center">
            <svg className="w-5 h-5 text-red-400 mr-3" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            <div>
              <h3 className="text-sm font-medium text-red-800 dark:text-red-200">Analysis Error</h3>
              <p className="text-sm text-red-700 dark:text-red-300 mt-1">{analysisError}</p>
            </div>
          </div>
        </div>
      )}

      {/* Analysis Results */}
      {analysisResults.length > 0 && (
        <div className="bg-white dark:bg-gray-800 shadow-sm rounded-xl p-6">
          <header className="flex justify-between items-start mb-6">
            <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-2">
              Duplicate Analysis Results
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
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                        result.analysis.isDuplicate ? 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400' : 
                        result.analysis.suggestedAction === 'review_required' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400' :
                        'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                      }`}>
                        {result.analysis.isDuplicate ? 'Potential Duplicate' : 
                         result.analysis.suggestedAction === 'review_required' ? 'Review Required' : 'Not Duplicate'}
                      </span>
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                        result.analysis.confidence >= 80 ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400' :
                        result.analysis.confidence >= 60 ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400' :
                        'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
                      }`}>
                        {result.analysis.confidence}% confidence
                      </span>
                    </div>
                  </div>
                </div>
                
                {/* AI Analysis */}
                <div className="mb-4">
                  <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">AI Analysis</div>
                  <div className="bg-white dark:bg-gray-800 rounded-lg p-3">
                    <p className="text-sm text-gray-700 dark:text-gray-300">{result.analysis.reasoning}</p>
                  </div>
                </div>

                {/* Similar Issues */}
                {result.similarIssues.length > 0 && (
                  <div className="mb-4">
                    <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Similar Issues Found</div>
                    <div className="space-y-2">
                      {result.similarIssues.map((similar, idx) => (
                        <div key={idx} className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-600">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center space-x-2 mb-1">
                                <span className="text-sm font-medium text-gray-800 dark:text-gray-100">
                                  #{similar.issueNumber}
                                </span>
                                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                                  similar.similarity >= 80 ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400' :
                                  similar.similarity >= 60 ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400' :
                                  'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400'
                                }`}>
                                  {similar.similarity}% similar
                                </span>
                              </div>
                              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">{similar.title}</p>
                              <p className="text-xs text-gray-500 dark:text-gray-400">{similar.reason}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-gray-600">
                  {result.analysis.isDuplicate && result.similarIssues.length > 0 && (
                    <button
                      onClick={() => approveAnalysis(result.issueNumber, 'mark_duplicate', result.similarIssues[0].issueNumber)}
                      disabled={approvingIssues.has(result.issueNumber)}
                      className="btn bg-red-500 text-white hover:bg-red-600 dark:bg-red-600 dark:hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {approvingIssues.has(result.issueNumber) ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          Processing...
                        </>
                      ) : (
                        <>
                          <svg className="fill-current shrink-0 mr-2" width="16" height="16" viewBox="0 0 16 16">
                            <path d="M8 0C3.58 0 0 3.58 0 8s3.58 8 8 8 8-3.58 8-8-3.58-8-8-8zm0 14c-3.31 0-6-2.69-6-6s2.69-6 6-6 6 2.69 6 6-2.69 6-6 6zm-1-9h2v2H7V5zm0 3h2v4H7V8z"/>
                          </svg>
                          Mark as Duplicate of #{result.similarIssues[0].issueNumber}
                        </>
                      )}
                    </button>
                  )}
                  <button
                    onClick={() => approveAnalysis(result.issueNumber, 'not_duplicate')}
                    disabled={approvingIssues.has(result.issueNumber)}
                    className="btn bg-green-500 text-white hover:bg-green-600 dark:bg-green-600 dark:hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {approvingIssues.has(result.issueNumber) ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Processing...
                      </>
                    ) : (
                      <>
                        <svg className="fill-current shrink-0 mr-2" width="16" height="16" viewBox="0 0 16 16">
                          <path d="M13.854 3.646a.5.5 0 0 1 0 .708l-7 7a.5.5 0 0 1-.708 0l-3.5-3.5a.5.5 0 1 1 .708-.708L6.5 10.293l6.646-6.647a.5.5 0 0 1 .708 0z"/>
                        </svg>
                        Not a Duplicate
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
          <div className="text-gray-400 dark:text-gray-500 mb-4 text-6xl">🔍</div>
          <h3 className="text-lg font-medium text-gray-800 dark:text-gray-100 mb-2">
            Ready to Analyze Duplicates
          </h3>
          <p className="text-gray-500 dark:text-gray-400 mb-6">
            Click "Analyze Duplicates" to scan all open issues and find potential duplicates using AI.
          </p>
        </div>
      )}
    </div>
  )
}
