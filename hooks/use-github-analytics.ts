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
  const [issues, setIssues] = useState<IssueData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        setError(null)

        // Fetch only stats and issues data, no commits
        const [statsResponse, issuesResponse] = await Promise.allSettled([
          fetch('/api/github/analytics'),
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
      const [statsResponse, issuesResponse] = await Promise.all([
        fetch('/api/github/analytics'),
        fetch('/api/github/issues')
      ])

      if (!statsResponse.ok || !issuesResponse.ok) {
        throw new Error('Failed to fetch GitHub data')
      }

      const [statsData, issuesData] = await Promise.all([
        statsResponse.json(),
        issuesResponse.json()
      ])

      setStats(statsData.stats)
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
    issues,
    loading,
    error,
    refetch
  }
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

export function useGitHubCommits(repo?: string, days: number = 5) {
  const [commits, setCommits] = useState<Array<{date: string, commits: number}>>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const generateMockData = () => {
      const mockCommits = []
      for (let i = days - 1; i >= 0; i--) {
        const date = new Date()
        date.setDate(date.getDate() - i)
        mockCommits.push({
          date: date.toISOString(),
          commits: Math.floor(Math.random() * 10) + 1 // Random commits between 1-10
        })
      }
      return mockCommits
    }

    // Simulate loading
    setTimeout(() => {
      setCommits(generateMockData())
      setLoading(false)
    }, 500)
  }, [repo, days])

  return { commits, loading, error }
}
