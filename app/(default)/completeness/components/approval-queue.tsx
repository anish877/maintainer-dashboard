'use client'

import { useState, useEffect } from 'react'

interface PendingComment {
  id: string
  issueNumber: number
  issueTitle: string
  issueUrl: string
  issueAuthor: string
  qualityScore: number
  missingElements: string[]
  generatedComment: string
  finalComment?: string
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'POSTED' | 'FAILED'
  templateName: string
  templateId: string
  repositoryName: string
  createdAt: string
  approvedBy?: string
  approvedAt?: string
  rejectedBy?: string
  rejectedAt?: string
  rejectionReason?: string
  githubCommentId?: number
  postedAt?: string
}

interface ApprovalQueueProps {
  repository: string
}

export function ApprovalQueue({ repository }: ApprovalQueueProps) {
  const [pendingComments, setPendingComments] = useState<PendingComment[]>([])
  const [selectedComment, setSelectedComment] = useState<PendingComment | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending')

  useEffect(() => {
    if (repository) {
      fetchPendingComments()
    }
  }, [repository, filter])

  const fetchPendingComments = async () => {
    setIsLoading(true)
    try {
      const statusParam = filter === 'all' ? '' : `&status=${filter.toUpperCase()}`
      const response = await fetch(`/api/completeness/approve-comment?repositoryId=${repository}${statusParam}`)
      const data = await response.json()
      setPendingComments(data.comments || [])
    } catch (error) {
      console.error('Failed to fetch pending comments:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleApproval = async (commentId: string, approved: boolean, editedComment?: string, rejectionReason?: string) => {
    try {
      const response = await fetch('/api/completeness/approve-comment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          commentId,
          approved,
          editedComment,
          rejectionReason
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to process approval')
      }

      // Update local state
      setPendingComments(prev => prev.filter(c => c.id !== commentId))
      setSelectedComment(null)

      // Refresh the list
      await fetchPendingComments()

    } catch (error) {
      console.error('Failed to process approval:', error)
      alert(`Failed to process approval: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING': return 'text-yellow-600 dark:text-yellow-400 bg-yellow-100 dark:bg-yellow-900/20'
      case 'APPROVED': return 'text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/20'
      case 'POSTED': return 'text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/20'
      case 'REJECTED': return 'text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/20'
      case 'FAILED': return 'text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-900/20'
      default: return 'text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-900/20'
    }
  }

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600 dark:text-green-400'
    if (score >= 60) return 'text-yellow-600 dark:text-yellow-400'
    if (score >= 40) return 'text-orange-600 dark:text-orange-400'
    return 'text-red-600 dark:text-red-400'
  }

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-8">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-500"></div>
          <span className="ml-3 text-gray-600 dark:text-gray-400">Loading approval queue...</span>
        </div>
      </div>
    )
  }

  const filteredComments = pendingComments.filter(comment => {
    if (filter === 'all') return true
    return comment.status === filter.toUpperCase()
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
              Approval Queue
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Review and approve automated comments for incomplete issues
            </p>
          </div>
          <div className="flex items-center gap-4">
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value as any)}
              className="form-input"
            >
              <option value="pending">Pending ({pendingComments.filter(c => c.status === 'PENDING').length})</option>
              <option value="approved">Approved ({pendingComments.filter(c => c.status === 'APPROVED').length})</option>
              <option value="rejected">Rejected ({pendingComments.filter(c => c.status === 'REJECTED').length})</option>
              <option value="all">All ({pendingComments.length})</option>
            </select>
          </div>
        </div>
      </div>

      {/* Comments List */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
        {filteredComments.length === 0 ? (
          <div className="p-8 text-center">
            <div className="w-16 h-16 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
              No comments found
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              {filter === 'pending' 
                ? 'No pending comments require approval at this time.'
                : 'No comments match the current filter criteria.'
              }
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {filteredComments.map((comment) => (
              <PendingCommentCard
                key={comment.id}
                comment={comment}
                onSelect={() => setSelectedComment(comment)}
                isSelected={selectedComment?.id === comment.id}
                getStatusColor={getStatusColor}
                getScoreColor={getScoreColor}
              />
            ))}
          </div>
        )}
      </div>

      {/* Comment Preview Modal */}
      {selectedComment && (
        <CommentPreviewModal
          comment={selectedComment}
          onClose={() => setSelectedComment(null)}
          onApprove={(editedComment) => handleApproval(selectedComment.id, true, editedComment)}
          onReject={(reason) => handleApproval(selectedComment.id, false, undefined, reason)}
          getStatusColor={getStatusColor}
        />
      )}
    </div>
  )
}

function PendingCommentCard({ 
  comment, 
  onSelect, 
  isSelected,
  getStatusColor,
  getScoreColor
}: { 
  comment: PendingComment
  onSelect: () => void
  isSelected: boolean
  getStatusColor: (status: string) => string
  getScoreColor: (score: number) => string
}) {
  return (
    <div 
      className={`p-6 cursor-pointer transition-colors ${
        isSelected 
          ? 'bg-violet-50 dark:bg-violet-900/10 border-l-4 border-violet-500' 
          : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'
      }`}
      onClick={onSelect}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <a
              href={comment.issueUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-lg font-semibold text-violet-600 dark:text-violet-400 hover:underline"
              onClick={(e) => e.stopPropagation()}
            >
              #{comment.issueNumber}: {comment.issueTitle}
            </a>
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(comment.status)}`}>
              {comment.status.toLowerCase()}
            </span>
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
              comment.qualityScore >= 60 
                ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400'
                : 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
            }`}>
              Score: {comment.qualityScore}
            </span>
          </div>
          
          <div className="text-sm text-gray-600 dark:text-gray-400 mb-3">
            by {comment.issueAuthor} • {new Date(comment.createdAt).toLocaleDateString()}
          </div>

          <div className="flex flex-wrap gap-2 mb-3">
            {comment.missingElements.map((element, index) => (
              <span key={index} className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400">
                ❌ {element}
              </span>
            ))}
          </div>

          <div className="text-sm text-gray-600 dark:text-gray-400">
            Template: <span className="font-medium">{comment.templateName}</span>
          </div>
        </div>

        <div className="ml-4">
          <button className="btn bg-violet-500 text-white hover:bg-violet-600">
            Review
          </button>
        </div>
      </div>
    </div>
  )
}

function CommentPreviewModal({ 
  comment, 
  onClose, 
  onApprove, 
  onReject,
  getStatusColor
}: {
  comment: PendingComment
  onClose: () => void
  onApprove: (editedComment?: string) => void
  onReject: (reason: string) => void
  getStatusColor: (status: string) => string
}) {
  const [editedComment, setEditedComment] = useState(comment.finalComment || comment.generatedComment)
  const [rejectionReason, setRejectionReason] = useState('')
  const [showRejectForm, setShowRejectForm] = useState(false)

  const handleApprove = () => {
    onApprove(editedComment)
  }

  const handleReject = () => {
    if (rejectionReason.trim()) {
      onReject(rejectionReason.trim())
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Review Comment
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              #{comment.issueNumber}: {comment.issueTitle}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Issue Info */}
            <div>
              <h4 className="text-md font-semibold text-gray-900 dark:text-gray-100 mb-4">
                Issue Information
              </h4>
              <div className="space-y-3">
                <div>
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Author:</span>
                  <span className="ml-2 text-sm text-gray-900 dark:text-gray-100">{comment.issueAuthor}</span>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Quality Score:</span>
                  <span className="ml-2 text-sm text-gray-900 dark:text-gray-100">{comment.qualityScore}</span>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Template:</span>
                  <span className="ml-2 text-sm text-gray-900 dark:text-gray-100">{comment.templateName}</span>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Created:</span>
                  <span className="ml-2 text-sm text-gray-900 dark:text-gray-100">
                    {new Date(comment.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </div>

              {/* Missing Elements */}
              <div className="mt-4">
                <h5 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
                  Missing Elements:
                </h5>
                <div className="flex flex-wrap gap-2">
                  {comment.missingElements.map((element, index) => (
                    <span key={index} className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400">
                      ❌ {element}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Comment Preview */}
            <div>
              <h4 className="text-md font-semibold text-gray-900 dark:text-gray-100 mb-4">
                Generated Comment
              </h4>
              <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 max-h-64 overflow-y-auto">
                <pre className="whitespace-pre-wrap text-sm text-gray-700 dark:text-gray-300 font-mono">
                  {editedComment}
                </pre>
              </div>
            </div>
          </div>

          {/* Comment Editor */}
          <div className="mt-6">
            <h4 className="text-md font-semibold text-gray-900 dark:text-gray-100 mb-4">
              Edit Comment (Optional)
            </h4>
            <textarea
              value={editedComment}
              onChange={(e) => setEditedComment(e.target.value)}
              className="form-input w-full h-32 resize-none"
              placeholder="Edit the generated comment if needed..."
            />
          </div>

          {/* Rejection Form */}
          {showRejectForm && (
            <div className="mt-6 p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
              <h4 className="text-md font-semibold text-red-900 dark:text-red-100 mb-2">
                Rejection Reason
              </h4>
              <textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                className="form-input w-full h-20 resize-none"
                placeholder="Please provide a reason for rejecting this comment..."
              />
            </div>
          )}
        </div>

        {/* Modal Actions */}
        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-between">
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="btn bg-gray-500 text-white hover:bg-gray-600"
            >
              Cancel
            </button>
            <button
              onClick={() => setShowRejectForm(!showRejectForm)}
              className={`btn ${showRejectForm ? 'bg-gray-500 text-white hover:bg-gray-600' : 'bg-red-500 text-white hover:bg-red-600'}`}
            >
              {showRejectForm ? 'Cancel Reject' : 'Reject Comment'}
            </button>
          </div>

          <div className="flex gap-3">
            {showRejectForm ? (
              <button
                onClick={handleReject}
                disabled={!rejectionReason.trim()}
                className="btn bg-red-500 text-white hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Confirm Rejection
              </button>
            ) : (
              <button
                onClick={handleApprove}
                className="btn bg-green-500 text-white hover:bg-green-600"
              >
                ✓ Approve & Post Comment
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
