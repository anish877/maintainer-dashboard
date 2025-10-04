'use client'

import EditMenu from '@/components/edit-menu'
import { useAnalytics } from '@/hooks/use-analytics-context'
import { useRouter } from 'next/navigation'
import { useToastNotifications } from '@/lib/toast'

export default function DashboardCard03() {
  const { stats, loading, error } = useAnalytics()
  const router = useRouter()
  const { success } = useToastNotifications()

  // Get recent repositories (last 4)
  const recentRepos = stats?.recentActivity?.slice(0, 4) || []

  const handleRepoClick = (repoName: string) => {
    window.open(`/${repoName}/dashboard`, '_blank')
    success(`Opening ${repoName} dashboard in new tab`)
  }

  const handleShowAll = () => {
    window.open('/repos', '_blank')
    success('Opening all repositories in new tab')
  }

  // Show error state if there's an error
  if (error) {
    return (
      <div className="flex flex-col col-span-full sm:col-span-6 xl:col-span-4 bg-white dark:bg-gray-800 shadow-sm rounded-xl">
        <div className="px-5 pt-5">
          <header className="flex justify-between items-start mb-2">
            <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-2">Recent Repositories</h2>
          </header>
          <div className="text-sm text-red-600 dark:text-red-400">
            Failed to load repository data
          </div>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex flex-col col-span-full sm:col-span-6 xl:col-span-4 bg-white dark:bg-gray-800 shadow-sm rounded-xl">
        <div className="px-5 pt-5">
          <header className="flex justify-between items-start mb-2">
            <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-2">Recent Repositories</h2>
          </header>
          <div className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase mb-1">Loading...</div>
          <div className="animate-pulse space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex items-center space-x-3">
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/4"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return(
    <div className="flex flex-col col-span-full sm:col-span-6 xl:col-span-4 bg-white dark:bg-gray-800 shadow-sm rounded-xl">
      <div className="px-5 pt-5">
        <header className="flex justify-between items-start mb-2">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-2">Recent Repositories</h2>
          {/* Menu button */}
          <EditMenu align="right" />
        </header>
        <div className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase mb-3">Latest Created</div>
        
        {/* Recent Repositories List */}
        <div className="space-y-2 mb-4">
          {recentRepos.length > 0 ? (
            recentRepos.map((repo: any, index: number) => (
              <div key={repo.id || index} className="flex items-center space-x-2">
                <button
                  onClick={() => handleRepoClick(repo.name)}
                  className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:underline transition-colors text-left"
                >
                  {repo.name}
                </button>
                {repo.private && (
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
                    Private
                  </span>
                )}
              </div>
            ))
          ) : (
            <div className="text-center py-4">
              <div className="text-gray-400 dark:text-gray-500 text-sm">
                No repositories found
              </div>
            </div>
          )}
        </div>

        {/* Show All Button */}
        {recentRepos.length > 0 && (
          <button
            onClick={handleShowAll}
            className="w-full text-center py-2 text-sm font-medium text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 transition-colors"
          >
            Show All Repositories →
          </button>
        )}
      </div>
    </div>
  )
}