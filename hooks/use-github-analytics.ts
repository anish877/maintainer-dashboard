'use client'

import { useState, useEffect } from 'react'

interface GitHubStats {
  totalRepos: number
  totalStars: number
  totalForks: number
  totalIssues: number
  totalCommits: number
  publicRepos: number
  privateRepos: number
  languages: Record<string, number>
  recentActivity: Array<{
    type: string
    repo: string
    description: string
    date: string
  }>
}

interface CommitData {
  date: string
  commits: number
  additions: number
  deletions: number
}

interface IssueData {
  totalIssues: number
  openIssues: number
  closedIssues: number
  issuesByLabel: Record<string, number>
  issuesByState: Record<string, number>
  recentIssues: Array<{
    id: number
    title: string
    state: string
    labels: string[]
    createdAt: string
    repo: string
    number: number
  }>
}

export function useGitHubAnalytics() {
  const [stats, setStats] = useState<GitHubStats | null>(null)
  const [commits, setCommits] = useState<CommitData[]>([])
  const [issues, setIssues] = useState<IssueData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        setError(null)

        // Fetch all data in parallel, but handle individual failures
        const [statsResponse, commitsResponse, issuesResponse] = await Promise.allSettled([
          fetch('/api/github/analytics'),
          fetch('/api/github/commits?days=5'),
          fetch('/api/github/issues')
        ])

        // Process stats data
        if (statsResponse.status === 'fulfilled' && statsResponse.value.ok) {
          const statsData = await statsResponse.value.json()
          setStats(statsData.stats)
        } else {
          console.warn('Failed to fetch stats data')
          setStats(null)
        }

        // Process commits data
        if (commitsResponse.status === 'fulfilled' && commitsResponse.value.ok) {
          const commitsData = await commitsResponse.value.json()
          setCommits(commitsData.commits)
        } else {
          console.warn('Failed to fetch commits data')
          setCommits([])
        }

        // Process issues data
        if (issuesResponse.status === 'fulfilled' && issuesResponse.value.ok) {
          const issuesData = await issuesResponse.value.json()
          setIssues(issuesData.issues)
        } else {
          console.warn('Failed to fetch issues data')
          setIssues({
            totalIssues: 0,
            openIssues: 0,
            closedIssues: 0,
            issuesByLabel: {},
            issuesByState: {},
            recentIssues: []
          })
        }

        // Check if any critical data failed
        const criticalFailures = [
          statsResponse.status === 'rejected' || (statsResponse.status === 'fulfilled' && !statsResponse.value.ok),
          commitsResponse.status === 'rejected' || (commitsResponse.status === 'fulfilled' && !commitsResponse.value.ok),
          issuesResponse.status === 'rejected' || (issuesResponse.status === 'fulfilled' && !issuesResponse.value.ok)
        ]

        if (criticalFailures.every(failed => failed)) {
          setError('Failed to fetch all GitHub data. Please check your authentication and try again.')
        }

      } catch (err) {
        console.error('Error fetching GitHub analytics:', err)
        setError(err instanceof Error ? err.message : 'Failed to fetch data')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  const refetch = async () => {
    setLoading(true)
    setError(null)
    
    try {
      const [statsResponse, commitsResponse, issuesResponse] = await Promise.all([
        fetch('/api/github/analytics'),
        fetch('/api/github/commits?days=5'),
        fetch('/api/github/issues')
      ])

      if (!statsResponse.ok || !commitsResponse.ok || !issuesResponse.ok) {
        throw new Error('Failed to fetch GitHub data')
      }

      const [statsData, commitsData, issuesData] = await Promise.all([
        statsResponse.json(),
        commitsResponse.json(),
        issuesResponse.json()
      ])

      setStats(statsData.stats)
      setCommits(commitsData.commits)
      setIssues(issuesData.issues)
    } catch (err) {
      console.error('Error refetching GitHub analytics:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch data')
    } finally {
      setLoading(false)
    }
  }

  return {
    stats,
    commits,
    issues,
    loading,
    error,
    refetch
  }
}

export function useGitHubCommits(repo?: string, days: number = 5) {
  const [commits, setCommits] = useState<CommitData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchCommits = async () => {
      try {
        setLoading(true)
        setError(null)

        const url = `/api/github/commits?days=${days}${repo ? `&repo=${repo}` : ''}`
        const response = await fetch(url)

        if (!response.ok) {
          throw new Error('Failed to fetch commit data')
        }

        const data = await response.json()
        setCommits(data.commits)
      } catch (err) {
        console.error('Error fetching commits:', err)
        setError(err instanceof Error ? err.message : 'Failed to fetch commits')
      } finally {
        setLoading(false)
      }
    }

    fetchCommits()
  }, [repo, days])

  return { commits, loading, error }
}

export function useGitHubIssues(repo?: string, state: string = 'all') {
  const [issues, setIssues] = useState<IssueData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchIssues = async () => {
      try {
        setLoading(true)
        setError(null)

        const url = `/api/github/issues?${repo ? `repo=${repo}&` : ''}state=${state}`
        const response = await fetch(url)

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          throw new Error(errorData.error || `HTTP ${response.status}: Failed to fetch issue data`)
        }

        const data = await response.json()
        setIssues(data.issues)
      } catch (err) {
        console.error('Error fetching issues:', err)
        const errorMessage = err instanceof Error ? err.message : 'Failed to fetch issues'
        setError(errorMessage)
        
        // Set default empty data instead of null to prevent UI crashes
        setIssues({
          totalIssues: 0,
          openIssues: 0,
          closedIssues: 0,
          issuesByLabel: {},
          issuesByState: {},
          recentIssues: []
        })
      } finally {
        setLoading(false)
      }
    }

    fetchIssues()
  }, [repo, state])

  return { issues, loading, error }
}
