/**
 * API Endpoint: Approve or Reject Pending Comments
 * 
 * This endpoint handles the maintainer approval workflow for automated
 * comments on incomplete GitHub issues.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { GitHubClient } from '@/lib/github/client'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const repositoryId = searchParams.get('repositoryId')
    const status = searchParams.get('status')

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
          error: `Repository "${repositoryId}" not found. Please sync your repositories first.`,
          code: 'REPOSITORY_NOT_FOUND'
        }, { status: 404 })
      }
      actualRepositoryId = repository.id
    } else {
      actualRepositoryId = repositoryId
    }

    // Build where clause
    const whereClause: any = {
      repositoryId: actualRepositoryId
    }

    if (status && status !== 'all') {
      whereClause.status = status.toUpperCase()
    }

    // Fetch pending comments
    const pendingComments = await prisma.pendingComment.findMany({
      where: whereClause,
      include: {
        template: true,
        repository: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    // Transform to match frontend interface
    const transformedComments = pendingComments.map(comment => ({
      id: comment.id,
      issueNumber: comment.issueNumber,
      issueTitle: comment.issueTitle,
      issueUrl: comment.issueUrl,
      issueAuthor: comment.issueAuthor,
      qualityScore: comment.qualityScore,
      missingElements: Array.isArray(comment.missingElements) ? comment.missingElements : [],
      generatedComment: comment.generatedComment,
      finalComment: comment.finalComment,
      status: comment.status,
      templateName: comment.template?.name || 'Unknown Template',
      templateId: comment.templateId,
      repositoryName: comment.repository?.fullName || 'Unknown Repository',
      createdAt: comment.createdAt.toISOString(),
      approvedBy: comment.approvedBy,
      approvedAt: comment.approvedAt?.toISOString(),
      rejectedBy: comment.rejectedBy,
      rejectedAt: comment.rejectedAt?.toISOString(),
      rejectionReason: comment.rejectionReason,
      githubCommentId: comment.githubCommentId,
      postedAt: comment.postedAt?.toISOString()
    }))

    return NextResponse.json({
      comments: transformedComments,
      total: transformedComments.length
    })

  } catch (error) {
    console.error('Error fetching pending comments:', error)
    return NextResponse.json(
      { error: 'Failed to fetch pending comments' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { 
      commentId, 
      approved, 
      editedComment, 
      rejectionReason,
      templateId 
    } = await request.json()

    if (!commentId) {
      return NextResponse.json({ 
        error: 'Comment ID is required' 
      }, { status: 400 })
    }

    // Get the pending comment
    const pendingComment = await prisma.pendingComment.findUnique({
      where: { id: commentId },
      include: { 
        template: true, 
        repository: true 
      }
    })

    if (!pendingComment) {
      return NextResponse.json({ 
        error: 'Pending comment not found' 
      }, { status: 404 })
    }

    // Check if comment is still pending
    if (pendingComment.status !== 'PENDING') {
      return NextResponse.json({ 
        error: `Comment is already ${pendingComment.status.toLowerCase()}` 
      }, { status: 400 })
    }

    if (approved) {
      // Approve and post the comment
      return await approveAndPostComment(
        pendingComment, 
        session.user.id, 
        editedComment,
        templateId
      )
    } else {
      // Reject the comment
      return await rejectComment(
        pendingComment, 
        session.user.id, 
        rejectionReason
      )
    }

  } catch (error) {
    console.error('Comment approval processing failed:', error)
    return NextResponse.json(
      { error: 'Failed to process comment approval' },
      { status: 500 }
    )
  }
}

/**
 * Approve and post a comment to GitHub
 */
async function approveAndPostComment(
  pendingComment: any,
  approverId: string,
  editedComment?: string,
  templateId?: string
) {
  try {
    // Get GitHub client
    const githubClient = await GitHubClient.createWithUserToken(approverId)
    const [owner, repo] = pendingComment.repository.fullName.split('/')
    
    // Use edited comment if provided, otherwise use generated comment
    const finalComment = editedComment || pendingComment.generatedComment
    
    // Post comment to GitHub
    const githubResponse = await githubClient.octokit.rest.issues.createComment({
      owner,
      repo,
      issue_number: pendingComment.issueNumber,
      body: finalComment
    })

    // Update pending comment status
    await prisma.pendingComment.update({
      where: { id: pendingComment.id },
      data: {
        status: 'POSTED',
        approvedBy: approverId,
        approvedAt: new Date(),
        finalComment,
        githubCommentId: githubResponse.data.id,
        postedAt: new Date()
      }
    })

    // Update template usage count
    await prisma.completenessTemplate.update({
      where: { id: pendingComment.templateId },
      data: {
        usageCount: { increment: 1 },
        lastUsed: new Date()
      }
    })

    // Log the activity
    await prisma.activityLog.create({
      data: {
        action: 'APPROVED_COMMENT',
        entityType: 'PendingComment',
        entityId: pendingComment.id,
        metadata: {
          issueNumber: pendingComment.issueNumber,
          templateId: pendingComment.templateId,
          githubCommentId: githubResponse.data.id,
          edited: !!editedComment
        },
        userId: approverId
      }
    })

    return NextResponse.json({ 
      success: true, 
      message: 'Comment approved and posted successfully',
      githubCommentId: githubResponse.data.id,
      commentUrl: githubResponse.data.html_url
    })

  } catch (error) {
    console.error('Failed to post approved comment:', error)
    
    // Update status to failed
    await prisma.pendingComment.update({
      where: { id: pendingComment.id },
      data: {
        status: 'FAILED',
        rejectedBy: approverId,
        rejectedAt: new Date(),
        rejectionReason: `Failed to post comment: ${error instanceof Error ? error.message : 'Unknown error'}`
      }
    })

    return NextResponse.json(
      { error: 'Failed to post comment to GitHub' },
      { status: 500 }
    )
  }
}

/**
 * Reject a pending comment
 */
async function rejectComment(
  pendingComment: any,
  rejectorId: string,
  rejectionReason?: string
) {
  try {
    // Update pending comment status
    await prisma.pendingComment.update({
      where: { id: pendingComment.id },
      data: {
        status: 'REJECTED',
        rejectedBy: rejectorId,
        rejectedAt: new Date(),
        rejectionReason: rejectionReason || 'No reason provided'
      }
    })

    // Log the activity
    await prisma.activityLog.create({
      data: {
        action: 'REJECTED_COMMENT',
        entityType: 'PendingComment',
        entityId: pendingComment.id,
        metadata: {
          issueNumber: pendingComment.issueNumber,
          templateId: pendingComment.templateId,
          rejectionReason
        },
        userId: rejectorId
      }
    })

    return NextResponse.json({ 
      success: true, 
      message: 'Comment rejected successfully'
    })

  } catch (error) {
    console.error('Failed to reject comment:', error)
    return NextResponse.json(
      { error: 'Failed to reject comment' },
      { status: 500 }
    )
  }
}

/**
 * GET endpoint to retrieve pending comments for approval
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const repositoryId = searchParams.get('repositoryId')
    const status = searchParams.get('status') || 'PENDING'
    const limit = parseInt(searchParams.get('limit') || '50')

    const whereClause: any = { status }
    
    if (repositoryId) {
      whereClause.repositoryId = repositoryId
    }

    const pendingComments = await prisma.pendingComment.findMany({
      where: whereClause,
      include: {
        template: true,
        repository: true
      },
      orderBy: { createdAt: 'desc' },
      take: limit
    })

    const formattedComments = pendingComments.map(comment => ({
      id: comment.id,
      issueNumber: comment.issueNumber,
      issueTitle: comment.issueTitle,
      issueUrl: comment.issueUrl,
      issueAuthor: comment.issueAuthor,
      qualityScore: comment.qualityScore,
      missingElements: comment.missingElements,
      generatedComment: comment.generatedComment,
      finalComment: comment.finalComment,
      status: comment.status,
      templateName: comment.template.name,
      templateId: comment.templateId,
      repositoryName: comment.repository.fullName,
      createdAt: comment.createdAt,
      approvedBy: comment.approvedBy,
      approvedAt: comment.approvedAt,
      rejectedBy: comment.rejectedBy,
      rejectedAt: comment.rejectedAt,
      rejectionReason: comment.rejectionReason,
      githubCommentId: comment.githubCommentId,
      postedAt: comment.postedAt
    }))

    return NextResponse.json({
      comments: formattedComments,
      total: pendingComments.length,
      repository: repositoryId ? pendingComments[0]?.repository?.fullName : null
    })

  } catch (error) {
    console.error('Failed to get pending comments:', error)
    return NextResponse.json(
      { error: 'Failed to retrieve pending comments' },
      { status: 500 }
    )
  }
}

/**
 * PUT endpoint to update a pending comment (edit before approval)
 */
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { commentId, editedComment } = await request.json()

    if (!commentId || !editedComment) {
      return NextResponse.json({ 
        error: 'Comment ID and edited comment are required' 
      }, { status: 400 })
    }

    // Update the pending comment
    const updatedComment = await prisma.pendingComment.update({
      where: { id: commentId },
      data: {
        finalComment: editedComment,
        updatedAt: new Date()
      },
      include: {
        template: true,
        repository: true
      }
    })

    // Log the activity
    await prisma.activityLog.create({
      data: {
        action: 'EDITED_COMMENT',
        entityType: 'PendingComment',
        entityId: commentId,
        metadata: {
          issueNumber: updatedComment.issueNumber,
          templateId: updatedComment.templateId
        },
        userId: session.user.id
      }
    })

    return NextResponse.json({ 
      success: true, 
      message: 'Comment updated successfully',
      comment: {
        id: updatedComment.id,
        finalComment: updatedComment.finalComment,
        updatedAt: updatedComment.updatedAt
      }
    })

  } catch (error) {
    console.error('Failed to update comment:', error)
    return NextResponse.json(
      { error: 'Failed to update comment' },
      { status: 500 }
    )
  }
}
