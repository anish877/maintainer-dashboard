'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import RepoAssignments from './repo-assignments'
import RepoMaintainerControls from './repo-maintainer-controls'
import { Lock, Users, AlertTriangle, Bot, Search, Shield, BarChart3, RefreshCw, ExternalLink, Star, GitFork, Bug, Code } from 'lucide-react'

export default function RepoDashboard() {
  const params = useParams()
  const router = useRouter()
  const repoName = params.repoName as string
  
  const [repo, setRepo] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

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

  if (loading) {
    return (
      <div className="px-4 sm:px-6 lg:px-8 py-8 w-full max-w-[96rem] mx-auto">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-pulse space-y-4 w-full max-w-md">
            <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-48 mx-auto"></div>
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-32 mx-auto"></div>
            <div className="h-32 bg-gray-200 dark:bg-gray-700 rounded"></div>
          </div>
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
            {isAuthError ? <Lock className="w-12 h-12 mx-auto" /> : isCollaboratorError ? <Users className="w-12 h-12 mx-auto" /> : <AlertTriangle className="w-12 h-12 mx-auto" />}
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
                      // Sign out and redirect to sign in
                      window.location.href = '/api/auth/signout'
                    }}
                    className="inline-flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-red-700 transition-colors w-full justify-center"
                  >
                    <RefreshCw className="w-4 h-4" /> Sign Out & Refresh Token
                  </button>
                  <button
                    onClick={() => router.push('/repos')}
                    className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors w-full justify-center"
                  >
                    <BarChart3 className="w-4 h-4" /> View All Repositories
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
      <div className="mb-8">
        <div className="flex items-center space-x-4 mb-4">
          <button
            onClick={() => router.back()}
            className="inline-flex items-center gap-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
          >
            ← Back
          </button>
        </div>
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl text-gray-800 dark:text-gray-100 font-bold">
              {repo.name}
            </h1>
            <p className="text-gray-500 dark:text-gray-400 mt-2">
              {repo.description || 'No description available'}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium ${
              repo.private 
                ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                : 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
            }`}>
              {repo.private ? 'Private' : 'Public'}
            </span>
            <a
              href={repo.html_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 px-4 py-2 rounded-lg font-medium transition-colors"
            >
              <ExternalLink className="w-4 h-4" />
              View on GitHub
            </a>
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        
        {/* Left Column - Repository Stats & Info */}
        <div className="xl:col-span-1 space-y-6">
          
          {/* Repository Stats */}
          <div className="bg-white dark:bg-gray-800 shadow-sm rounded-xl p-6">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4">
              Repository Stats
            </h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Star className="w-5 h-5 text-yellow-500" />
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Stars</span>
                </div>
                <span className="text-lg font-semibold text-gray-800 dark:text-gray-100">
                  {repo.stargazers_count?.toLocaleString() || '0'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <GitFork className="w-5 h-5 text-gray-500" />
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Forks</span>
                </div>
                <span className="text-lg font-semibold text-gray-800 dark:text-gray-100">
                  {repo.forks_count?.toLocaleString() || '0'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Bug className="w-5 h-5 text-red-500" />
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Issues</span>
                </div>
                <span className="text-lg font-semibold text-gray-800 dark:text-gray-100">
                  {repo.open_issues_count?.toLocaleString() || '0'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Code className="w-5 h-5 text-blue-500" />
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Language</span>
                </div>
                <span className="text-lg font-semibold text-gray-800 dark:text-gray-100">
                  {repo.language || 'N/A'}
                </span>
              </div>
            </div>
          </div>

          {/* Repository Details */}
          <div className="bg-white dark:bg-gray-800 shadow-sm rounded-xl p-6">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4">
              Repository Details
            </h3>
            <dl className="space-y-3">
              <div className="flex justify-between">
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Created</dt>
                <dd className="text-sm text-gray-800 dark:text-gray-100">
                  {repo.created_at ? new Date(repo.created_at).toLocaleDateString() : 'N/A'}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Last Updated</dt>
                <dd className="text-sm text-gray-800 dark:text-gray-100">
                  {repo.updated_at ? new Date(repo.updated_at).toLocaleDateString() : 'N/A'}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Default Branch</dt>
                <dd className="text-sm text-gray-800 dark:text-gray-100">
                  {repo.default_branch || 'main'}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Size</dt>
                <dd className="text-sm text-gray-800 dark:text-gray-100">
                  {repo.size ? `${(repo.size / 1024).toFixed(1)} MB` : 'N/A'}
                </dd>
              </div>
            </dl>
          </div>

          {/* Quick Actions */}
          <div className="bg-white dark:bg-gray-800 shadow-sm rounded-xl p-6">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4">
              Quick Actions
            </h3>
            <div className="space-y-3">
              <a
                href={`${repo.html_url}/issues`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors text-left w-full"
              >
                <Bug className="w-5 h-5 text-gray-600 flex-shrink-0" />
                <div>
                  <div className="text-sm font-medium text-gray-800 dark:text-gray-100">View Issues</div>
                  <div className="text-xs text-gray-600 dark:text-gray-400">Browse all issues</div>
                </div>
              </a>
              <a
                href={`${repo.html_url}/pulls`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors text-left w-full"
              >
                <GitFork className="w-5 h-5 text-gray-600 flex-shrink-0" />
                <div>
                  <div className="text-sm font-medium text-gray-800 dark:text-gray-100">View Pull Requests</div>
                  <div className="text-xs text-gray-600 dark:text-gray-400">Browse all PRs</div>
                </div>
              </a>
            </div>
          </div>
        </div>

        {/* Right Column - Management Tools */}
        <div className="xl:col-span-2 space-y-6">
          
          {/* AI-Powered Tools */}
          <div className="bg-white dark:bg-gray-800 shadow-sm rounded-xl p-6">
            <div className="flex items-center gap-3 mb-6">
              <Bot className="w-6 h-6 text-violet-600" />
              <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-100">
                AI-Powered Tools
              </h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <button
                onClick={() => router.push(`/${repoName}/triage`)}
                className="flex items-center gap-4 p-4 rounded-lg bg-violet-50 dark:bg-violet-900/20 hover:bg-violet-100 dark:hover:bg-violet-900/30 transition-colors text-left border border-violet-200 dark:border-violet-800"
              >
                <div className="flex-shrink-0">
                  <Bot className="w-8 h-8 text-violet-600" />
                </div>
                <div>
                  <div className="text-sm font-semibold text-violet-800 dark:text-violet-200">
                    AI Issue Triage
                  </div>
                  <div className="text-xs text-violet-600 dark:text-violet-400 mt-1">
                    Automatically categorize and prioritize issues
                  </div>
                </div>
              </button>
              
              <button
                onClick={() => router.push(`/${repoName}/duplicate`)}
                className="flex items-center gap-4 p-4 rounded-lg bg-purple-50 dark:bg-purple-900/20 hover:bg-purple-100 dark:hover:bg-purple-900/30 transition-colors text-left border border-purple-200 dark:border-purple-800"
              >
                <div className="flex-shrink-0">
                  <Search className="w-8 h-8 text-purple-600" />
                </div>
                <div>
                  <div className="text-sm font-semibold text-purple-800 dark:text-purple-200">
                    Duplicate Detection
                  </div>
                  <div className="text-xs text-purple-600 dark:text-purple-400 mt-1">
                    Find and merge similar issues
                  </div>
                </div>
              </button>
              
              <button
                onClick={() => router.push(`/${repoName}/spam`)}
                className="flex items-center gap-4 p-4 rounded-lg bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors text-left border border-red-200 dark:border-red-800"
              >
                <div className="flex-shrink-0">
                  <Shield className="w-8 h-8 text-red-600" />
                </div>
                <div>
                  <div className="text-sm font-semibold text-red-800 dark:text-red-200">
                    Spam Detection
                  </div>
                  <div className="text-xs text-red-600 dark:text-red-400 mt-1">
                    Identify and filter spam issues
                  </div>
                </div>
              </button>
              
              <button
                onClick={() => router.push(`/${repoName}/lifecycle`)}
                className="flex items-center gap-4 p-4 rounded-lg bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors text-left border border-blue-200 dark:border-blue-800"
              >
                <div className="flex-shrink-0">
                  <BarChart3 className="w-8 h-8 text-blue-600" />
                </div>
                <div>
                  <div className="text-sm font-semibold text-blue-800 dark:text-blue-200">
                    Lifecycle Tracker
                  </div>
                  <div className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                    Track issue progress and metrics
                  </div>
                </div>
              </button>
            </div>
          </div>

          {/* Repository Management */}
          <div className="bg-white dark:bg-gray-800 shadow-sm rounded-xl p-6">
            <div className="flex items-center gap-3 mb-6">
              <RefreshCw className="w-6 h-6 text-green-600" />
              <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-100">
                Repository Management
              </h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <button
                onClick={async () => {
                  try {
                    const response = await fetch('/api/github/sync-issues', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        owner: repo.owner.login,
                        repo: repo.name,
                        limit: 100
                      })
                    })
                    const data = await response.json()
                    if (response.ok) {
                      alert(`Synced ${data.syncedCount} issues!`)
                    } else {
                      alert(`Error: ${data.error}`)
                    }
                  } catch (error) {
                    alert(`Error syncing issues: ${error}`)
                  }
                }}
                className="flex items-center gap-4 p-4 rounded-lg bg-green-50 dark:bg-green-900/20 hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors text-left border border-green-200 dark:border-green-800"
              >
                <div className="flex-shrink-0">
                  <RefreshCw className="w-8 h-8 text-green-600" />
                </div>
                <div>
                  <div className="text-sm font-semibold text-green-800 dark:text-green-200">
                    Sync Issues
                  </div>
                  <div className="text-xs text-green-600 dark:text-green-400 mt-1">
                    Update issues from GitHub
                  </div>
                </div>
              </button>
              
              <button
                onClick={() => router.push(`/${repoName}/heatmaps`)}
                className="flex items-center gap-4 p-4 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 hover:bg-emerald-100 dark:hover:bg-emerald-900/30 transition-colors text-left border border-emerald-200 dark:border-emerald-800"
              >
                <div className="flex-shrink-0">
                  <BarChart3 className="w-8 h-8 text-emerald-600" />
                </div>
                <div>
                  <div className="text-sm font-semibold text-emerald-800 dark:text-emerald-200">
                    Contribution Heatmaps
                  </div>
                  <div className="text-xs text-emerald-600 dark:text-emerald-400 mt-1">
                    Visualize contributor activity
                  </div>
                </div>
              </button>
            </div>
          </div>

          {/* Maintainer Controls Section */}
          <div>
            <RepoMaintainerControls repoName={repoName} onRefresh={() => window.location.reload()} />
          </div>

          {/* Assignments Section */}
          <div>
            <RepoAssignments repoName={repoName} />
          </div>
        </div>
      </div>

    </div>
  )
}
