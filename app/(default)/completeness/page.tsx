'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useGitHubRepos } from '@/hooks/use-github-repos'
import { CompletenessMetrics } from './components/completeness-metrics'
import { IssueAnalysisResults } from './components/issue-analysis-results'
import { ApprovalQueue } from './components/approval-queue'
import { TemplateManager } from './components/template-manager'
import { useToastNotifications } from '@/lib/toast'

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

export default function CompletenessPage() {
  const { data: session } = useSession()
  const { repos, loading: reposLoading, loadingMessage } = useGitHubRepos()
  const { success, error: showError } = useToastNotifications()
  
  const [selectedRepo, setSelectedRepo] = useState('')
  const [activeTab, setActiveTab] = useState<ActiveTab>('analyze')
  const [analysisResults, setAnalysisResults] = useState<AnalysisResults | null>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [progress, setProgress] = useState({ current: 0, total: 0 })
  const [refreshApprovalQueue, setRefreshApprovalQueue] = useState(0)

  const handleAnalyzeRepository = async () => {
    if (!selectedRepo) return
    
    setIsAnalyzing(true)
    setAnalysisResults(null)
    setProgress({ current: 0, total: 0 })
    
    try {
      const [owner, repo] = selectedRepo.split('/')
      
      // Start analysis with progress tracking
      const response = await fetch('/api/completeness/analyze-repository', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          owner, 
          repo,
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
    if (!selectedRepo || !analysisResults) return
    
    try {
      const [owner, repo] = selectedRepo.split('/')
      
      const response = await fetch('/api/completeness/request-comment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          owner,
          repo,
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

  const handleRepoChange = (repoFullName: string) => {
    setSelectedRepo(repoFullName)
    setAnalysisResults(null)
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
      {/* Professional Header */}
      <div className="mb-8">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 bg-gradient-to-br from-violet-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
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
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-violet-500 mr-3"></div>
                  Loading repositories...
                </div>
              ) : (
                <select
                  value={selectedRepo}
                  onChange={(e) => handleRepoChange(e.target.value)}
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
                className="btn bg-gradient-to-r from-violet-500 to-purple-600 text-white hover:from-violet-600 hover:to-purple-700 w-full disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
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
                    Start Analysis
                  </>
                )}
              </button>
            </div>
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

      {/* Tab Content */}
      {activeTab === 'analyze' && (
        <>
          {analysisResults && <CompletenessMetrics metrics={analysisResults.metrics} />}
          {analysisResults && (
            <IssueAnalysisResults 
              results={analysisResults.issues}
              repository={analysisResults.repository}
              onRequestComment={handleRequestComment}
            />
          )}
        </>
      )}

      {activeTab === 'approve' && (
        <ApprovalQueue key={refreshApprovalQueue} repository={selectedRepo} />
      )}

      {activeTab === 'templates' && (
        <TemplateManager repository={selectedRepo} />
      )}

      {/* Empty State for Analysis Tab */}
      {activeTab === 'analyze' && !analysisResults && !isAnalyzing && (
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
            Select a repository above and click "Start Analysis" to begin analyzing issues for completeness.
          </p>
        </div>
      )}
    </div>
  )
}
