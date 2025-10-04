'use client'

interface AssignmentFiltersProps {
  filters: {
    status: string
    repositoryId: string
    assigneeId: string
  }
  onFiltersChange: (filters: any) => void
}

export default function AssignmentFilters({ filters, onFiltersChange }: AssignmentFiltersProps) {
  const statusOptions = [
    { value: '', label: 'All Status' },
    { value: 'ACTIVE', label: 'Active' },
    { value: 'WARNING', label: 'Warning' },
    { value: 'ALERT', label: 'Alert' },
    { value: 'AUTO_UNASSIGNED', label: 'Auto Unassigned' },
    { value: 'UNKNOWN', label: 'Unknown' },
    { value: 'MANUAL_OVERRIDE', label: 'Manual Override' }
  ]

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center space-x-2">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Status:</label>
          <select
            value={filters.status}
            onChange={(e) => onFiltersChange({ ...filters, status: e.target.value })}
            className="form-select text-sm border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300"
          >
            {statusOptions.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center space-x-2">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Repository:</label>
          <input
            type="text"
            placeholder="Filter by repository..."
            value={filters.repositoryId}
            onChange={(e) => onFiltersChange({ ...filters, repositoryId: e.target.value })}
            className="form-input text-sm border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300"
          />
        </div>

        <div className="flex items-center space-x-2">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Assignee:</label>
          <input
            type="text"
            placeholder="Filter by assignee..."
            value={filters.assigneeId}
            onChange={(e) => onFiltersChange({ ...filters, assigneeId: e.target.value })}
            className="form-input text-sm border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300"
          />
        </div>

        <button
          onClick={() => onFiltersChange({ status: '', repositoryId: '', assigneeId: '' })}
          className="btn-sm bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300"
        >
          Clear Filters
        </button>
      </div>
    </div>
  )
}
