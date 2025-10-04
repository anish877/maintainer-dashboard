'use client'

import { useState, useEffect } from 'react'

interface Template {
  id: string
  name: string
  description?: string
  category: string
  template: {
    header: string
    body: string
    footer: string
  }
  variables: Array<{
    name: string
    description: string
    type: string
    required: boolean
  }>
  styling: {
    primaryColor: string
    secondaryColor: string
    accentColor: string
    fontFamily: string
    fontSize: string
    spacing: string
  }
  conditions: {
    minQualityScore?: number
    maxQualityScore?: number
    requiredMissingElements?: string[]
  }
  isActive: boolean
  isDefault: boolean
  requiresApproval: boolean
  autoApply: boolean
  usageCount: number
  lastUsed?: string
  createdAt: string
  updatedAt: string
  createdBy: {
    id: string
    name?: string
    username: string
    image?: string
  }
}

interface TemplateManagerProps {
  repository: string
}

export function TemplateManager({ repository }: TemplateManagerProps) {
  const [templates, setTemplates] = useState<Template[]>([])
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null)

  useEffect(() => {
    if (repository) {
      fetchTemplates()
    }
  }, [repository])

  const fetchTemplates = async () => {
    setIsLoading(true)
    try {
      const response = await fetch(`/api/completeness/templates?repositoryId=${repository}`)
      const data = await response.json()
      setTemplates(data.templates || [])
    } catch (error) {
      console.error('Failed to fetch templates:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleDeleteTemplate = async (templateId: string) => {
    if (!confirm('Are you sure you want to delete this template?')) return

    try {
      const response = await fetch(`/api/completeness/templates?id=${templateId}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to delete template')
      }

      await fetchTemplates()
      setSelectedTemplate(null)
    } catch (error) {
      console.error('Failed to delete template:', error)
      alert(`Failed to delete template: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'BUG_REPORT': return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
      case 'FEATURE_REQUEST': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400'
      case 'QUESTION': return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
      case 'DOCUMENTATION': return 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400'
      case 'PERFORMANCE_ISSUE': return 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400'
      case 'SECURITY_ISSUE': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400'
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400'
    }
  }

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-8">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-500"></div>
          <span className="ml-3 text-gray-600 dark:text-gray-400">Loading templates...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
              Template Manager
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Create and manage comment templates for automated issue responses
            </p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="btn bg-gradient-to-r from-violet-500 to-purple-600 text-white hover:from-violet-600 hover:to-purple-700"
          >
            + Create Template
          </button>
        </div>
      </div>

      {/* Templates Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {templates.map((template) => (
          <TemplateCard
            key={template.id}
            template={template}
            onSelect={() => setSelectedTemplate(template)}
            onEdit={() => setEditingTemplate(template)}
            onDelete={() => handleDeleteTemplate(template.id)}
            getCategoryColor={getCategoryColor}
          />
        ))}
      </div>

      {/* Empty State */}
      {templates.length === 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-12 text-center">
          <div className="w-20 h-20 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
            No templates found
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-md mx-auto">
            Create your first template to start automating comment responses for incomplete issues.
          </p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="btn bg-gradient-to-r from-violet-500 to-purple-600 text-white hover:from-violet-600 hover:to-purple-700"
          >
            Create First Template
          </button>
        </div>
      )}

      {/* Template Detail Modal */}
      {selectedTemplate && (
        <TemplateDetailModal
          template={selectedTemplate}
          onClose={() => setSelectedTemplate(null)}
          onEdit={() => {
            setEditingTemplate(selectedTemplate)
            setSelectedTemplate(null)
          }}
          onDelete={() => {
            handleDeleteTemplate(selectedTemplate.id)
            setSelectedTemplate(null)
          }}
          getCategoryColor={getCategoryColor}
        />
      )}

      {/* Create/Edit Template Modal */}
      {(showCreateModal || editingTemplate) && (
        <CreateTemplateModal
          template={editingTemplate}
          repository={repository}
          onClose={() => {
            setShowCreateModal(false)
            setEditingTemplate(null)
          }}
          onSuccess={() => {
            fetchTemplates()
            setShowCreateModal(false)
            setEditingTemplate(null)
          }}
        />
      )}
    </div>
  )
}

function TemplateCard({ 
  template, 
  onSelect, 
  onEdit, 
  onDelete,
  getCategoryColor
}: {
  template: Template
  onSelect: () => void
  onEdit: () => void
  onDelete: () => void
  getCategoryColor: (category: string) => string
}) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
            {template.name}
          </h3>
          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getCategoryColor(template.category)}`}>
            {template.category.replace('_', ' ').toLowerCase()}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onEdit}
            className="text-gray-400 hover:text-blue-600 dark:hover:text-blue-400"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </button>
          <button
            onClick={onDelete}
            className="text-gray-400 hover:text-red-600 dark:hover:text-red-400"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>

      {template.description && (
        <p className="text-gray-600 dark:text-gray-400 text-sm mb-4 line-clamp-2">
          {template.description}
        </p>
      )}

      <div className="space-y-2 mb-4">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600 dark:text-gray-400">Usage Count:</span>
          <span className="font-medium text-gray-900 dark:text-gray-100">{template.usageCount}</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600 dark:text-gray-400">Requires Approval:</span>
          <span className={`font-medium ${template.requiresApproval ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
            {template.requiresApproval ? 'Yes' : 'No'}
          </span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600 dark:text-gray-400">Status:</span>
          <span className={`font-medium ${template.isActive ? 'text-green-600 dark:text-green-400' : 'text-gray-600 dark:text-gray-400'}`}>
            {template.isActive ? 'Active' : 'Inactive'}
          </span>
        </div>
      </div>

      <div className="flex gap-2">
        <button
          onClick={onSelect}
          className="btn bg-violet-500 text-white hover:bg-violet-600 flex-1"
        >
          View Details
        </button>
      </div>
    </div>
  )
}

function TemplateDetailModal({ 
  template, 
  onClose, 
  onEdit, 
  onDelete,
  getCategoryColor
}: {
  template: Template
  onClose: () => void
  onEdit: () => void
  onDelete: () => void
  getCategoryColor: (category: string) => string
}) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Template Details
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              {template.name}
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
            {/* Template Info */}
            <div>
              <h4 className="text-md font-semibold text-gray-900 dark:text-gray-100 mb-4">
                Template Information
              </h4>
              <div className="space-y-3">
                <div>
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Category:</span>
                  <span className={`ml-2 inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getCategoryColor(template.category)}`}>
                    {template.category.replace('_', ' ').toLowerCase()}
                  </span>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Created by:</span>
                  <span className="ml-2 text-sm text-gray-900 dark:text-gray-100">{template.createdBy.username}</span>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Usage Count:</span>
                  <span className="ml-2 text-sm text-gray-900 dark:text-gray-100">{template.usageCount}</span>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Requires Approval:</span>
                  <span className={`ml-2 text-sm font-medium ${template.requiresApproval ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
                    {template.requiresApproval ? 'Yes' : 'No'}
                  </span>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Status:</span>
                  <span className={`ml-2 text-sm font-medium ${template.isActive ? 'text-green-600 dark:text-green-400' : 'text-gray-600 dark:text-gray-400'}`}>
                    {template.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>

              {template.description && (
                <div className="mt-4">
                  <h5 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
                    Description:
                  </h5>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {template.description}
                  </p>
                </div>
              )}
            </div>

            {/* Template Preview */}
            <div>
              <h4 className="text-md font-semibold text-gray-900 dark:text-gray-100 mb-4">
                Template Preview
              </h4>
              <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 max-h-64 overflow-y-auto">
                <div className="text-sm text-gray-700 dark:text-gray-300">
                  {template.template.header && (
                    <div className="mb-2">
                      <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Header:</div>
                      <div className="whitespace-pre-wrap">{template.template.header}</div>
                    </div>
                  )}
                  {template.template.body && (
                    <div className="mb-2">
                      <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Body:</div>
                      <div className="whitespace-pre-wrap">{template.template.body}</div>
                    </div>
                  )}
                  {template.template.footer && (
                    <div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Footer:</div>
                      <div className="whitespace-pre-wrap">{template.template.footer}</div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Variables */}
          {template.variables.length > 0 && (
            <div className="mt-6">
              <h4 className="text-md font-semibold text-gray-900 dark:text-gray-100 mb-4">
                Available Variables
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {template.variables.map((variable, index) => (
                  <div key={index} className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-1">
                      <code className="text-sm font-mono text-violet-600 dark:text-violet-400">
                        {`{{${variable.name}}}`}
                      </code>
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        variable.required 
                          ? 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
                          : 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400'
                      }`}>
                        {variable.type}
                      </span>
                    </div>
                    <p className="text-xs text-gray-600 dark:text-gray-400">
                      {variable.description}
                    </p>
                  </div>
                ))}
              </div>
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
              Close
            </button>
            <button
              onClick={onDelete}
              className="btn bg-red-500 text-white hover:bg-red-600"
            >
              Delete Template
            </button>
          </div>
          <button
            onClick={onEdit}
            className="btn bg-violet-500 text-white hover:bg-violet-600"
          >
            Edit Template
          </button>
        </div>
      </div>
    </div>
  )
}

function CreateTemplateModal({ 
  template, 
  repository, 
  onClose, 
  onSuccess 
}: {
  template?: Template | null
  repository: string
  onClose: () => void
  onSuccess: () => void
}) {
  const [formData, setFormData] = useState({
    name: template?.name || '',
    description: template?.description || '',
    category: template?.category || 'BUG_REPORT',
    header: template?.template.header || '',
    body: template?.template.body || '',
    footer: template?.template.footer || '',
    requiresApproval: template?.requiresApproval ?? true,
    autoApply: template?.autoApply ?? false,
    isActive: template?.isActive ?? true
  })

  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      const url = '/api/completeness/templates'
      const method = template ? 'PUT' : 'POST'
      
      const payload = {
        ...(template && { id: template.id }),
        name: formData.name,
        description: formData.description,
        category: formData.category,
        template: {
          header: formData.header,
          body: formData.body,
          footer: formData.footer
        },
        requiresApproval: formData.requiresApproval,
        autoApply: formData.autoApply,
        isActive: formData.isActive,
        ...(template ? {} : { repositoryId: repository })
      }

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to save template')
      }

      onSuccess()
    } catch (error) {
      console.error('Failed to save template:', error)
      alert(`Failed to save template: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            {template ? 'Edit Template' : 'Create New Template'}
          </h3>
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
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Basic Info */}
            <div className="space-y-4">
              <h4 className="text-md font-semibold text-gray-900 dark:text-gray-100">
                Basic Information
              </h4>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Template Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="form-input w-full"
                  placeholder="e.g., Bug Report Template"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="form-input w-full h-20 resize-none"
                  placeholder="Brief description of this template..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Category *
                </label>
                <select
                  required
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="form-input w-full"
                >
                  <option value="BUG_REPORT">Bug Report</option>
                  <option value="FEATURE_REQUEST">Feature Request</option>
                  <option value="QUESTION">Question</option>
                  <option value="DOCUMENTATION">Documentation</option>
                  <option value="PERFORMANCE_ISSUE">Performance Issue</option>
                  <option value="SECURITY_ISSUE">Security Issue</option>
                  <option value="CUSTOM">Custom</option>
                </select>
              </div>

              {/* Settings */}
              <div className="space-y-3">
                <h5 className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  Settings
                </h5>
                
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.requiresApproval}
                    onChange={(e) => setFormData({ ...formData, requiresApproval: e.target.checked })}
                    className="form-checkbox"
                  />
                  <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                    Requires maintainer approval before posting
                  </span>
                </label>

                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.autoApply}
                    onChange={(e) => setFormData({ ...formData, autoApply: e.target.checked })}
                    className="form-checkbox"
                  />
                  <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                    Auto-apply when conditions are met
                  </span>
                </label>

                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.isActive}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                    className="form-checkbox"
                  />
                  <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                    Template is active
                  </span>
                </label>
              </div>
            </div>

            {/* Template Content */}
            <div className="space-y-4">
              <h4 className="text-md font-semibold text-gray-900 dark:text-gray-100">
                Template Content
              </h4>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Header
                </label>
                <textarea
                  value={formData.header}
                  onChange={(e) => setFormData({ ...formData, header: e.target.value })}
                  className="form-input w-full h-20 resize-none"
                  placeholder="## Template Header"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Body *
                </label>
                <textarea
                  required
                  value={formData.body}
                  onChange={(e) => setFormData({ ...formData, body: e.target.value })}
                  className="form-input w-full h-32 resize-none"
                  placeholder="Main template content... Use {{variable_name}} for dynamic content."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Footer
                </label>
                <textarea
                  value={formData.footer}
                  onChange={(e) => setFormData({ ...formData, footer: e.target.value })}
                  className="form-input w-full h-16 resize-none"
                  placeholder="Template footer..."
                />
              </div>

              {/* Available Variables */}
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
                <h5 className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-2">
                  Available Variables:
                </h5>
                <div className="text-xs text-blue-800 dark:text-blue-200 space-y-1">
                  <div><code>{'{{issue_title}}'}</code> - Issue title</div>
                  <div><code>{'{{issue_number}}'}</code> - Issue number</div>
                  <div><code>{'{{issue_author}}'}</code> - Issue author</div>
                  <div><code>{'{{missing_elements}}'}</code> - List of missing elements</div>
                  <div><code>{'{{quality_score}}'}</code> - Quality score</div>
                  <div><code>{'{{maintainer_name}}'}</code> - Maintainer team name</div>
                </div>
              </div>
            </div>
          </div>

          {/* Modal Actions */}
          <div className="mt-6 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="btn bg-gray-500 text-white hover:bg-gray-600"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="btn bg-violet-500 text-white hover:bg-violet-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Saving...' : (template ? 'Update Template' : 'Create Template')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
