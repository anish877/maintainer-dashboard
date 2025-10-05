'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { useToastNotifications } from '@/lib/toast'
import { Users, AlertTriangle, Bot, Rocket, X, Search, RefreshCw } from 'lucide-react'

interface ScrapedPost {
  id: string;
  source: string;
  sourceUrl: string;
  title: string;
  content: string;
  author: string;
  upvotes: number;
  commentCount: number;
  tags: string[];
  postedAt: string;
  scrapedAt: string;
  processed: boolean;
  processedIssue?: ProcessedIssue;
  targetRepository?: string;
  scrapeKeywords?: string[];
}

interface ProcessedIssue {
  id: string;
  type: string;
  confidence: number;
  summary: string;
  severity: string;
  suggestedLabels: string[];
  affectedArea: string;
  userImpact: number;
  sentimentScore: number;
  isDuplicate: boolean;
  status: string;
  createdAt: string;
  githubUrl?: string;
  technicalDetails?: string;
}

export default function RepoScraperPage() {
  const params = useParams()
  const router = useRouter()
  const { data: session, status } = useSession()
  const { success, error: showError } = useToastNotifications()
  const repoName = params.repoName as string
  
  const [repo, setRepo] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [posts, setPosts] = useState<ScrapedPost[]>([])
  const [scrapingInProgress, setScrapingInProgress] = useState(false)
  const [githubStatus, setGithubStatus] = useState<'checking' | 'connected' | 'disconnected'>('checking')
  const [repoKeywords, setRepoKeywords] = useState<{keywords: string[], reasoning: string, confidence: number} | null>(null)
  const [filter, setFilter] = useState<'all' | 'pending' | 'processed' | 'duplicates'>('all')
  const [source, setSource] = useState<'all' | 'reddit' | 'stackoverflow'>('all')

  useEffect(() => {
    if (repoName) {
      fetchRepoData()
      checkGitHubStatus()
    }
  }, [repoName])

  useEffect(() => {
    if (repo) {
      fetchData()
      fetchRepoKeywords()
    }
  }, [repo, filter, source])

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

  const checkGitHubStatus = async () => {
    if (!session?.user?.id) {
      setGithubStatus('disconnected')
      return
    }

    try {
      const response = await fetch('/api/github/status')
      if (response.ok) {
        const data = await response.json()
        setGithubStatus(data.connected ? 'connected' : 'disconnected')
      } else {
        setGithubStatus('disconnected')
      }
    } catch (error) {
      setGithubStatus('disconnected')
    }
  }

  const fetchRepoKeywords = async () => {
    if (!repo) return
    
    try {
      const response = await fetch(`/api/github/repo-info?repository=${encodeURIComponent(repo.full_name)}`)
      if (response.ok) {
        const data = await response.json()
        setRepoKeywords({
          keywords: data.keywords,
          reasoning: data.reasoning,
          confidence: data.confidence
        })
      }
    } catch (error) {
      console.error('Error fetching repo keywords:', error)
    }
  }

  const fetchData = async () => {
    try {
      const params = new URLSearchParams()
      if (filter !== 'all') params.append('filter', filter)
      if (source !== 'all') params.append('source', source)
      if (repo && repo.full_name) {
        params.append('repository', repo.full_name)
      }
      
      const response = await fetch(`/api/scraper/posts?${params}`)
      const data = await response.json()
      
      setPosts(data.posts || [])
    } catch (error) {
      console.error('Error fetching data:', error)
    }
  }

  const scrapeForRepository = async (sources: string[] = ['reddit', 'stackoverflow']) => {
    if (!repo) {
      showError('Repository not loaded')
      return
    }

    setScrapingInProgress(true)
    try {
      const response = await fetch('/api/scraper/repo-scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          repository: repo.full_name,
          sources: sources
        })
      })

      const data = await response.json()
      if (data.success) {
        success(`✅ Scraping completed for ${repo.full_name}!\n\nResults:\n- Total posts: ${data.results.totalPosts}\n- New posts: ${data.results.newPosts}\n- Errors: ${data.results.errors}`)
        fetchData()
      } else {
        showError(`❌ Error: ${data.message}`)
      }
    } catch (error) {
      console.error('Error scraping repository:', error)
      showError('Failed to scrape repository')
    } finally {
      setScrapingInProgress(false)
    }
  }

  const updateIssueStatus = async (issueId: string, status: string) => {
    try {
      const response = await fetch(`/api/scraper/issues/${issueId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      })
      
      if (response.ok) {
        fetchData()
      }
    } catch (error) {
      console.error('Error updating issue status:', error)
    }
  }

  const syncToGitHub = async () => {
    if (!repo) {
      showError('Repository not loaded')
      return
    }

    const [owner, repoName] = repo.full_name.split('/')
    try {
      const response = await fetch('/api/github/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ owner, repo: repoName, limit: 10 })
      })

      const data = await response.json()
      if (data.success) {
        success(`✅ Synced ${data.synced} issues to GitHub!`)
        fetchData()
      } else {
        showError(`❌ Error: ${data.message}`)
      }
    } catch (error) {
      console.error('Error syncing to GitHub:', error)
      showError('Failed to sync to GitHub')
    }
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
      case 'high': return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200'
      case 'medium': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
      case 'low': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
      case 'rejected': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
      case 'pending': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
      case 'duplicate': return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
      default: return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
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
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            <div>
              <h3 className="text-sm font-medium text-red-800 dark:text-red-200">Authentication Required</h3>
              <p className="text-sm text-red-700 dark:text-red-300 mt-1">Please sign in to use the AI Scraper feature.</p>
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
            <Bot className="w-5 h-5 mr-2" /> AI Auto-Scraper
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Monitor and manage community issues for <strong>{repo.name}</strong>
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

      {/* GitHub Connection Status */}
      <div className="bg-white dark:bg-gray-800 shadow-sm rounded-xl p-6 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <div className={`w-3 h-3 rounded-full mr-3 ${
              githubStatus === 'connected' ? 'bg-green-500' : 
              githubStatus === 'checking' ? 'bg-yellow-500' : 'bg-red-500'
            }`}></div>
            <div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                GitHub Connection
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                {githubStatus === 'connected' ? 'Connected' : 
                 githubStatus === 'checking' ? 'Checking...' : 'Disconnected'}
              </p>
            </div>
          </div>
          {githubStatus === 'disconnected' && (
            <a
              href="/api/auth/signin/github"
              className="btn bg-gray-900 hover:bg-gray-800 text-white"
            >
              Connect GitHub
            </a>
          )}
        </div>
      </div>

      {/* Repository Actions */}
      <div className="bg-white dark:bg-gray-800 shadow-sm rounded-xl p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">
              Repository Actions
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-300">
              Selected: <span className="font-medium">{repo.full_name}</span>
            </p>
          </div>
        </div>
        
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => scrapeForRepository(['reddit'])}
            disabled={scrapingInProgress}
            className="btn bg-orange-500 hover:bg-orange-600 text-white disabled:opacity-50"
          >
            {scrapingInProgress ? '⏳' : '🔴'} Scrape Reddit
          </button>
          <button
            onClick={() => scrapeForRepository(['stackoverflow'])}
            disabled={scrapingInProgress}
            className="btn bg-orange-600 hover:bg-orange-700 text-white disabled:opacity-50"
          >
            {scrapingInProgress ? '⏳' : '📚'} Scrape Stack Overflow
          </button>
          <button
            onClick={() => scrapeForRepository(['reddit', 'stackoverflow'])}
            disabled={scrapingInProgress}
            className="btn bg-purple-500 hover:bg-purple-600 text-white disabled:opacity-50"
          >
            {scrapingInProgress ? '⏳ Scraping...' : '🚀 Scrape All Sources'}
          </button>
          <button
            onClick={syncToGitHub}
            className="btn bg-green-500 hover:bg-green-600 text-white"
          >
            📤 Sync to GitHub
          </button>
        </div>
        
        {scrapingInProgress && (
          <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded border border-yellow-200 dark:border-yellow-800">
            <p className="text-sm text-yellow-800 dark:text-yellow-200">
              ⏳ Scraping in progress... This may take a few minutes. Please don't close this page.
            </p>
          </div>
        )}

        {/* AI-Generated Keywords */}
        {repoKeywords && (
          <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <div className="flex items-center mb-3">
              <span className="text-lg mr-2">🤖</span>
              <h4 className="font-medium text-gray-900 dark:text-white">
                AI-Generated Search Keywords
              </h4>
              <span className="ml-2 px-2 py-1 text-xs bg-blue-100 text-blue-800 dark:bg-blue-800 dark:text-blue-200 rounded-full">
                {Math.round(repoKeywords.confidence * 100)}% confidence
              </span>
            </div>
            
            <p className="text-sm text-gray-600 dark:text-gray-300 mb-3">
              <strong>Reasoning:</strong> {repoKeywords.reasoning}
            </p>
            
            <div className="flex flex-wrap gap-2">
              {repoKeywords.keywords.slice(0, 10).map((keyword, index) => (
                <span
                  key={index}
                  className="px-3 py-1 text-sm bg-blue-100 text-blue-800 dark:bg-blue-800 dark:text-blue-200 rounded-full"
                >
                  {keyword}
                </span>
              ))}
              {repoKeywords.keywords.length > 10 && (
                <span className="px-3 py-1 text-sm bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400 rounded-full">
                  +{repoKeywords.keywords.length - 10} more
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 shadow-sm rounded-xl p-6 mb-6">
        <div className="flex flex-wrap gap-4">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as any)}
            className="form-input"
          >
            <option value="all">All</option>
            <option value="pending">Pending</option>
            <option value="processed">Processed</option>
            <option value="duplicates">Duplicates</option>
          </select>

          <select
            value={source}
            onChange={(e) => setSource(e.target.value as any)}
            className="form-input"
          >
            <option value="all">All Sources</option>
            <option value="reddit">Reddit</option>
            <option value="stackoverflow">Stack Overflow</option>
          </select>
        </div>
      </div>

      {/* Posts List */}
      <div className="bg-white dark:bg-gray-800 shadow-sm rounded-xl">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">
            Community Issues ({posts.length})
          </h3>
        </div>
        
        {posts.length === 0 ? (
          <div className="p-6 text-center">
            <p className="text-gray-600 dark:text-gray-300">
              No issues found. Try scraping for your selected repository.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {posts.map((post) => (
              <div key={post.id} className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getSeverityColor(post.processedIssue?.severity || 'medium')}`}>
                        {post.processedIssue?.severity || 'medium'}
                      </span>
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(post.processedIssue?.status || 'pending')}`}>
                        {post.processedIssue?.status || 'pending'}
                      </span>
                      <a 
                        href={post.sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 hover:bg-blue-200 dark:hover:bg-blue-800 transition-colors"
                      >
                        {post.source} 🔗
                      </a>
                      {post.processedIssue?.confidence && (
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {Math.round(post.processedIssue.confidence * 100)}% confidence
                        </span>
                      )}
                    </div>
                    
                    <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                      <a 
                        href={post.sourceUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors flex items-center gap-2"
                      >
                        {post.title}
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                      </a>
                    </h4>
                    
                    {post.processedIssue?.summary && (
                      <p className="text-gray-600 dark:text-gray-300 mb-3">
                        {post.processedIssue.summary}
                      </p>
                    )}
                    
                    <div className="flex items-center space-x-4 text-sm text-gray-500 dark:text-gray-400">
                      <span>👤 {post.author}</span>
                      <span>👍 {post.upvotes}</span>
                      <span>💬 {post.commentCount}</span>
                      <span>📅 {new Date(post.postedAt).toLocaleDateString()}</span>
                    </div>
                    
                    {post.processedIssue?.suggestedLabels && post.processedIssue.suggestedLabels.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-1">
                        {post.processedIssue.suggestedLabels.map((label, index) => (
                          <span
                            key={index}
                            className="px-2 py-1 text-xs bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300 rounded"
                          >
                            {label}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  
                  <div className="ml-4 flex flex-col space-y-2">
                    <button
                      onClick={() => updateIssueStatus(post.processedIssue?.id || '', 'approved')}
                      className="btn-sm bg-green-500 hover:bg-green-600 text-white"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => updateIssueStatus(post.processedIssue?.id || '', 'rejected')}
                      className="btn-sm bg-red-500 hover:bg-red-600 text-white"
                    >
                      Reject
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
