'use client'

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useParams, useRouter } from 'next/navigation';
import ModalBasic from '@/components/modal-basic';

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

interface ScrapingResult {
  id: string;
  title: string;
  content: string;
  source: string;
  sourceUrl: string;
  author: string;
  upvotes: number;
  commentCount: number;
  postedAt: string;
  isBug: boolean;
  confidence: number;
  severity: string;
  summary: string;
  technicalDetails: string;
  suggestedLabels: string[];
  affectedArea: string;
  userImpact: number;
  sentiment: number;
}

interface GeneratedIssue {
  title: string;
  body: string;
  labels: string[];
  severity: string;
  type: string;
  sourceUrl: string;
  sourcePost: string;
}

export default function SimpleScraper() {
  const { data: session } = useSession();
  const params = useParams();
  const router = useRouter();
  const repoName = params.repoName as string;
  
  const [selectedRepo, setSelectedRepo] = useState<string | null>(null);
  const [availableRepos, setAvailableRepos] = useState<GitHubRepo[]>([]);
  const [githubStatus, setGithubStatus] = useState<'checking' | 'connected' | 'disconnected'>('checking');
  const [scrapingInProgress, setScrapingInProgress] = useState(false);
  const [results, setResults] = useState<ScrapingResult[]>([]);
  const [editingIssue, setEditingIssue] = useState<GeneratedIssue | null>(null);
  const [showIssueModal, setShowIssueModal] = useState(false);
  const [aiKeywords, setAiKeywords] = useState<{keywords: string[], reasoning: string, confidence: number} | null>(null);
  const [scrapingStats, setScrapingStats] = useState<{total: number, bugs: number, complaints: number} | null>(null);
  const [scrapingProgress, setScrapingProgress] = useState<string>('');
  const [repo, setRepo] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (repoName) {
      fetchRepoData();
    }
  }, [repoName]);

  useEffect(() => {
    checkGitHubStatus();
  }, [session?.user?.id]);

  useEffect(() => {
    fetchUserRepos();
  }, [githubStatus, session?.user?.id]);

  useEffect(() => {
    if (selectedRepo) {
      generateKeywords();
    }
  }, [selectedRepo]);

  const fetchRepoData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`/api/github/repos/${repoName}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        if (response.status === 403 && errorData.isCollaborator) {
          setError('You are not the owner of this repository. You may be a collaborator.');
          return;
        }
        throw new Error(errorData.error || 'Failed to fetch repository data');
      }
      
      const data = await response.json();
      setRepo(data.repo);
      setSelectedRepo(repoName); // Auto-select the repo from URL
    } catch (err) {
      console.error('Error fetching repo data:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch repository data');
    } finally {
      setLoading(false);
    }
  };

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

  const generateKeywords = async () => {
    if (!selectedRepo) return;
    
    try {
      const response = await fetch(`/api/ai/generate-keywords?repository=${encodeURIComponent(selectedRepo)}`);
      if (response.ok) {
        const data = await response.json();
        setAiKeywords({
          keywords: data.keywords,
          reasoning: data.reasoning,
          confidence: data.confidence
        });
      }
    } catch (error) {
      console.error('Error generating keywords:', error);
    }
  };

  const analyzeRepository = async () => {
    if (!selectedRepo) {
      alert('Please select a repository first');
      return;
    }

    setScrapingInProgress(true);
    setResults([]);
    setScrapingStats(null);
    setScrapingProgress('🚀 Starting fast analysis...');

    try {
      // Step 1: Generate keywords
      setScrapingProgress('🤖 Generating AI keywords...');
      const keywordResponse = await fetch(`/api/ai/generate-keywords?repository=${encodeURIComponent(selectedRepo)}`);
      if (keywordResponse.ok) {
        const keywordData = await keywordResponse.json();
        setAiKeywords({
          keywords: keywordData.keywords,
          reasoning: keywordData.reasoning,
          confidence: keywordData.confidence
        });
      }

      // Step 2: Fast web search and analysis
      setScrapingProgress(`🔍 Fast web search for ${selectedRepo}...`);
      const response = await fetch('/api/fast-analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          repository: selectedRepo,
          sources: ['reddit', 'stackoverflow', 'github']
        })
      });

      setScrapingProgress('🧠 AI is analyzing search results...');
      const data = await response.json();
      
      if (data.success) {
        setResults(data.results || []);
        setScrapingStats({
          total: data.stats?.total || 0,
          bugs: data.stats?.bugs || 0,
          complaints: data.stats?.complaints || 0
        });
        setScrapingProgress(`✅ Found ${data.results?.length || 0} relevant issues in seconds!`);
      } else {
        setScrapingProgress('❌ Analysis failed');
        alert(`❌ Error: ${data.message}`);
      }
    } catch (error) {
      console.error('Error analyzing repository:', error);
      setScrapingProgress('❌ Analysis failed');
      alert('Failed to analyze repository');
    } finally {
      setScrapingInProgress(false);
    }
  };

  const generateIssue = async (result: ScrapingResult) => {
    try {
      const response = await fetch('/api/simple-scraper/generate-issue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          repository: selectedRepo,
          result: result
        })
      });

      const data = await response.json();
      if (data.success) {
        setEditingIssue(data.issue);
        setShowIssueModal(true);
      } else {
        alert(`❌ Error: ${data.message}`);
      }
    } catch (error) {
      console.error('Error generating issue:', error);
      alert('Failed to generate issue');
    }
  };

  const postIssue = async (issue: GeneratedIssue) => {
    if (!selectedRepo) return;

    try {
      const response = await fetch('/api/simple-scraper/post-issue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          repository: selectedRepo,
          issue: issue
        })
      });

      const data = await response.json();
      if (data.success) {
        alert(`✅ Issue posted successfully!\n\nGitHub Issue: ${data.githubUrl}`);
        setShowIssueModal(false);
        setEditingIssue(null);
      } else {
        alert(`❌ Error: ${data.message}`);
      }
    } catch (error) {
      console.error('Error posting issue:', error);
      alert('Failed to post issue');
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

  if (loading) {
    return (
      <div className="px-4 sm:px-6 lg:px-8 py-8 w-full max-w-4xl mx-auto">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
            <p className="text-gray-500 dark:text-gray-400">Loading repository data...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !repo) {
    const isCollaboratorError = error?.includes('not the owner of this repository');
    
    return (
      <div className="px-4 sm:px-6 lg:px-8 py-8 w-full max-w-4xl mx-auto">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="text-red-500 mb-4 text-4xl">
              {isCollaboratorError ? '👥' : '⚠️'}
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
              className="inline-flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-indigo-700 transition-colors"
            >
              ← Go Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="px-4 sm:px-6 lg:px-8 py-8 w-full max-w-4xl mx-auto">
        <div className="bg-white dark:bg-gray-800 shadow-lg rounded-lg p-6">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              Simple Repository Analyzer
            </h1>
            <p className="text-gray-600 dark:text-gray-300 mb-6">
              Please sign in to analyze your repositories for bugs and complaints
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
      <div className="max-w-6xl mx-auto">
        
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
              🚀 Simple Repository Analyzer
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Fast web search analysis for <strong>{repo.name}</strong>
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

        {/* Repository Confirmation */}
        {githubStatus === 'connected' && selectedRepo && (
          <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6 mb-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="w-3 h-3 rounded-full mr-3 bg-green-500"></div>
                <div>
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                    Repository Selected
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    Analyzing: <strong>{selectedRepo}</strong>
                  </p>
                </div>
              </div>
              <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                <span className="mr-4">⭐ {repo.stargazers_count}</span>
                <span className="mr-4">🔧 {repo.language || 'N/A'}</span>
                <span>{repo.private ? 'Private' : 'Public'}</span>
              </div>
            </div>
          </div>
        )}

        {/* AI Keywords Display */}
        {selectedRepo && aiKeywords && (
          <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6 mb-6">
            <div className="flex items-center mb-4">
              <span className="text-2xl mr-3">🤖</span>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                AI-Generated Search Keywords
              </h3>
              <span className="ml-3 px-3 py-1 text-sm bg-blue-100 text-blue-800 dark:bg-blue-800 dark:text-blue-200 rounded-full">
                {Math.round(aiKeywords.confidence * 100)}% confidence
              </span>
            </div>
            
            <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
              <strong>AI Reasoning:</strong> {aiKeywords.reasoning}
            </p>
            
            <div className="flex flex-wrap gap-2 mb-4">
              {aiKeywords.keywords.slice(0, 15).map((keyword, index) => (
                <span
                  key={index}
                  className="px-3 py-1 text-sm bg-blue-100 text-blue-800 dark:bg-blue-800 dark:text-blue-200 rounded-full"
                >
                  {keyword}
                </span>
              ))}
              {aiKeywords.keywords.length > 15 && (
                <span className="px-3 py-1 text-sm bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400 rounded-full">
                  +{aiKeywords.keywords.length - 15} more
                </span>
              )}
            </div>

            <button
              onClick={analyzeRepository}
              disabled={scrapingInProgress}
              className="btn bg-indigo-500 hover:bg-indigo-600 text-white disabled:opacity-50"
            >
              {scrapingInProgress ? '⚡ Fast Analysis...' : '⚡ Fast Web Search'}
            </button>
          </div>
        )}

        {/* Scraping Progress */}
        {scrapingInProgress && (
          <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6 mb-6">
            <div className="flex items-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500 mr-4"></div>
              <div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                  Analyzing Repository
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  {scrapingProgress}
                </p>
                <div className="mt-2">
                  <div className="w-full bg-gray-200 rounded-full h-2 dark:bg-gray-700">
                    <div className="bg-indigo-600 h-2 rounded-full animate-pulse" style={{width: '60%'}}></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Results */}
        {results.length > 0 && (
          <div className="bg-white dark:bg-gray-800 shadow rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                  Analysis Results
                </h3>
                {scrapingStats && (
                  <div className="flex space-x-4 text-sm text-gray-600 dark:text-gray-300">
                    <span>Total: {scrapingStats.total}</span>
                    <span>Bugs: {scrapingStats.bugs}</span>
                    <span>Complaints: {scrapingStats.complaints}</span>
                  </div>
                )}
              </div>
            </div>
            
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {results.map((result) => (
                <div key={result.id} className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getSeverityColor(result.severity)}`}>
                          {result.severity}
                        </span>
                        <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                          {result.source}
                        </span>
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {Math.round(result.confidence * 100)}% confidence
                        </span>
                      </div>
                      
                      <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                        <a 
                          href={result.sourceUrl} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors flex items-center gap-2"
                        >
                          {result.title}
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                          </svg>
                        </a>
                      </h4>
                      
                      <p className="text-gray-600 dark:text-gray-300 mb-3">
                        {result.summary}
                      </p>
                      
                      <div className="flex items-center space-x-4 text-sm text-gray-500 dark:text-gray-400 mb-3">
                        <span>👤 {result.author}</span>
                        <span>👍 {result.upvotes}</span>
                        <span>💬 {result.commentCount}</span>
                        <span>📅 {new Date(result.postedAt).toLocaleDateString()}</span>
                      </div>
                      
                      {result.suggestedLabels && result.suggestedLabels.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-3">
                          {result.suggestedLabels.map((label, index) => (
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
                    
                    <div className="ml-4">
                      <button
                        onClick={() => generateIssue(result)}
                        className="btn bg-green-500 hover:bg-green-600 text-white"
                      >
                        📝 Create Issue
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Issue Editor Modal */}
        {showIssueModal && editingIssue && (
          <ModalBasic
            title="Edit Generated Issue"
            isOpen={showIssueModal}
            setIsOpen={() => setShowIssueModal(false)}
          >
            <IssueEditor
              issue={editingIssue}
              onSave={(updatedIssue) => {
                postIssue(updatedIssue);
              }}
              onCancel={() => {
                setShowIssueModal(false);
                setEditingIssue(null);
              }}
            />
          </ModalBasic>
        )}
      </div>
    </div>
  );
}

// Issue Editor Component
function IssueEditor({ 
  issue, 
  onSave, 
  onCancel 
}: { 
  issue: GeneratedIssue; 
  onSave: (issue: GeneratedIssue) => void; 
  onCancel: () => void; 
}) {
  const [editedIssue, setEditedIssue] = useState<GeneratedIssue>(issue);
  const [saving, setSaving] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    
    try {
      onSave(editedIssue);
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSave} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Issue Title
        </label>
        <input
          type="text"
          value={editedIssue.title}
          onChange={(e) => setEditedIssue({ ...editedIssue, title: e.target.value })}
          className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-transparent dark:bg-gray-700 dark:text-gray-200"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Issue Description
        </label>
        <textarea
          value={editedIssue.body}
          onChange={(e) => setEditedIssue({ ...editedIssue, body: e.target.value })}
          className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-transparent dark:bg-gray-700 dark:text-gray-200"
          rows={8}
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Severity
          </label>
          <select
            value={editedIssue.severity}
            onChange={(e) => setEditedIssue({ ...editedIssue, severity: e.target.value })}
            className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-transparent dark:bg-gray-700 dark:text-gray-200"
          >
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Type
          </label>
          <select
            value={editedIssue.type}
            onChange={(e) => setEditedIssue({ ...editedIssue, type: e.target.value })}
            className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-transparent dark:bg-gray-700 dark:text-gray-200"
          >
            <option value="bug">Bug</option>
            <option value="feature_request">Feature Request</option>
            <option value="question">Question</option>
          </select>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Labels (comma-separated)
        </label>
        <input
          type="text"
          value={editedIssue.labels.join(', ')}
          onChange={(e) => setEditedIssue({ ...editedIssue, labels: e.target.value.split(',').map(l => l.trim()).filter(l => l) })}
          className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-transparent dark:bg-gray-700 dark:text-gray-200"
          placeholder="e.g., bug, ui, priority-high"
        />
      </div>

      <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
        <h4 className="font-medium text-gray-900 dark:text-white mb-2">Source Information</h4>
        <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">
          <strong>Original Post:</strong> <a href={editedIssue.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800">View Source</a>
        </p>
        <p className="text-sm text-gray-600 dark:text-gray-300">
          <strong>Source Content:</strong> {editedIssue.sourcePost.substring(0, 200)}...
        </p>
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
          {saving ? 'Posting...' : 'Post to GitHub'}
        </button>
      </div>
    </form>
  );
}
