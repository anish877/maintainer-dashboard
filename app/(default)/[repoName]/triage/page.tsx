'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { useToastNotifications } from '@/lib/toast'

export default function RepoTriagePage() {
  const params = useParams()
  const router = useRouter()
  const { data: session, status } = useSession()
  const { success, error: showError } = useToastNotifications()
  const repoName = params.repoName as string
  
  const [repo, setRepo] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    issueNumbers: '',
  })
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [triageError, setTriageError] = useState<string | null>(null)
  const [applyingLabels, setApplyingLabels] = useState<Set<number>>(new Set())

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsAnalyzing(true)
    setTriageError(null)
    setResult(null)

    try {
      // Parse issue numbers
      const issueNumbers = formData.issueNumbers
        .split(',')
        .map(num => parseInt(num.trim()))
        .filter(num => !isNaN(num))

      if (issueNumbers.length === 0) {
        throw new Error('Please enter valid issue numbers')
      }

      const response = await fetch('/api/triage/issues', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          owner: repo.owner.login,
          repo: repo.name,
          issueNumbers,
          includeComments: true,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to triage issues')
      }

      setResult(data)
    } catch (err) {
      setTriageError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setIsAnalyzing(false)
    }
  }

  const applyLabels = async (issueNumber: number, labels: string[]) => {
    setApplyingLabels(prev => new Set(prev).add(issueNumber))
    
    try {
      const response = await fetch('/api/triage/apply-labels', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          owner: repo.owner.login,
          repo: repo.name,
          issueNumber,
          labels,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to apply labels')
      }

      // Show success message
      if (data.skippedLabels && data.skippedLabels.length > 0) {
        success(`✅ Labels applied to issue #${issueNumber}\n\nApplied: ${data.appliedLabels.join(', ')}\nSkipped (don't exist): ${data.skippedLabels.join(', ')}`)
      } else {
        success(`✅ Labels applied successfully to issue #${issueNumber}\n\nApplied: ${data.appliedLabels.join(', ')}`)
      }
      
    } catch (err) {
      console.error('Error applying labels:', err)
      
      // Try to parse error response for better error messages
      let errorMessage = 'Unknown error'
      if (err instanceof Error) {
        try {
          const errorData = JSON.parse(err.message)
          if (errorData.error) {
            errorMessage = errorData.error
            if (errorData.availableLabels) {
              errorMessage += `\n\nAvailable labels: ${errorData.availableLabels.slice(0, 5).join(', ')}${errorData.availableLabels.length > 5 ? '...' : ''}`
            }
          }
        } catch {
          errorMessage = err.message
        }
      }
      
      showError(`❌ Failed to apply labels: ${errorMessage}`)
    } finally {
      setApplyingLabels(prev => {
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
              <p className="text-sm text-red-700 dark:text-red-300 mt-1">Please sign in to use the AI Issue Triage feature.</p>
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
            🤖 AI Issue Triage
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Automatically analyze and categorize issues in <strong>{repo.name}</strong>
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

      {/* Triage form */}
      <div className="bg-white dark:bg-gray-800 shadow-sm rounded-xl">
        <div className="px-5 pt-5">
          <header className="flex justify-between items-start mb-6">
            <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-2">
              Issue Triage Configuration
            </h2>
          </header>
          
          <form onSubmit={handleSubmit}>
            <div className="mb-6">
              <label htmlFor="issueNumbers" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Issue Numbers
              </label>
              <input
                type="text"
                id="issueNumbers"
                name="issueNumbers"
                value={formData.issueNumbers}
                onChange={(e) => setFormData({ issueNumbers: e.target.value })}
                placeholder="e.g., 123, 124, 125"
                className="form-input w-full"
                required
              />
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Enter comma-separated issue numbers to triage
              </p>
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={isAnalyzing}
                className="btn bg-violet-500 text-white hover:bg-violet-600 dark:bg-violet-600 dark:hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed"
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
                    🚀 Start AI Triage
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Error state */}
      {triageError && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6 mt-8">
          <div className="flex items-center">
            <svg className="w-5 h-5 text-red-400 mr-3" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            <div>
              <h3 className="text-sm font-medium text-red-800 dark:text-red-200">Error</h3>
              <p className="text-sm text-red-700 dark:text-red-300 mt-1">{triageError}</p>
            </div>
          </div>
        </div>
      )}

      {/* Results */}
      {result && (
        <div className="bg-white dark:bg-gray-800 shadow-sm rounded-xl p-6 mt-8">
          <header className="flex justify-between items-start mb-6">
            <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-2">
              Triage Results
            </h2>
          </header>
          
          <div className="space-y-6">
            {/* Summary */}
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
              <h3 className="text-sm font-medium text-gray-800 dark:text-gray-100 mb-3">Summary</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">{result.message}</p>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-800 dark:text-gray-100">{result.details.totalIssues}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">Total Issues</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600 dark:text-green-400">{result.details.successfulTriages}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">Successful</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-violet-600 dark:text-violet-400">{result.details.averageConfidence}%</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">Avg Confidence</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">{result.details.goodFirstIssues}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">Good First Issues</div>
                </div>
              </div>
            </div>

            {/* Individual Results */}
            <div>
              <h3 className="text-sm font-medium text-gray-800 dark:text-gray-100 mb-4">Issue Analysis</h3>
              <div className="space-y-6">
                {result.results.map((issue: any, index: number) => (
                  <div key={index} className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-6 border border-gray-200 dark:border-gray-600">
                    {/* Issue Header */}
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <h4 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-2">
                          Issue #{issue.issueNumber}
                        </h4>
                        <div className="flex items-center space-x-2 mb-3">
                          <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                            issue.type === 'bug' ? 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400' :
                            issue.type === 'feature' ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400' :
                            issue.type === 'enhancement' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400' :
                            'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400'
                          }`}>
                            {issue.type}
                          </span>
                          <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                            issue.priority === 'critical' ? 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400' :
                            issue.priority === 'high' ? 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400' :
                            issue.priority === 'medium' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400' :
                            'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400'
                          }`}>
                            {issue.priority}
                          </span>
                          <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                            issue.difficulty === 'good first issue' ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400' :
                            issue.difficulty === 'intermediate' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400' :
                            issue.difficulty === 'advanced' ? 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400' :
                            'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400'
                          }`}>
                            {issue.difficulty}
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-violet-600 dark:text-violet-400">{issue.confidence}%</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">Confidence</div>
                      </div>
                    </div>
                    
                    {/* Component */}
                    <div className="mb-4">
                      <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Component</div>
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-violet-100 text-violet-800 dark:bg-violet-900/20 dark:text-violet-400">
                        {issue.component}
                      </span>
                    </div>

                    {/* Suggested Labels */}
                    {issue.suggestedLabels.length > 0 && (
                      <div className="mb-4">
                        <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Suggested Labels</div>
                        <div className="flex flex-wrap gap-2">
                          {issue.suggestedLabels.map((label: string, labelIndex: number) => (
                            <span key={labelIndex} className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400">
                              {label}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* AI Reasoning */}
                    {issue.aiReasoning && (
                      <div className="mb-4">
                        <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">AI Reasoning</div>
                        <div className="space-y-3">
                          <div className="bg-white dark:bg-gray-800 rounded-lg p-3">
                            <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Type Classification</div>
                            <div className="text-sm text-gray-700 dark:text-gray-300">{issue.aiReasoning.type}</div>
                          </div>
                          <div className="bg-white dark:bg-gray-800 rounded-lg p-3">
                            <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Priority Assessment</div>
                            <div className="text-sm text-gray-700 dark:text-gray-300">{issue.aiReasoning.priority}</div>
                          </div>
                          <div className="bg-white dark:bg-gray-800 rounded-lg p-3">
                            <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Difficulty Analysis</div>
                            <div className="text-sm text-gray-700 dark:text-gray-300">{issue.aiReasoning.difficulty}</div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Approve Button */}
                    <div className="flex justify-end pt-4 border-t border-gray-200 dark:border-gray-600">
                      <button
                        onClick={() => applyLabels(issue.issueNumber, issue.suggestedLabels)}
                        disabled={applyingLabels.has(issue.issueNumber)}
                        className="btn bg-green-500 text-white hover:bg-green-600 dark:bg-green-600 dark:hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {applyingLabels.has(issue.issueNumber) ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                            Applying...
                          </>
                        ) : (
                          <>
                            <svg className="fill-current shrink-0 mr-2" width="16" height="16" viewBox="0 0 16 16">
                              <path d="M13.854 3.646a.5.5 0 0 1 0 .708l-7 7a.5.5 0 0 1-.708 0l-3.5-3.5a.5.5 0 1 1 .708-.708L6.5 10.293l6.646-6.647a.5.5 0 0 1 .708 0z"/>
                            </svg>
                            Apply Labels
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}


