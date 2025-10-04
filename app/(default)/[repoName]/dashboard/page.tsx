'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import RepoAssignments from './repo-assignments'
import RepoMaintainerControls from './repo-maintainer-controls'

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
            {repo.name}
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {repo.description || 'No description available'}
          </p>
        </div>

        {/* Right: Actions */}
        <div className="grid grid-flow-col sm:auto-cols-max justify-start sm:justify-end gap-2">
          <button
            onClick={() => router.push(`/${repoName}/triage`)}
            className="inline-flex items-center gap-2 bg-violet-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-violet-700 transition-colors"
          >
            🤖 Triage
          </button>
          <button
            onClick={() => router.push(`/${repoName}/duplicate`)}
            className="inline-flex items-center gap-2 bg-purple-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-purple-700 transition-colors"
          >
            🔍 Duplicate Detection
          </button>
          <button
            onClick={() => router.push(`/${repoName}/spam`)}
            className="inline-flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-red-700 transition-colors"
          >
            🛡️ Spam Detection
          </button>
          <a
            href={repo.html_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 bg-gray-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-gray-700 transition-colors"
          >
            🔗 View on GitHub
          </a>
        </div>

      </div>

      {/* Repository Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        
        {/* Stars */}
        <div className="bg-white dark:bg-gray-800 shadow-sm rounded-xl p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0 text-3xl">
              ⭐
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                  Stars
                </dt>
                <dd className="text-lg font-medium text-gray-800 dark:text-gray-100">
                  {repo.stargazers_count?.toLocaleString() || '0'}
                </dd>
              </dl>
            </div>
          </div>
        </div>

        {/* Forks */}
        <div className="bg-white dark:bg-gray-800 shadow-sm rounded-xl p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0 text-3xl">
              🍴
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                  Forks
                </dt>
                <dd className="text-lg font-medium text-gray-800 dark:text-gray-100">
                  {repo.forks_count?.toLocaleString() || '0'}
                </dd>
              </dl>
            </div>
          </div>
        </div>

        {/* Issues */}
        <div className="bg-white dark:bg-gray-800 shadow-sm rounded-xl p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0 text-3xl">
              ⚠️
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                  Issues
                </dt>
                <dd className="text-lg font-medium text-gray-800 dark:text-gray-100">
                  {repo.open_issues_count?.toLocaleString() || '0'}
                </dd>
              </dl>
            </div>
          </div>
        </div>

        {/* Language */}
        <div className="bg-white dark:bg-gray-800 shadow-sm rounded-xl p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0 text-3xl">
              💻
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                  Language
                </dt>
                <dd className="text-lg font-medium text-gray-800 dark:text-gray-100">
                  {repo.language || 'N/A'}
                </dd>
              </dl>
            </div>
          </div>
        </div>

      </div>

      {/* Repository Details */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        
        {/* Repository Info */}
        <div className="bg-white dark:bg-gray-800 shadow-sm rounded-xl p-6">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4">
            Repository Information
          </h3>
          <dl className="space-y-3">
            <div className="flex justify-between">
              <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                Created
              </dt>
              <dd className="text-sm text-gray-800 dark:text-gray-100">
                {repo.created_at ? new Date(repo.created_at).toLocaleDateString() : 'N/A'}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                Last Updated
              </dt>
              <dd className="text-sm text-gray-800 dark:text-gray-100">
                {repo.updated_at ? new Date(repo.updated_at).toLocaleDateString() : 'N/A'}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                Default Branch
              </dt>
              <dd className="text-sm text-gray-800 dark:text-gray-100">
                {repo.default_branch || 'main'}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                Size
              </dt>
              <dd className="text-sm text-gray-800 dark:text-gray-100">
                {repo.size ? `${(repo.size / 1024).toFixed(1)} MB` : 'N/A'}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                Visibility
              </dt>
              <dd className="text-sm text-gray-800 dark:text-gray-100">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  repo.private 
                    ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                    : 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                }`}>
                  {repo.private ? 'Private' : 'Public'}
                </span>
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
            <button
              onClick={() => router.push(`/${repoName}/triage`)}
              className="flex items-center gap-3 p-3 rounded-lg bg-violet-50 dark:bg-violet-900/20 hover:bg-violet-100 dark:hover:bg-violet-900/30 transition-colors w-full text-left"
            >
              <span className="text-lg">🤖</span>
              <span className="text-sm font-medium text-violet-800 dark:text-violet-200">
                AI Issue Triage
              </span>
            </button>
            <button
              onClick={() => router.push(`/${repoName}/duplicate`)}
              className="flex items-center gap-3 p-3 rounded-lg bg-purple-50 dark:bg-purple-900/20 hover:bg-purple-100 dark:hover:bg-purple-900/30 transition-colors w-full text-left"
            >
              <span className="text-lg">🔍</span>
              <span className="text-sm font-medium text-purple-800 dark:text-purple-200">
                Duplicate Detection
              </span>
            </button>
            <button
              onClick={() => router.push(`/${repoName}/spam`)}
              className="flex items-center gap-3 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors w-full text-left"
            >
              <span className="text-lg">🛡️</span>
              <span className="text-sm font-medium text-red-800 dark:text-red-200">
                Spam Detection
              </span>
            </button>
            <a
              href={repo.html_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
            >
              <span className="text-lg">🔗</span>
              <span className="text-sm font-medium text-gray-800 dark:text-gray-100">
                View on GitHub
              </span>
            </a>
            <a
              href={`${repo.html_url}/issues`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
            >
              <span className="text-lg">⚠️</span>
              <span className="text-sm font-medium text-gray-800 dark:text-gray-100">
                View Issues
              </span>
            </a>
            <a
              href={`${repo.html_url}/pulls`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
            >
              <span className="text-lg">🔀</span>
              <span className="text-sm font-medium text-gray-800 dark:text-gray-100">
                View Pull Requests
              </span>
            </a>
          </div>
        </div>

      </div>

      {/* Maintainer Controls Section */}
      <div className="mt-8">
        <RepoMaintainerControls repoName={repoName} onRefresh={() => window.location.reload()} />
      </div>

      {/* Assignments Section */}
      <div className="mt-8">
        <RepoAssignments repoName={repoName} />
      </div>

    </div>
  )
}
