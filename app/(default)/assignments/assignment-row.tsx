'use client'

import { useState } from 'react'
import Image from 'next/image'

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

interface AssignmentRowProps {
  assignment: Assignment
  onCheckboxChange: (id: string, checked: boolean) => void
  isSelected: boolean
  onAssignmentAction: (action: string, assignmentId: string, data?: any) => void
  getStatusColor: (status: string) => string
  getWorkTypeColor: (workType: string) => string
}

export default function AssignmentRow({ 
  assignment, 
  onCheckboxChange, 
  isSelected, 
  onAssignmentAction,
  getStatusColor,
  getWorkTypeColor
}: AssignmentRowProps) {
  const [detailsOpen, setDetailsOpen] = useState(false)

  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onCheckboxChange(assignment.id, e.target.checked)
  }

  const handleAutomatedAction = (action: string) => {
    onAssignmentAction(action, assignment.id)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString()
  }

  const formatDaysSince = (dateString: string) => {
    const days = Math.floor((Date.now() - new Date(dateString).getTime()) / (1000 * 60 * 60 * 24))
    return `${days} days ago`
  }

  const getAIAnalysisDisplay = () => {
    if (!assignment.aiAnalysis) {
      return <span className="text-gray-400 text-sm">No analysis</span>
    }

    const { workType, confidence, isBlocked } = assignment.aiAnalysis
    
    return (
      <div className="flex items-center space-x-2">
        <div className={`w-2 h-2 rounded-full ${getWorkTypeColor(workType)}`} />
        <span className="text-sm">
          {workType} ({Math.round(confidence * 100)}%)
        </span>
        {isBlocked && (
          <span className="text-xs bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400 px-2 py-1 rounded">
            Blocked
          </span>
        )}
      </div>
    )
  }

  return (
    <tbody className="text-sm">
      {/* Row */}
      <tr>
        <td className="px-2 first:pl-5 last:pr-5 py-3 whitespace-nowrap w-px">
          <div className="flex items-center">
            <label className="inline-flex">
              <span className="sr-only">Select</span>
              <input 
                className="form-checkbox" 
                type="checkbox" 
                onChange={handleCheckboxChange} 
                checked={isSelected} 
              />
            </label>
          </div>
        </td>
        <td className="px-2 first:pl-5 last:pr-5 py-3 whitespace-nowrap">
          <div className="font-medium text-gray-800 dark:text-gray-100">
            {assignment.repositoryName}
          </div>
        </td>
        <td className="px-2 first:pl-5 last:pr-5 py-3 whitespace-nowrap">
          <a 
            href={`https://github.com/${assignment.repositoryName}/issues/${assignment.issueNumber}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:underline font-medium"
          >
            #{assignment.issueNumber}
          </a>
        </td>
        <td className="px-2 first:pl-5 last:pr-5 py-3 whitespace-nowrap">
          <div className="flex items-center">
            <div className="w-6 h-6 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center mr-2">
              <span className="text-xs font-medium text-gray-600 dark:text-gray-300">
                {assignment.assigneeLogin.charAt(0).toUpperCase()}
              </span>
            </div>
            <span className="font-medium text-gray-800 dark:text-gray-100">
              {assignment.assigneeLogin}
            </span>
          </div>
        </td>
        <td className="px-2 first:pl-5 last:pr-5 py-3 whitespace-nowrap">
          <div className={`inline-flex font-medium rounded-full text-center px-2.5 py-0.5 ${getStatusColor(assignment.status)}`}>
            {assignment.status.replace('_', ' ')}
          </div>
        </td>
        <td className="px-2 first:pl-5 last:pr-5 py-3 whitespace-nowrap">
          <div className="text-sm text-gray-600 dark:text-gray-400">
            {formatDaysSince(assignment.lastActivityAt)}
          </div>
        </td>
        <td className="px-2 first:pl-5 last:pr-5 py-3 whitespace-nowrap">
          {getAIAnalysisDisplay()}
        </td>
        <td className="px-2 first:pl-5 last:pr-5 py-3 whitespace-nowrap">
          <div className="flex items-center space-x-2">
            <button
              onClick={() => onAssignmentAction('mark_active', assignment.id)}
              className="text-green-600 hover:text-green-700 text-sm"
            >
              Mark Active
            </button>
            <button
              onClick={() => onAssignmentAction('extend_deadline', assignment.id, { days: 30 })}
              className="text-blue-600 hover:text-blue-700 text-sm"
            >
              Extend
            </button>
            <button
              onClick={() => handleAutomatedAction('remove_from_issue')}
              className="text-red-600 hover:text-red-700 text-sm"
            >
              Remove
            </button>
            <button
              onClick={() => handleAutomatedAction('send_reminder')}
              className="text-orange-600 hover:text-orange-700 text-sm"
            >
              Remind
            </button>
            <button
              className={`text-gray-400 hover:text-gray-500 dark:text-gray-500 dark:hover:text-gray-400 ${detailsOpen && 'rotate-180'}`}
              aria-expanded={detailsOpen}
              onClick={() => setDetailsOpen(!detailsOpen)}
              aria-controls={`details-${assignment.id}`}
            >
              <span className="sr-only">Details</span>
              <svg className="w-4 h-4 fill-current" viewBox="0 0 16 16">
                <path d="M16 20l-5.4-5.4 1.4-1.4 4 4 4-4 1.4 1.4z" />
              </svg>
            </button>
          </div>
        </td>
      </tr>
      {/* Expandable details row */}
      <tr id={`details-${assignment.id}`} role="region" className={`${!detailsOpen && 'hidden'}`}>
        <td colSpan={8} className="px-2 first:pl-5 last:pr-5 py-3">
          <div className="bg-gray-50 dark:bg-gray-950/[0.15] dark:text-gray-400 p-4 -mt-3 rounded-lg">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Assignment Details */}
              <div>
                <h4 className="font-medium text-gray-800 dark:text-gray-200 mb-2">Assignment Details</h4>
                <div className="space-y-1 text-sm">
                  <div><span className="font-medium">Assigned:</span> {formatDate(assignment.assignedAt)}</div>
                  <div><span className="font-medium">Last Activity:</span> {formatDate(assignment.lastActivityAt)}</div>
                  <div><span className="font-medium">Activities:</span> {assignment.activities.length}</div>
                  <div><span className="font-medium">Notifications:</span> {assignment.notifications.length}</div>
                </div>
              </div>
              
              {/* AI Analysis Details */}
              <div>
                <h4 className="font-medium text-gray-800 dark:text-gray-200 mb-2">AI Analysis</h4>
                {assignment.aiAnalysis ? (
                  <div className="space-y-1 text-sm">
                    <div><span className="font-medium">Work Type:</span> {assignment.aiAnalysis.workType}</div>
                    <div><span className="font-medium">Confidence:</span> {Math.round(assignment.aiAnalysis.confidence * 100)}%</div>
                    <div><span className="font-medium">Blocked:</span> {assignment.aiAnalysis.isBlocked ? 'Yes' : 'No'}</div>
                    {assignment.aiAnalysis.nextSteps && (
                      <div><span className="font-medium">Next Steps:</span> {assignment.aiAnalysis.nextSteps}</div>
                    )}
                  </div>
                ) : (
                  <div className="text-sm text-gray-500">No AI analysis available</div>
                )}
              </div>
            </div>
          </div>
        </td>
      </tr>
    </tbody>
  )
}
