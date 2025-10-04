'use client'

interface Assignment {
  id: string
  status: string
  aiAnalysis: any
}

interface AssignmentStatsProps {
  assignments: Assignment[]
}

export default function AssignmentStats({ assignments }: AssignmentStatsProps) {
  const stats = {
    total: assignments.length,
    active: assignments.filter(a => a.status === 'ACTIVE').length,
    warning: assignments.filter(a => a.status === 'WARNING').length,
    alert: assignments.filter(a => a.status === 'ALERT').length,
    autoUnassigned: assignments.filter(a => a.status === 'AUTO_UNASSIGNED').length,
    withAI: assignments.filter(a => a.aiAnalysis).length,
    blocked: assignments.filter(a => a.aiAnalysis?.isBlocked).length
  }

  const workTypes = assignments
    .filter(a => a.aiAnalysis?.workType)
    .reduce((acc, a) => {
      const type = a.aiAnalysis.workType
      acc[type] = (acc[type] || 0) + 1
      return acc
    }, {} as Record<string, number>)

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Total Assignments */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/20 rounded-lg flex items-center justify-center">
              <svg className="w-4 h-4 text-blue-600 dark:text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          <div className="ml-4">
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Assignments</p>
            <p className="text-2xl font-semibold text-gray-900 dark:text-gray-100">{stats.total}</p>
          </div>
        </div>
      </div>

      {/* Active Assignments */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <div className="w-8 h-8 bg-green-100 dark:bg-green-900/20 rounded-lg flex items-center justify-center">
              <svg className="w-4 h-4 text-green-600 dark:text-green-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </div>
          </div>
          <div className="ml-4">
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Active</p>
            <p className="text-2xl font-semibold text-green-600 dark:text-green-400">{stats.active}</p>
          </div>
        </div>
      </div>

      {/* AI Analysis Coverage */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <div className="w-8 h-8 bg-purple-100 dark:bg-purple-900/20 rounded-lg flex items-center justify-center">
              <svg className="w-4 h-4 text-purple-600 dark:text-purple-400" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
            </div>
          </div>
          <div className="ml-4">
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">AI Analysis</p>
            <p className="text-2xl font-semibold text-purple-600 dark:text-purple-400">{stats.withAI}</p>
          </div>
        </div>
      </div>

      {/* Blocked Issues */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <div className="w-8 h-8 bg-red-100 dark:bg-red-900/20 rounded-lg flex items-center justify-center">
              <svg className="w-4 h-4 text-red-600 dark:text-red-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
          </div>
          <div className="ml-4">
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Blocked</p>
            <p className="text-2xl font-semibold text-red-600 dark:text-red-400">{stats.blocked}</p>
          </div>
        </div>
      </div>
    </div>
  )
}
