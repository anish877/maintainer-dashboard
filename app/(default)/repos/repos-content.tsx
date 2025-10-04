'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import DeleteButton from '@/components/delete-button'
import DateSelect from '@/components/date-select'
import FilterButton from '@/components/dropdown-filter'
import ReposTable from './repos-table'
import PaginationClassic from '@/components/pagination-classic'

import Image01 from '@/public/images/icon-01.svg'
import Image02 from '@/public/images/icon-02.svg'
import Image03 from '@/public/images/icon-03.svg'

interface GitHubRepo {
  id: number
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

function ReposContent() {
  const { data: session, status } = useSession()
  const [repos, setRepos] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (status === 'authenticated') {
      fetchRepositories()
    } else if (status === 'unauthenticated') {
      setRepos(defaultRepos)
      setLoading(false)
    }
  }, [status])

  const fetchRepositories = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const response = await fetch('/api/github/analytics')
      
      if (!response.ok) {
        throw new Error('Failed to fetch repositories')
      }
      
      const data = await response.json()
      setRepos(data.stats?.recentActivity || [])
    } catch (err) {
      console.error('Error fetching repositories:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch repositories')
      setRepos(defaultRepos) // Fallback to dummy data
    } finally {
      setLoading(false)
    }
  }

  // Default dummy data for when not authenticated or loading
  const defaultRepos = [
    {
      id: 0,
      image: Image01,
      order: 'maintainer-dashboard',
      date: '22/01/2024',
      customer: 'anugragupta',
      total: '1.2k',
      status: 'Active',
      items: 'TypeScript',
      location: '🇺🇸 Public',
      type: 'Repository',
      description: 'A comprehensive dashboard for managing GitHub repositories, issues, and team collaboration.'
    },
    {
      id: 1,
      image: Image02,
      order: 'react-component-library',
      date: '21/01/2024',
      customer: 'anugragupta',
      total: '856',
      status: 'Active',
      items: 'JavaScript',
      location: '🇺🇸 Public',
      type: 'Repository',
      description: 'A collection of reusable React components with TypeScript support and comprehensive documentation.'
    },
    {
      id: 2,
      image: Image03,
      order: 'nodejs-api-server',
      date: '20/01/2024',
      customer: 'anugragupta',
      total: '423',
      status: 'Archived',
      items: 'JavaScript',
      location: '🇺🇸 Public',
      type: 'Repository',
      description: 'RESTful API server built with Node.js, Express, and MongoDB. Features authentication, validation, and error handling.'
    },
    {
      id: 3,
      image: Image01,
      order: 'portfolio-website',
      date: '19/01/2024',
      customer: 'anugragupta',
      total: '234',
      status: 'Active',
      items: 'HTML',
      location: '🇺🇸 Public',
      type: 'Repository',
      description: 'Personal portfolio website showcasing projects, skills, and experience. Built with modern web technologies.'
    },
    {
      id: 4,
      image: Image02,
      order: 'mobile-app',
      date: '18/01/2024',
      customer: 'anugragupta',
      total: '567',
      status: 'Active',
      items: 'Dart',
      location: '🔒 Private',
      type: 'Repository',
      description: 'Cross-platform mobile application built with Flutter. Features include user authentication, real-time chat, and offline support.'
    },
    {
      id: 5,
      image: Image03,
      order: 'data-analytics-tool',
      date: '17/01/2024',
      customer: 'anugragupta',
      total: '789',
      status: 'Active',
      items: 'Python',
      location: '🇺🇸 Public',
      type: 'Repository',
      description: 'Advanced data analytics and visualization tool with machine learning capabilities for business intelligence.'
    },
    {
      id: 6,
      image: Image01,
      order: 'blockchain-dapp',
      date: '16/01/2024',
      customer: 'anugragupta',
      total: '345',
      status: 'Active',
      items: 'Solidity',
      location: '🇺🇸 Public',
      type: 'Repository',
      description: 'Decentralized application built on Ethereum blockchain with smart contracts for secure transactions.'
    },
    {
      id: 7,
      image: Image02,
      order: 'ai-chatbot',
      date: '15/01/2024',
      customer: 'anugragupta',
      total: '678',
      status: 'Active',
      items: 'Python',
      location: '🇺🇸 Public',
      type: 'Repository',
      description: 'Intelligent chatbot powered by natural language processing and machine learning algorithms.'
    },
    {
      id: 8,
      image: Image03,
      order: 'game-engine',
      date: '14/01/2024',
      customer: 'anugragupta',
      total: '912',
      status: 'Active',
      items: 'C++',
      location: '🇺🇸 Public',
      type: 'Repository',
      description: 'High-performance 2D/3D game engine with physics simulation, rendering pipeline, and cross-platform support.'
    },
    {
      id: 9,
      image: Image01,
      order: 'devops-automation',
      date: '13/01/2024',
      customer: 'anugragupta',
      total: '445',
      status: 'Active',
      items: 'YAML',
      location: '🇺🇸 Public',
      type: 'Repository',
      description: 'Automated DevOps pipeline with CI/CD, infrastructure as code, monitoring, and deployment strategies.'
    }
  ]

  // Function to get a random icon for repositories
  const getRandomIcon = (id: number) => {
    const icons = [Image01, Image02, Image03]
    return icons[id % icons.length]
  }

  // Function to format stars count
  const formatStars = (stars: number) => {
    if (stars >= 1000) {
      const formatted = (stars / 1000).toFixed(1)
      // Remove .0 suffix for whole numbers
      return formatted.endsWith('.0') ? formatted.slice(0, -2) + 'k' : formatted + 'k'
    }
    return stars.toString()
  }

  // Function to format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    })
  }

  // Function to get visibility with flag
  const getVisibilityWithFlag = (isPrivate: boolean) => {
    return isPrivate ? '🔒 Private' : '🇺🇸 Public'
  }

  // Function to get status
  const getStatus = (archived: boolean, disabled: boolean) => {
    if (archived) return 'Archived'
    if (disabled) return 'Disabled'
    return 'Active'
  }

  useEffect(() => {
    const fetchRepos = async () => {
      if (status === 'loading') return
      
      if (!session) {
        setRepos(defaultRepos)
        setLoading(false)
        return
      }

      try {
        setLoading(true)
        const response = await fetch('/api/github/repos')
        
        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || 'Failed to fetch repositories')
        }

        const data = await response.json()
        const githubRepos = data.repos || []

        // Transform GitHub data to orders table format
        const transformedRepos = githubRepos.map((repo: GitHubRepo, index: number) => ({
          id: repo.id,
          image: getRandomIcon(index),
          order: repo.name,
          date: formatDate(repo.createdAt),
          customer: repo.owner,
          total: formatStars(repo.stars),
          status: getStatus(repo.archived, repo.disabled),
          items: repo.language || 'Unknown',
          location: getVisibilityWithFlag(repo.visibility === 'Private'),
          type: 'Repository',
          description: repo.description || 'No description available'
        }))

        setRepos(transformedRepos)
        setError(null)
      } catch (err) {
        console.error('Error fetching repositories:', err)
        setError(err instanceof Error ? err.message : 'Failed to fetch repositories')
        setRepos(defaultRepos) // Fallback to dummy data
      } finally {
        setLoading(false)
      }
    }

    fetchRepos()
  }, [session, status])

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-8 w-full max-w-[96rem] mx-auto">
      {/* Page header */}
      <div className="sm:flex sm:justify-between sm:items-center mb-8">

        {/* Left: Title */}
        <div className="mb-4 sm:mb-0">
          <h1 className="text-2xl md:text-3xl text-gray-800 dark:text-gray-100 font-bold">Repositories</h1>
          {session?.user && (
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Connected as @{session.user.username || session.user.name}
            </p>
          )}
        </div>

        {/* Right: Actions */}
        <div className="grid grid-flow-col sm:auto-cols-max justify-start sm:justify-end gap-2">

          {/* Delete button */}
          <DeleteButton />

          {/* Dropdown */}
          <DateSelect />

          {/* Filter button */}
          <FilterButton align="right" />

          {/* Add repository button */}
          <button className="btn bg-gray-900 text-gray-100 hover:bg-gray-800 dark:bg-gray-100 dark:text-gray-800 dark:hover:bg-white">
            <svg className="fill-current shrink-0 xs:hidden" width="16" height="16" viewBox="0 0 16 16">
              <path d="M15 7H9V1c0-.6-.4-1-1-1S7 .4 7 1v6H1c-.6 0-1 .4-1 1s.4 1 1 1h6v6c0 .6.4 1 1 1s1-.4 1-1V9h6c.6 0 1-.4 1-1s-.4-1-1-1z" />
            </svg>
            <span className="max-xs:sr-only">Add Repository</span>
          </button>

        </div>

      </div>

      {/* Loading state */}
      {loading && (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-500"></div>
        </div>
      )}

      {/* Error state */}
      {error && !loading && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6 mb-8">
          <div className="flex items-center">
            <svg className="w-5 h-5 text-red-400 mr-3" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            <div>
              <h3 className="text-sm font-medium text-red-800 dark:text-red-200">Error loading repositories</h3>
              <p className="text-sm text-red-700 dark:text-red-300 mt-1">{error}</p>
              <p className="text-xs text-red-600 dark:text-red-400 mt-1">Showing sample data instead.</p>
            </div>
          </div>
        </div>
      )}

      {/* Table */}
      {!loading && <ReposTable repos={repos} />}

      {/* Pagination */}
      {!loading && (
        <div className="mt-8">
          <PaginationClassic totalItems={repos.length} />
        </div>
      )}
    </div>
  )
}

export default ReposContent
