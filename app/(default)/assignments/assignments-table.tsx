'use client'

import { useState } from 'react'
import AssignmentRow from './assignment-row'
import { useItemSelection } from '@/components/utils/use-item-selection'

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

interface AssignmentsTableProps {
  assignments: Assignment[]
  onAssignmentAction: (action: string, assignmentId: string, data?: any) => void
}

export default function AssignmentsTable({ assignments, onAssignmentAction }: AssignmentsTableProps) {
  const {
    selectedItems,
    isAllSelected,
    handleCheckboxChange,
    handleSelectAllChange,
  } = useItemSelection(assignments)

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return 'bg-green-500/20 text-green-700 dark:text-green-400'
      case 'WARNING':
        return 'bg-yellow-500/20 text-yellow-700 dark:text-yellow-400'
      case 'ALERT':
        return 'bg-orange-500/20 text-orange-700 dark:text-orange-400'
      case 'AUTO_UNASSIGNED':
        return 'bg-red-500/20 text-red-700 dark:text-red-400'
      case 'UNKNOWN':
        return 'bg-gray-500/20 text-gray-700 dark:text-gray-400'
      case 'MANUAL_OVERRIDE':
        return 'bg-blue-500/20 text-blue-700 dark:text-blue-400'
      default:
        return 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
    }
  }

  const getWorkTypeColor = (workType: string) => {
    switch (workType) {
      case 'coding':
        return 'bg-green-500'
      case 'research':
        return 'bg-blue-500'
      case 'planning':
        return 'bg-yellow-500'
      case 'testing':
        return 'bg-purple-500'
      case 'documentation':
        return 'bg-indigo-500'
      case 'blocked':
        return 'bg-red-500'
      case 'waiting':
        return 'bg-orange-500'
      default:
        return 'bg-gray-400'
    }
  }

  return (
    <div className="bg-white dark:bg-gray-800 shadow-sm rounded-xl relative">
      <header className="px-5 py-4 border-b border-gray-100 dark:border-gray-700/60">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-gray-800 dark:text-gray-100">
            Issue Assignments <span className="text-gray-400 dark:text-gray-500 font-medium">{assignments.length}</span>
          </h2>
          {selectedItems.length > 0 && (
            <div className="flex items-center space-x-2">
              <button
                onClick={() => onAssignmentAction('mark_active', selectedItems[0].toString())}
                className="btn-sm bg-green-500 hover:bg-green-600 text-white"
              >
                Mark Active ({selectedItems.length})
              </button>
              <button
                onClick={() => onAssignmentAction('extend_deadline', selectedItems[0].toString(), { days: 30 })}
                className="btn-sm bg-blue-500 hover:bg-blue-600 text-white"
              >
                Extend Deadline
              </button>
            </div>
          )}
        </div>
      </header>

      <div>
        {/* Table */}
        <div className="overflow-x-auto">
          <table className="table-auto w-full dark:text-gray-300 divide-y divide-gray-100 dark:divide-gray-700/60">
            {/* Table header */}
            <thead className="text-xs uppercase text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-900/20 border-t border-gray-100 dark:border-gray-700/60">
              <tr>
                <th className="px-2 first:pl-5 last:pr-5 py-3 whitespace-nowrap w-px">
                  <div className="flex items-center">
                    <label className="inline-flex">
                      <span className="sr-only">Select all</span>
                      <input 
                        className="form-checkbox" 
                        type="checkbox" 
                        onChange={handleSelectAllChange} 
                        checked={isAllSelected} 
                      />
                    </label>
                  </div>
                </th>
                <th className="px-2 first:pl-5 last:pr-5 py-3 whitespace-nowrap">
                  <div className="font-semibold text-left">Repository</div>
                </th>
                <th className="px-2 first:pl-5 last:pr-5 py-3 whitespace-nowrap">
                  <div className="font-semibold text-left">Issue</div>
                </th>
                <th className="px-2 first:pl-5 last:pr-5 py-3 whitespace-nowrap">
                  <div className="font-semibold text-left">Assignee</div>
                </th>
                <th className="px-2 first:pl-5 last:pr-5 py-3 whitespace-nowrap">
                  <div className="font-semibold text-left">Status</div>
                </th>
                <th className="px-2 first:pl-5 last:pr-5 py-3 whitespace-nowrap">
                  <div className="font-semibold text-left">Last Activity</div>
                </th>
                <th className="px-2 first:pl-5 last:pr-5 py-3 whitespace-nowrap">
                  <div className="font-semibold text-left">AI Analysis</div>
                </th>
                <th className="px-2 first:pl-5 last:pr-5 py-3 whitespace-nowrap">
                  <div className="font-semibold text-left">Actions</div>
                </th>
              </tr>
            </thead>
            {/* Table body */}
            <tbody>
              {assignments.map(assignment => (
                <AssignmentRow
                  key={assignment.id}
                  assignment={assignment}
                  onCheckboxChange={handleCheckboxChange}
                  isSelected={selectedItems.includes(assignment.id)}
                  onAssignmentAction={onAssignmentAction}
                  getStatusColor={getStatusColor}
                  getWorkTypeColor={getWorkTypeColor}
                />
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
