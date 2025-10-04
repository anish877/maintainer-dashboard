/**
 * API Endpoint: Template Management
 * 
 * This endpoint handles CRUD operations for completeness checker templates,
 * including creating, reading, updating, and deleting templates.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { templateEngine } from '@/lib/templates/template-engine'
import { prisma } from '@/lib/prisma'

/**
 * GET - Retrieve templates for a repository
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const repositoryId = searchParams.get('repositoryId')
    const category = searchParams.get('category')
    const activeOnly = searchParams.get('activeOnly') === 'true'

    if (!repositoryId) {
      return NextResponse.json({ 
        error: 'Repository ID is required' 
      }, { status: 400 })
    }

    // Look up repository if repositoryId is provided as full name
    let actualRepositoryId = null
    if (repositoryId.includes('/')) {
      const repository = await prisma.repository.findUnique({
        where: { fullName: repositoryId }
      })
      if (!repository) {
        return NextResponse.json({ 
          error: `Repository "${repositoryId}" not found. Please sync your repositories first by visiting the Repositories page.`,
          code: 'REPOSITORY_NOT_FOUND'
        }, { status: 404 })
      }
      actualRepositoryId = repository.id
    } else {
      // Assume it's already a UUID
      actualRepositoryId = repositoryId
    }

    // Build where clause
    const whereClause: any = {
      repositoryId: actualRepositoryId,
      ...(activeOnly && { isActive: true }),
      ...(category && { category })
    }

    const templates = await prisma.completenessTemplate.findMany({
      where: whereClause,
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
            username: true,
            image: true
          }
        }
      },
      orderBy: [
        { isDefault: 'desc' },
        { usageCount: 'desc' },
        { createdAt: 'desc' }
      ]
    })

    // Format templates for response
    const formattedTemplates = templates.map(template => ({
      id: template.id,
      name: template.name,
      description: template.description,
      category: template.category,
      template: template.template,
      variables: template.variables,
      styling: template.styling,
      conditions: template.conditions,
      isActive: template.isActive,
      isDefault: template.isDefault,
      requiresApproval: template.requiresApproval,
      autoApply: template.autoApply,
      usageCount: template.usageCount,
      lastUsed: template.lastUsed,
      createdAt: template.createdAt,
      updatedAt: template.updatedAt,
      createdBy: {
        id: template.createdBy.id,
        name: template.createdBy.name,
        username: template.createdBy.username,
        image: template.createdBy.image
      }
    }))

    return NextResponse.json({
      templates: formattedTemplates,
      total: templates.length
    })

  } catch (error) {
    console.error('Failed to get templates:', error)
    return NextResponse.json(
      { error: 'Failed to retrieve templates' },
      { status: 500 }
    )
  }
}

/**
 * POST - Create a new template
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const {
      name,
      description,
      category,
      template,
      variables,
      styling,
      conditions,
      isActive = true,
      requiresApproval = true,
      autoApply = false,
      repositoryId
    } = await request.json()

    // Validate required fields
    if (!name || !category || !template) {
      return NextResponse.json({ 
        error: 'Name, category, and template content are required' 
      }, { status: 400 })
    }

    // Validate template structure
    if (!template.header && !template.body && !template.footer) {
      return NextResponse.json({ 
        error: 'Template must have at least one of: header, body, or footer' 
      }, { status: 400 })
    }

    // Look up repository if repositoryId is provided as full name
    let actualRepositoryId = null
    if (repositoryId) {
      // Check if repositoryId is a full name (contains '/') or a UUID
      if (repositoryId.includes('/')) {
        const repository = await prisma.repository.findUnique({
          where: { fullName: repositoryId }
        })
        if (!repository) {
          return NextResponse.json({ 
            error: `Repository "${repositoryId}" not found. Please sync your repositories first by visiting the Repositories page.`,
            code: 'REPOSITORY_NOT_FOUND'
          }, { status: 404 })
        }
        actualRepositoryId = repository.id
      } else {
        // Assume it's already a UUID
        actualRepositoryId = repositoryId
      }
    }

    // Check if template name already exists for this repository
    const existingTemplate = await prisma.completenessTemplate.findFirst({
      where: {
        name,
        repositoryId: actualRepositoryId || null
      }
    })

    if (existingTemplate) {
      return NextResponse.json({ 
        error: 'A template with this name already exists' 
      }, { status: 409 })
    }

    // Create template using template engine
    const newTemplate = await templateEngine.createTemplate(
      {
        name,
        description,
        category,
        template,
        variables: variables || [],
        styling: styling || templateEngine.getDefaultStyling(),
        conditions: conditions || {},
        isActive,
        requiresApproval,
        autoApply
      },
      session.user.id,
      actualRepositoryId
    )

    // Log the activity
    await prisma.activityLog.create({
      data: {
        action: 'CREATED_TEMPLATE',
        entityType: 'CompletenessTemplate',
        entityId: newTemplate.id,
        metadata: {
          templateName: newTemplate.name,
          category: newTemplate.category,
          repositoryId
        },
        userId: session.user.id
      }
    })

    return NextResponse.json({
      success: true,
      message: 'Template created successfully',
      template: newTemplate
    }, { status: 201 })

  } catch (error) {
    console.error('Failed to create template:', error)
    return NextResponse.json(
      { error: 'Failed to create template' },
      { status: 500 }
    )
  }
}

/**
 * PUT - Update an existing template
 */
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const {
      id,
      name,
      description,
      category,
      template,
      variables,
      styling,
      conditions,
      isActive,
      requiresApproval,
      autoApply
    } = await request.json()

    if (!id) {
      return NextResponse.json({ 
        error: 'Template ID is required' 
      }, { status: 400 })
    }

    // Check if template exists and user has permission to edit
    const existingTemplate = await prisma.completenessTemplate.findUnique({
      where: { id },
      include: { createdBy: true }
    })

    if (!existingTemplate) {
      return NextResponse.json({ 
        error: 'Template not found' 
      }, { status: 404 })
    }

    // Check permissions (only creator can edit, or admin)
    if (existingTemplate.createdById !== session.user.id) {
      return NextResponse.json({ 
        error: 'You do not have permission to edit this template' 
      }, { status: 403 })
    }

    // Prepare update data
    const updateData: any = {}
    if (name !== undefined) updateData.name = name
    if (description !== undefined) updateData.description = description
    if (category !== undefined) updateData.category = category
    if (template !== undefined) updateData.template = template
    if (variables !== undefined) updateData.variables = variables
    if (styling !== undefined) updateData.styling = styling
    if (conditions !== undefined) updateData.conditions = conditions
    if (isActive !== undefined) updateData.isActive = isActive
    if (requiresApproval !== undefined) updateData.requiresApproval = requiresApproval
    if (autoApply !== undefined) updateData.autoApply = autoApply

    // Update template using template engine
    const updatedTemplate = await templateEngine.updateTemplate(id, updateData)

    // Log the activity
    await prisma.activityLog.create({
      data: {
        action: 'UPDATED_TEMPLATE',
        entityType: 'CompletenessTemplate',
        entityId: id,
        metadata: {
          templateName: updatedTemplate.name,
          changes: Object.keys(updateData)
        },
        userId: session.user.id
      }
    })

    return NextResponse.json({
      success: true,
      message: 'Template updated successfully',
      template: updatedTemplate
    })

  } catch (error) {
    console.error('Failed to update template:', error)
    return NextResponse.json(
      { error: 'Failed to update template' },
      { status: 500 }
    )
  }
}

/**
 * DELETE - Delete a template
 */
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const templateId = searchParams.get('id')

    if (!templateId) {
      return NextResponse.json({ 
        error: 'Template ID is required' 
      }, { status: 400 })
    }

    // Check if template exists and user has permission to delete
    const existingTemplate = await prisma.completenessTemplate.findUnique({
      where: { id: templateId },
      include: { createdBy: true }
    })

    if (!existingTemplate) {
      return NextResponse.json({ 
        error: 'Template not found' 
      }, { status: 404 })
    }

    // Check permissions (only creator can delete, or admin)
    if (existingTemplate.createdById !== session.user.id) {
      return NextResponse.json({ 
        error: 'You do not have permission to delete this template' 
      }, { status: 403 })
    }

    // Check if template is being used in pending comments
    const pendingComments = await prisma.pendingComment.count({
      where: { 
        templateId,
        status: 'PENDING'
      }
    })

    if (pendingComments > 0) {
      return NextResponse.json({ 
        error: `Cannot delete template: ${pendingComments} pending comments are using this template` 
      }, { status: 409 })
    }

    // Delete template using template engine
    await templateEngine.deleteTemplate(templateId)

    // Log the activity
    await prisma.activityLog.create({
      data: {
        action: 'DELETED_TEMPLATE',
        entityType: 'CompletenessTemplate',
        entityId: templateId,
        metadata: {
          templateName: existingTemplate.name,
          category: existingTemplate.category
        },
        userId: session.user.id
      }
    })

    return NextResponse.json({
      success: true,
      message: 'Template deleted successfully'
    })

  } catch (error) {
    console.error('Failed to delete template:', error)
    return NextResponse.json(
      { error: 'Failed to delete template' },
      { status: 500 }
    )
  }
}
