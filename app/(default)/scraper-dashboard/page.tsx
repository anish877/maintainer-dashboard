'use client'

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import ModalBasic from '@/components/modal-basic';
import { Popover, PopoverButton, PopoverPanel, Transition } from '@headlessui/react';

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

interface GitHubRepo {
  id: number;
  name: string;
  fullName: string;
  description: string;
  owner: string;
  stars: number;
  language: string;
  visibility: string;
}

export default function ScraperDashboard() {
  const { data: session } = useSession();
  const [posts, setPosts] = useState<ScrapedPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRepo, setSelectedRepo] = useState<string | null>(null);
  const [availableRepos, setAvailableRepos] = useState<GitHubRepo[]>([]);
  const [editingIssue, setEditingIssue] = useState<string | null>(null);
  const [scrapingInProgress, setScrapingInProgress] = useState<boolean>(false);
  const [githubStatus, setGithubStatus] = useState<'checking' | 'connected' | 'disconnected'>('checking');
  const [repoKeywords, setRepoKeywords] = useState<{keywords: string[], reasoning: string, confidence: number} | null>(null);
  const [filter, setFilter] = useState<'all' | 'pending' | 'processed' | 'duplicates'>('all');
  const [source, setSource] = useState<'all' | 'reddit' | 'stackoverflow'>('all');

  useEffect(() => {
    checkGitHubStatus();
  }, [session?.user?.id]);

  useEffect(() => {
    fetchUserRepos();
  }, [githubStatus, session?.user?.id]);

  useEffect(() => {
    fetchData();
    if (selectedRepo) {
      fetchRepoKeywords();
    }
  }, [filter, source, selectedRepo]);

  const fetchRepoKeywords = async () => {
    if (!selectedRepo) return;
    
    try {
      const response = await fetch(`/api/github/repo-info?repository=${encodeURIComponent(selectedRepo)}`);
      if (response.ok) {
        const data = await response.json();
        setRepoKeywords({
          keywords: data.keywords,
          reasoning: data.reasoning,
          confidence: data.confidence
        });
      }
    } catch (error) {
      console.error('Error fetching repo keywords:', error);
    }
  };

  useEffect(() => {
    // Load selected repo from localStorage
    const savedRepo = localStorage.getItem('selectedRepo');
    if (savedRepo) {
      setSelectedRepo(savedRepo);
    }
  }, []);

  const checkGitHubStatus = async () => {
    if (!session?.user?.id) {
      setGithubStatus('disconnected');
      return;
    }

    try {
      const response = await fetch('/api/github/status');
      if (response.ok) {
        const data = await response.json();
        setGithubStatus(data.connected ? 'connected' : 'disconnected');
      } else {
        setGithubStatus('disconnected');
      }
    } catch (error) {
      setGithubStatus('disconnected');
    }
  };

  const fetchUserRepos = async () => {
    if (!session?.user?.id || githubStatus !== 'connected') {
      return;
    }

    try {
      const response = await fetch('/api/github/repos');
      if (response.ok) {
        const data = await response.json();
        setAvailableRepos(data.repos || []);
      }
    } catch (error) {
      console.error('Error fetching user repositories:', error);
    }
  };

  const selectRepository = async (repoFullName: string) => {
    setSelectedRepo(repoFullName);
    localStorage.setItem('selectedRepo', repoFullName);
    fetchData();
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      
      const params = new URLSearchParams();
      if (filter !== 'all') params.append('filter', filter);
      if (source !== 'all') params.append('source', source);
      if (selectedRepo && selectedRepo !== 'undefined') {
        params.append('repository', selectedRepo);
      }
      
      const response = await fetch(`/api/scraper/posts?${params}`);
      const data = await response.json();
      
      setPosts(data.posts || []);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const scrapeForRepository = async (sources: string[] = ['reddit', 'stackoverflow']) => {
    if (!selectedRepo) {
      alert('Please select a repository first');
      return;
    }

    setScrapingInProgress(true);
    try {
      const response = await fetch('/api/scraper/repo-scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          repository: selectedRepo,
          sources: sources
        })
      });

      const data = await response.json();
      if (data.success) {
        alert(`✅ Scraping completed for ${selectedRepo}!\n\nResults:\n- Total posts: ${data.results.totalPosts}\n- New posts: ${data.results.newPosts}\n- Errors: ${data.results.errors}`);
        fetchData();
      } else {
        alert(`❌ Error: ${data.message}`);
      }
    } catch (error) {
      console.error('Error scraping repository:', error);
      alert('Failed to scrape repository');
    } finally {
      setScrapingInProgress(false);
    }
  };

  const updateIssueStatus = async (issueId: string, status: string) => {
    try {
      const response = await fetch(`/api/scraper/issues/${issueId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      
      if (response.ok) {
        fetchData();
      }
    } catch (error) {
      console.error('Error updating issue status:', error);
    }
  };

  const syncToGitHub = async () => {
    if (!selectedRepo) {
      alert('Please select a repository first');
      return;
    }

    const [owner, repo] = selectedRepo.split('/');
    try {
      const response = await fetch('/api/github/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ owner, repo, limit: 10 })
      });

      const data = await response.json();
      if (data.success) {
        alert(`✅ Synced ${data.synced} issues to GitHub!`);
        fetchData();
      } else {
        alert(`❌ Error: ${data.message}`);
      }
    } catch (error) {
      console.error('Error syncing to GitHub:', error);
      alert('Failed to sync to GitHub');
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'high': return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'low': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'rejected': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'pending': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'duplicate': return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
      default: return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
    }
  };

  if (!session) {
    return (
      <div className="px-4 sm:px-6 lg:px-8 py-8 w-full max-w-2xl mx-auto">
        <div className="bg-white dark:bg-gray-800 shadow-lg rounded-lg p-6">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              AI Auto-Scraper Dashboard
            </h1>
            <p className="text-gray-600 dark:text-gray-300 mb-6">
              Please sign in to access the AI Auto-Scraper dashboard
            </p>
            <a
              href="/api/auth/signin"
              className="btn bg-indigo-500 hover:bg-indigo-600 text-white"
            >
              Sign In
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-8">
      <div className="max-w-7xl mx-auto">
        
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            AI Auto-Scraper Dashboard
          </h1>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
            Monitor and manage community issues for your repositories
          </p>
        </div>

        {/* GitHub Connection Status */}
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6 mb-6">
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

        {/* Repository Selection */}
        {githubStatus === 'connected' && (
          <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6 mb-6">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
              Select Repository
            </h3>
            
            {availableRepos.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {availableRepos.slice(0, 9).map((repo) => (
                  <div
                    key={repo.id}
                    onClick={() => selectRepository(repo.fullName)}
                    className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                      selectedRepo === repo.fullName
                        ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20'
                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-900 dark:text-white">
                          {repo.name}
                        </h4>
                        <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                          {repo.description}
                        </p>
                        <div className="flex items-center mt-2 text-xs text-gray-500 dark:text-gray-400">
                          <span className="mr-4">⭐ {repo.stars}</span>
                          <span className="mr-4">🔧 {repo.language}</span>
                          <span>{repo.visibility}</span>
                        </div>
                      </div>
                      {selectedRepo === repo.fullName && (
                        <div className="ml-2">
                          <svg className="w-5 h-5 text-indigo-500" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-600 dark:text-gray-300">
                  Loading repositories...
                </p>
              </div>
            )}
          </div>
        )}

        {/* Repository Actions */}
        {selectedRepo && (
          <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                  Repository Actions
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  Selected: <span className="font-medium">{selectedRepo}</span>
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
        )}

        {/* Filters */}
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6 mb-6">
          <div className="flex flex-wrap gap-4">
            <Popover className="relative">
              <PopoverButton className="btn bg-white dark:bg-gray-800 border-gray-200 hover:border-gray-300 dark:border-gray-700 dark:hover:border-gray-600 text-gray-700 dark:text-gray-200">
                Filter: {filter === 'all' ? 'All' : filter.charAt(0).toUpperCase() + filter.slice(1)}
                <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </PopoverButton>
              <Transition
                enter="transition ease-out duration-200"
                enterFrom="opacity-0 translate-y-1"
                enterTo="opacity-100 translate-y-0"
                leave="transition ease-in duration-150"
                leaveFrom="opacity-100 translate-y-0"
                leaveTo="opacity-0 translate-y-1"
              >
                <PopoverPanel className="absolute z-10 mt-2 w-48 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg">
                  <div className="py-1">
                    {['all', 'pending', 'processed', 'duplicates'].map((f) => (
                      <button
                        key={f}
                        onClick={() => setFilter(f as any)}
                        className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-700 ${
                          filter === f ? 'bg-gray-100 dark:bg-gray-700' : ''
                        }`}
                      >
                        {f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1)}
                      </button>
                    ))}
                  </div>
                </PopoverPanel>
              </Transition>
            </Popover>

            <Popover className="relative">
              <PopoverButton className="btn bg-white dark:bg-gray-800 border-gray-200 hover:border-gray-300 dark:border-gray-700 dark:hover:border-gray-600 text-gray-700 dark:text-gray-200">
                Source: {source === 'all' ? 'All' : source.charAt(0).toUpperCase() + source.slice(1)}
                <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </PopoverButton>
              <Transition
                enter="transition ease-out duration-200"
                enterFrom="opacity-0 translate-y-1"
                enterTo="opacity-100 translate-y-0"
                leave="transition ease-in duration-150"
                leaveFrom="opacity-100 translate-y-0"
                leaveTo="opacity-0 translate-y-1"
              >
                <PopoverPanel className="absolute z-10 mt-2 w-48 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg">
                  <div className="py-1">
                    {['all', 'reddit', 'stackoverflow'].map((s) => (
                      <button
                        key={s}
                        onClick={() => setSource(s as any)}
                        className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-700 ${
                          source === s ? 'bg-gray-100 dark:bg-gray-700' : ''
                        }`}
                      >
                        {s === 'all' ? 'All Sources' : s.charAt(0).toUpperCase() + s.slice(1)}
                      </button>
                    ))}
                  </div>
                </PopoverPanel>
              </Transition>
            </Popover>
          </div>
        </div>

        {/* Posts List */}
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">
              Community Issues ({posts.length})
            </h3>
          </div>
          
          {loading ? (
            <div className="p-6 text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
              <p className="mt-2 text-gray-600 dark:text-gray-300">Loading...</p>
            </div>
          ) : posts.length === 0 ? (
            <div className="p-6 text-center">
              <p className="text-gray-600 dark:text-gray-300">
                No issues found. {selectedRepo ? 'Try scraping for your selected repository.' : 'Select a repository to get started.'}
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
                        onClick={() => setEditingIssue(post.id)}
                        className="btn-sm bg-indigo-500 hover:bg-indigo-600 text-white"
                      >
                        Edit
                      </button>
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

        {/* Edit Issue Modal */}
        {editingIssue && (
          <ModalBasic
            title="Edit Issue"
            isOpen={!!editingIssue}
            setIsOpen={() => setEditingIssue(null)}
          >
            <EditIssueForm
              issueId={editingIssue}
              onSave={() => {
                setEditingIssue(null);
                fetchData();
              }}
              onCancel={() => setEditingIssue(null)}
            />
          </ModalBasic>
        )}
      </div>
    </div>
  );
}

// Edit Issue Form Component
function EditIssueForm({ issueId, onSave, onCancel }: { 
  issueId: string; 
  onSave: () => void; 
  onCancel: () => void; 
}) {
  const [issue, setIssue] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchIssue();
  }, [issueId]);

  const fetchIssue = async () => {
    try {
      const response = await fetch(`/api/scraper/issues/${issueId}`);
      if (response.ok) {
        const data = await response.json();
        setIssue(data.issue);
      }
    } catch (error) {
      console.error('Error fetching issue:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const response = await fetch(`/api/scraper/issues/${issueId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          summary: issue.summary,
          severity: issue.severity,
          type: issue.type,
          suggestedLabels: issue.suggestedLabels,
          affectedArea: issue.affectedArea,
          technicalDetails: issue.technicalDetails
        })
      });

      if (response.ok) {
        onSave();
      }
    } catch (error) {
      console.error('Error saving issue:', error);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="text-center py-4">Loading...</div>;
  }

  if (!issue) {
    return <div className="text-center py-4 text-red-600">Issue not found</div>;
  }

  return (
    <form onSubmit={handleSave} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Summary
        </label>
        <textarea
          value={issue.summary}
          onChange={(e) => setIssue({ ...issue, summary: e.target.value })}
          className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-transparent dark:bg-gray-700 dark:text-gray-200"
          rows={3}
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Severity
          </label>
          <select
            value={issue.severity}
            onChange={(e) => setIssue({ ...issue, severity: e.target.value })}
            className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-transparent dark:bg-gray-700 dark:text-gray-200"
          >
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
            <option value="info">Info</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Type
          </label>
          <select
            value={issue.type}
            onChange={(e) => setIssue({ ...issue, type: e.target.value })}
            className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-transparent dark:bg-gray-700 dark:text-gray-200"
          >
            <option value="bug">Bug</option>
            <option value="feature_request">Feature Request</option>
            <option value="question">Question</option>
            <option value="documentation">Documentation</option>
          </select>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Affected Area
        </label>
        <input
          type="text"
          value={issue.affectedArea || ''}
          onChange={(e) => setIssue({ ...issue, affectedArea: e.target.value })}
          placeholder="e.g., ui, api, database, auth"
          className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-transparent dark:bg-gray-700 dark:text-gray-200"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Labels (comma-separated)
        </label>
        <input
          type="text"
          value={issue.suggestedLabels?.join(', ') || ''}
          onChange={(e) => setIssue({ ...issue, suggestedLabels: e.target.value.split(',').map(l => l.trim()).filter(l => l) })}
          placeholder="e.g., bug, ui, priority-high"
          className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-transparent dark:bg-gray-700 dark:text-gray-200"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Technical Details
        </label>
        <textarea
          value={issue.technicalDetails || ''}
          onChange={(e) => setIssue({ ...issue, technicalDetails: e.target.value })}
          className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-transparent dark:bg-gray-700 dark:text-gray-200"
          rows={4}
          placeholder="Additional technical details..."
        />
      </div>

      <div className="flex justify-end space-x-3 pt-4">
        <button
          type="button"
          onClick={onCancel}
          className="btn bg-gray-500 hover:bg-gray-600 text-white"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={saving}
          className="btn bg-indigo-500 hover:bg-indigo-600 text-white disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </form>
  );
}