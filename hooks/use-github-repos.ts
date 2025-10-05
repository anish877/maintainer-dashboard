'use client'

import { useState, useEffect } from 'react'

interface GitHubRepo {
  id: string // Database ID
  githubId?: number // GitHub ID for reference
  name: string
  fullName: string
  description: string
  owner: string
  stars: number
  language: string
  visibility: string
  createdAt: string
  updatedAt: string
  cloneUrl: string
  htmlUrl: string
  defaultBranch: string
  forks: number
  openIssues: number
  size: number
  archived: boolean
  disabled: boolean
  fork: boolean
}

export function useGitHubRepos() {
  const [repos, setRepos] = useState<GitHubRepo[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [loadingMessage, setLoadingMessage] = useState('Loading repositories...')

  useEffect(() => {
    const fetchRepos = async () => {
      try {
        setLoading(true)
        setError(null)
        setLoadingMessage('Fetching repositories from GitHub...')

        const response = await fetch('/api/github/repos')
        
        if (!response.ok) {
          throw new Error('Failed to fetch repositories')
        }

        setLoadingMessage('Processing and syncing repositories...')
        const data = await response.json()
        setRepos(data.repos || [])
        
        if (data.note) {
          setLoadingMessage(data.note)
        }
      } catch (err) {
        console.error('Error fetching repositories:', err)
        setError(err instanceof Error ? err.message : 'Failed to fetch repositories')
        setRepos([])
      } finally {
        setLoading(false)
      }
    }

    fetchRepos()
  }, [])

  const refetch = async () => {
    setLoading(true)
    setError(null)
    
    try {
      const response = await fetch('/api/github/repos')
      
      if (!response.ok) {
        throw new Error('Failed to fetch repositories')
      }

      const data = await response.json()
      setRepos(data.repos || [])
    } catch (err) {
      console.error('Error refetching repositories:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch repositories')
      setRepos([])
    } finally {
      setLoading(false)
    }
  }

  return {
    repos,
    loading,
    error,
    loadingMessage,
    refetch
  }
}
