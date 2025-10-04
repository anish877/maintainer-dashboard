'use client'

import { useState } from 'react'

interface RepoMaintainerControlsProps {
  repoName: string
  onRefresh: () => void
}

export default function RepoMaintainerControls({ repoName, onRefresh }: RepoMaintainerControlsProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleBulkAction = async (action: string) => {
    setLoading(true)
    try {
      console.log(`🔧 Bulk ${action} for repository: ${repoName}`)
      
      // Simulate bulk action
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      console.log(`✅ Bulk ${action} completed for ${repoName}`)
      onRefresh()
    } catch (error) {
      console.error(`❌ Error in bulk ${action}:`, error)
    } finally {
      setLoading(false)
    }
  }

  const handleRepositorySettings = async () => {
    setLoading(true)
    try {
      console.log(`⚙️ Opening repository settings for: ${repoName}`)
      
      // Simulate opening settings
      await new Promise(resolve => setTimeout(resolve, 500))
      
      console.log(`✅ Repository settings opened for ${repoName}`)
    } catch (error) {
      console.error(`❌ Error opening settings:`, error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-white dark:bg-gray-800 shadow-sm rounded-xl">
      <div className="px-5 pt-5">
        <header className="flex justify-between items-start mb-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-1">
              Maintainer Controls
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Manage assignments and settings for {repoName}
            </p>
          </div>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
          >
            {isExpanded ? 'Collapse' : 'Expand'} Controls
          </button>
        </header>
      </div>

      {isExpanded && (
        <div className="px-5 pb-5">
          {/* Quick Actions */}
          <div className="mb-6">
            <h3 className="text-sm font-medium text-gray-800 dark:text-gray-100 mb-3">Quick Actions</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <button
                onClick={() => handleBulkAction('send_reminders')}
                disabled={loading}
                className="flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-blue-700 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/20 hover:bg-blue-200 dark:hover:bg-blue-900/30 rounded-lg transition-colors disabled:opacity-50"
              >
                📧 Send All Reminders
              </button>
              
              <button
                onClick={() => handleBulkAction('mark_active')}
                disabled={loading}
                className="flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-green-700 dark:text-green-400 bg-green-100 dark:bg-green-900/20 hover:bg-green-200 dark:hover:bg-green-900/30 rounded-lg transition-colors disabled:opacity-50"
              >
                ✅ Mark All Active
              </button>
              
              <button
                onClick={() => handleBulkAction('extend_deadlines')}
                disabled={loading}
                className="flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-yellow-700 dark:text-yellow-400 bg-yellow-100 dark:bg-yellow-900/20 hover:bg-yellow-200 dark:hover:bg-yellow-900/30 rounded-lg transition-colors disabled:opacity-50"
              >
                ⏰ Extend All Deadlines
              </button>
              
              <button
                onClick={() => handleBulkAction('auto_unassign')}
                disabled={loading}
                className="flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-red-700 dark:text-red-400 bg-red-100 dark:bg-red-900/20 hover:bg-red-200 dark:hover:bg-red-900/30 rounded-lg transition-colors disabled:opacity-50"
              >
                🚨 Auto-Unassign Inactive
              </button>
            </div>
          </div>

          {/* Repository Settings */}
          <div className="mb-6">
            <h3 className="text-sm font-medium text-gray-800 dark:text-gray-100 mb-3">Repository Settings</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                onClick={handleRepositorySettings}
                disabled={loading}
                className="flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors disabled:opacity-50"
              >
                ⚙️ Configure Thresholds
              </button>
              
              <button
                onClick={() => handleBulkAction('whitelist_users')}
                disabled={loading}
                className="flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-purple-700 dark:text-purple-400 bg-purple-100 dark:bg-purple-900/20 hover:bg-purple-200 dark:hover:bg-purple-900/30 rounded-lg transition-colors disabled:opacity-50"
              >
                👥 Manage Whitelist
              </button>
            </div>
          </div>

          {/* AI Analysis Controls */}
          <div className="mb-6">
            <h3 className="text-sm font-medium text-gray-800 dark:text-gray-100 mb-3">AI Analysis</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                onClick={() => handleBulkAction('analyze_comments')}
                disabled={loading}
                className="flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-indigo-700 dark:text-indigo-400 bg-indigo-100 dark:bg-indigo-900/20 hover:bg-indigo-200 dark:hover:bg-indigo-900/30 rounded-lg transition-colors disabled:opacity-50"
              >
                🧠 Analyze All Comments
              </button>
              
              <button
                onClick={() => handleBulkAction('detect_forks')}
                disabled={loading}
                className="flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-cyan-700 dark:text-cyan-400 bg-cyan-100 dark:bg-cyan-900/20 hover:bg-cyan-200 dark:hover:bg-cyan-900/30 rounded-lg transition-colors disabled:opacity-50"
              >
                🔍 Detect Fork Activity
              </button>
            </div>
          </div>

          {/* Status Summary */}
          <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
            <h3 className="text-sm font-medium text-gray-800 dark:text-gray-100 mb-2">Repository Status</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
              <div className="text-center">
                <div className="text-lg font-bold text-green-600 dark:text-green-400">3</div>
                <div className="text-gray-500 dark:text-gray-400">Active Issues</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-yellow-600 dark:text-yellow-400">2</div>
                <div className="text-gray-500 dark:text-gray-400">Warnings</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-orange-600 dark:text-orange-400">1</div>
                <div className="text-gray-500 dark:text-gray-400">Alerts</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-red-600 dark:text-red-400">0</div>
                <div className="text-gray-500 dark:text-gray-400">Auto-Unassigned</div>
              </div>
            </div>
          </div>

          {loading && (
            <div className="mt-4 flex items-center justify-center">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-purple-600 mr-2"></div>
              <span className="text-sm text-gray-500 dark:text-gray-400">Processing...</span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
