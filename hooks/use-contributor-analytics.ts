'use client'

import { useState, useEffect } from 'react'

interface ContributorHealth {
  id: string
  username: string
  totalContributions: number
  issuesCreated: number
  prsCreated: number
  commitsCount: number
  commentsCount: number
  isFirstTime: boolean
  isAtRisk: boolean
  isRisingStar: boolean
  retentionScore: number
  engagementScore: number
  burnoutRisk: number
  location?: string
  timezone?: string
  country?: string
  firstContributionAt?: string
  lastContributionAt?: string
  avgTimeBetweenContributions?: number
  contributionPattern?: any
  dayOfWeekPattern?: any
  avgResponseTime?: number
  codeReviewScore?: number
  collaborationScore?: number
  contributionStreak: number
  longestStreak: number
  decliningActivity: boolean
  longAbsence: boolean
  negativeFeedback: boolean
  recentActivity: any[]
}

interface ContributorAnalytics {
  repository: {
    id: string
    fullName: string
    owner: string
    name: string
  }
  timeRange: string
  metrics: {
    totalContributors: number
    firstTimeContributors: number
    atRiskContributors: number
    risingStars: number
    avgRetentionScore: number
    avgEngagementScore: number
    diversity: {
      countries: number
      timezones: number
      geographicDistribution: string[]
    }
  }
  healthDistribution: {
    excellent: number
    good: number
    fair: number
    poor: number
  }
  contributionTrend: Array<{
    date: string
    total: number
    issues: number
    prs: number
    commits: number
  }>
  contributors: ContributorHealth[]
  insights: Array<{
    id: string
    type: string
    title: string
    description: string
    severity: string
    confidence: number
    contributor: string
    createdAt: string
  }>
}

interface ContributorDetails extends ContributorHealth {
  repository: {
    id: string
    fullName: string
    owner: string
    name: string
  }
  timeRange: string
  activityPattern?: {
    hours: { [key: string]: number }
    days: { [key: string]: number }
    mostActiveHour: string
    mostActiveDay: string
  }
  qualityMetrics: {
    avgPRSize: number
    mergeRate: number
    avgIssueResolutionTime: number
  }
  recentActivity: {
    issues: Array<{
      id: string
      number: number
      title: string
      state: string
      createdAt: string
      closedAt?: string
      labels: string[]
    }>
    pullRequests: Array<{
      id: string
      number: number
      title: string
      state: string
      createdAt: string
      closedAt?: string
      mergedAt?: string
      additions: number
      deletions: number
      changedFiles: number
    }>
  }
  healthMetrics: Array<{
    id: string
    date: string
    contributionsToday: number
    issuesToday: number
    prsToday: number
    commitsToday: number
    commentsToday: number
    contributionsThisWeek: number
    contributionsThisMonth: number
    monthlyGrowthRate: number
    dailyHealthScore: number
    engagementLevel: string
    activeHours?: any
    mostActiveDay?: string
  }>
  insights: Array<{
    id: string
    type: string
    title: string
    description: string
    severity: string
    confidence: number
    createdAt: string
  }>
}

export function useContributorAnalytics(repositoryId?: string, timeRange: string = '30d') {
  const [analytics, setAnalytics] = useState<ContributorAnalytics | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchAnalytics = async (repoId: string, range: string = timeRange) => {
    if (!repoId) return

    try {
      setLoading(true)
      setError(null)

      const response = await fetch(`/api/contributor-analytics?repositoryId=${repoId}&timeRange=${range}`)
      
      if (!response.ok) {
        throw new Error('Failed to fetch contributor analytics')
      }

      const data = await response.json()
      setAnalytics(data)
    } catch (err) {
      console.error('Error fetching contributor analytics:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch contributor analytics')
      setAnalytics(null)
    } finally {
      setLoading(false)
    }
  }

  const analyzeContributors = async (repoId: string) => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch('/api/contributor-analytics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          repositoryId: repoId,
          action: 'analyze'
        })
      })

      if (!response.ok) {
        throw new Error('Failed to analyze contributors')
      }

      const data = await response.json()
      
      // Refresh analytics after analysis
      await fetchAnalytics(repoId)
      
      return data
    } catch (err) {
      console.error('Error analyzing contributors:', err)
      setError(err instanceof Error ? err.message : 'Failed to analyze contributors')
      throw err
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (repositoryId) {
      fetchAnalytics(repositoryId, timeRange)
    }
  }, [repositoryId, timeRange])

  return {
    analytics,
    loading,
    error,
    fetchAnalytics,
    analyzeContributors,
    refetch: () => repositoryId && fetchAnalytics(repositoryId, timeRange)
  }
}

export function useContributorDetails(contributorId?: string, timeRange: string = '30d') {
  const [contributor, setContributor] = useState<ContributorDetails | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchContributorDetails = async (id: string, range: string = timeRange) => {
    if (!id) return

    try {
      setLoading(true)
      setError(null)

      const response = await fetch(`/api/contributor-analytics/${id}?timeRange=${range}`)
      
      if (!response.ok) {
        throw new Error('Failed to fetch contributor details')
      }

      const data = await response.json()
      setContributor(data)
    } catch (err) {
      console.error('Error fetching contributor details:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch contributor details')
      setContributor(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (contributorId) {
      fetchContributorDetails(contributorId, timeRange)
    }
  }, [contributorId, timeRange])

  return {
    contributor,
    loading,
    error,
    fetchContributorDetails,
    refetch: () => contributorId && fetchContributorDetails(contributorId, timeRange)
  }
}
