'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';

interface TriageResult {
  success: boolean;
  message: string;
  details: {
    totalIssues: number;
    successfulTriages: number;
    failedTriages: number;
    averageConfidence: number;
    goodFirstIssues: number;
    criticalIssues: number;
    highPriorityIssues: number;
    commonLabels: Record<string, number>;
    suggestedAssignees: string[];
    similarIssueClusters: Record<string, number[]>;
  };
  results: Array<{
    issueNumber: number;
    type: string;
    priority: string;
    component: string;
    difficulty: string;
    confidence: number;
    suggestedLabels: string[];
    suggestedAssignees: string[];
    aiReasoning: {
      type: string;
      priority: string;
      component: string;
      difficulty: string;
    };
  }>;
}

export function IssueTriagePanel() {
  const { data: session, status } = useSession();
  const [formData, setFormData] = useState({
    owner: '',
    repo: '',
    issueNumbers: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<TriageResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      // Parse issue numbers
      const issueNumbers = formData.issueNumbers
        .split(',')
        .map(num => parseInt(num.trim()))
        .filter(num => !isNaN(num));

      if (issueNumbers.length === 0) {
        throw new Error('Please enter valid issue numbers');
      }

      const response = await fetch('/api/triage/issues', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          owner: formData.owner,
          repo: formData.repo,
          issueNumbers,
          includeComments: true,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to triage issues');
      }

      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (status === 'unauthenticated') {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800">
              Authentication Required
            </h3>
            <div className="mt-2 text-sm text-red-700">
              <p>Please sign in with GitHub to use the issue triage system.</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          🤖 AI Issue Triage System
        </h1>
        <p className="text-gray-600">
          Automatically analyze and categorize GitHub issues using AI. No manual tokens required - uses your GitHub OAuth session.
        </p>
        <div className="mt-4 flex items-center text-sm text-gray-500">
          <span className="mr-2">Signed in as:</span>
          <img 
            src={session?.user?.image || ''} 
            alt="User avatar" 
            className="w-6 h-6 rounded-full mr-2"
          />
          <span className="font-medium">{session?.user?.name || session?.user?.username}</span>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bg-white shadow rounded-lg p-6 mb-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label htmlFor="owner" className="block text-sm font-medium text-gray-700 mb-2">
              Repository Owner
            </label>
            <input
              type="text"
              id="owner"
              name="owner"
              value={formData.owner}
              onChange={handleInputChange}
              placeholder="e.g., microsoft"
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>
          
          <div>
            <label htmlFor="repo" className="block text-sm font-medium text-gray-700 mb-2">
              Repository Name
            </label>
            <input
              type="text"
              id="repo"
              name="repo"
              value={formData.repo}
              onChange={handleInputChange}
              placeholder="e.g., vscode"
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>
        </div>

        <div className="mt-6">
          <label htmlFor="issueNumbers" className="block text-sm font-medium text-gray-700 mb-2">
            Issue Numbers
          </label>
          <input
            type="text"
            id="issueNumbers"
            name="issueNumbers"
            value={formData.issueNumbers}
            onChange={handleInputChange}
            placeholder="e.g., 123, 124, 125"
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            required
          />
          <p className="mt-1 text-sm text-gray-500">
            Enter comma-separated issue numbers to triage
          </p>
        </div>

        <div className="mt-6">
          <button
            type="submit"
            disabled={isLoading}
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <>
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Triaging Issues...
              </>
            ) : (
              '🚀 Start AI Triage'
            )}
          </button>
        </div>
      </form>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 mb-8">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Error</h3>
              <div className="mt-2 text-sm text-red-700">
                <p>{error}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {result && (
        <div className="space-y-6">
          <div className="bg-green-50 border border-green-200 rounded-lg p-6">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-green-800">Triage Complete</h3>
                <div className="mt-2 text-sm text-green-700">
                  <p className="whitespace-pre-line">{result.message}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white shadow rounded-lg p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                    <span className="text-blue-600 font-semibold text-sm">{result.details.totalIssues}</span>
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-900">Total Issues</p>
                  <p className="text-sm text-gray-500">Analyzed</p>
                </div>
              </div>
            </div>

            <div className="bg-white shadow rounded-lg p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                    <span className="text-green-600 font-semibold text-sm">{result.details.averageConfidence}%</span>
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-900">Avg Confidence</p>
                  <p className="text-sm text-gray-500">AI Analysis</p>
                </div>
              </div>
            </div>

            <div className="bg-white shadow rounded-lg p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center">
                    <span className="text-yellow-600 font-semibold text-sm">{result.details.goodFirstIssues}</span>
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-900">Good First Issues</p>
                  <p className="text-sm text-gray-500">For newcomers</p>
                </div>
              </div>
            </div>

            <div className="bg-white shadow rounded-lg p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
                    <span className="text-red-600 font-semibold text-sm">{result.details.criticalIssues}</span>
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-900">Critical Issues</p>
                  <p className="text-sm text-gray-500">Need attention</p>
                </div>
              </div>
            </div>
          </div>

          {result.results.length > 0 && (
            <div className="bg-white shadow rounded-lg">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">Issue Analysis Results</h3>
              </div>
              <div className="divide-y divide-gray-200">
                {result.results.map((issue, index) => (
                  <div key={index} className="px-6 py-4">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-sm font-medium text-gray-900">
                        Issue #{issue.issueNumber}
                      </h4>
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {issue.confidence}% confidence
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-3">
                      <div>
                        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Type</p>
                        <p className="text-sm text-gray-900 capitalize">{issue.type}</p>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Priority</p>
                        <p className="text-sm text-gray-900 capitalize">{issue.priority}</p>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Component</p>
                        <p className="text-sm text-gray-900 capitalize">{issue.component}</p>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Difficulty</p>
                        <p className="text-sm text-gray-900 capitalize">{issue.difficulty}</p>
                      </div>
                    </div>

                    <div className="mb-3">
                      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Suggested Labels</p>
                      <div className="flex flex-wrap gap-1">
                        {issue.suggestedLabels.map((label, labelIndex) => (
                          <span key={labelIndex} className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                            {label}
                          </span>
                        ))}
                      </div>
                    </div>

                    <details className="mt-3">
                      <summary className="text-sm font-medium text-gray-700 cursor-pointer hover:text-gray-900">
                        AI Reasoning
                      </summary>
                      <div className="mt-2 text-sm text-gray-600 space-y-2">
                        <p><strong>Type:</strong> {issue.aiReasoning.type}</p>
                        <p><strong>Priority:</strong> {issue.aiReasoning.priority}</p>
                        <p><strong>Component:</strong> {issue.aiReasoning.component}</p>
                        <p><strong>Difficulty:</strong> {issue.aiReasoning.difficulty}</p>
                      </div>
                    </details>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
