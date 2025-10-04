'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'

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

interface AnalyticsContextType {
  stats: GitHubStats | null
  loading: boolean
  error: string | null
  refetch: () => void
}

const AnalyticsContext = createContext<AnalyticsContextType | undefined>(undefined)

export function AnalyticsProvider({ children }: { children: ReactNode }) {
  const [stats, setStats] = useState<GitHubStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isFetching, setIsFetching] = useState(false)

  const fetchAnalytics = async () => {
    if (isFetching) {
      console.log('🔄 [ANALYTICS] Already fetching, skipping duplicate call')
      return
    }

    setIsFetching(true)
    setLoading(true)
    setError(null)

    try {
      console.log('🔍 [ANALYTICS] Fetching analytics data...')
      const response = await fetch('/api/github/analytics')
      
      if (!response.ok) {
        throw new Error('Failed to fetch analytics')
      }
      
      const data = await response.json()
      setStats(data.stats)
      console.log('✅ [ANALYTICS] Analytics data fetched successfully')
    } catch (err) {
      console.error('❌ [ANALYTICS] Error fetching analytics:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch analytics')
    } finally {
      setLoading(false)
      setIsFetching(false)
    }
  }

  useEffect(() => {
    fetchAnalytics()
  }, [])

  const refetch = () => {
    fetchAnalytics()
  }

  return (
    <AnalyticsContext.Provider value={{ stats, loading, error, refetch }}>
      {children}
    </AnalyticsContext.Provider>
  )
}

export function useAnalytics() {
  const context = useContext(AnalyticsContext)
  if (context === undefined) {
    throw new Error('useAnalytics must be used within an AnalyticsProvider')
  }
  return context
}
