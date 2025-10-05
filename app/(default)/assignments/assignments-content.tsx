'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import AssignmentsTable from './assignments-table'
import AssignmentStats from './assignment-stats'
import AssignmentFilters from './assignment-filters'

interface Assignment {
  id: string
  repositoryName: string
  issueNumber: number
  assigneeLogin: string
  assignedAt: string
  lastActivityAt: string
  status: string
  aiAnalysis: any
  repository: {
    fullName: string
  }
  assignee: {
    username: string
    image: string
  }
  activities: any[]
  notifications: any[]
}

export default function AssignmentsContent() {
  const { data: session, status } = useSession()
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)
  const [filters, setFilters] = useState({
    status: '',
    repositoryId: '',
    assigneeId: ''
  })

  useEffect(() => {
    // Only fetch assignments when session is ready
    if (status === 'loading') return
    fetchAssignments()
  }, [filters, status])

  const fetchAssignments = async () => {
    try {
      console.log('Fetching assignments...', { 
        sessionStatus: status, 
        hasSession: !!session,
        userId: session?.user?.id 
      })
      
      setLoading(true)
      setError(null)
      
      const params = new URLSearchParams()
      if (filters.status) params.append('status', filters.status)
      if (filters.repositoryId) params.append('repositoryId', filters.repositoryId)
      if (filters.assigneeId) params.append('assigneeId', filters.assigneeId)
      
      const url = `/api/assignments?${params.toString()}`
      console.log('Making request to:', url)
      
      const response = await fetch(url)
      console.log('Response status:', response.status)
      
      if (!response.ok) {
        if (response.status === 401) {
          console.log('Authentication required')
          setError('Please sign in to view assignments')
          return
        }
        console.log('Request failed with status:', response.status)
        throw new Error(`Failed to fetch assignments: ${response.status}`)
      }
      
      const data = await response.json()
      console.log('Assignments fetched:', data.assignments?.length || 0)
      setAssignments(data.assignments || [])
    } catch (err: any) {
      console.error('Error fetching assignments:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleAssignmentAction = async (action: string, assignmentId: string, data?: any) => {
    try {
      const response = await fetch('/api/assignments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action,
          assignmentId,
          data
        })
      })

      if (!response.ok) {
        throw new Error('Failed to process action')
      }

      // Refresh assignments
      await fetchAssignments()
    } catch (err: any) {
      console.error('Error processing action:', err)
      setError(err.message)
    }
  }

  if (status === 'loading' || loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-500"></div>
      </div>
    )
  }

  if (!session) {
    return (
      <div className="px-4 sm:px-6 lg:px-8 py-8 w-full max-w-[96rem] mx-auto">
        <div className="text-center">
          <h1 className="text-2xl md:text-3xl text-gray-800 dark:text-gray-100 font-bold mb-4">
            Fork-Aware Cookie Licking Detection
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-400 mb-8">
            Please sign in with GitHub to access assignment monitoring.
          </p>
          <a 
            href="/signin"
            className="btn bg-violet-500 hover:bg-violet-600 text-white"
          >
            Sign in with GitHub
          </a>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800 dark:text-red-200">
              Error loading assignments
            </h3>
            <div className="mt-2 text-sm text-red-700 dark:text-red-300">
              {error}
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
        <div className="mb-4 sm:mb-0">
          <h1 className="text-2xl md:text-3xl text-gray-800 dark:text-gray-100 font-bold">
            Fork-Aware Cookie Licking Detection
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Monitor GitHub issue assignments and detect work in forks using AI analysis.
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="mb-8">
        <AssignmentStats assignments={assignments} />
      </div>

      {/* Filters */}
      <div className="mb-6">
        <AssignmentFilters 
          filters={filters} 
          onFiltersChange={setFilters}
        />
      </div>

      {/* Assignments Table */}
      <AssignmentsTable 
        assignments={assignments}
        onAssignmentAction={handleAssignmentAction}
      />
    </div>
  )
}
