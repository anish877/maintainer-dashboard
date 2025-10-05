/**
 * Post Approved Comment API
 * 
 * This endpoint posts an approved comment to a GitHub issue.
 * It's part of the simplified completeness workflow.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { GitHubClient } from '@/lib/github/client'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { 
      owner, 
      repo, 
      issueNumber, 
      comment,
      analysisId 
    } = await request.json()

    if (!owner || !repo || !issueNumber || !comment) {
      return NextResponse.json({ 
        error: 'Repository owner, name, issue number, and comment are required' 
      }, { status: 400 })
    }

    // Initialize GitHub client
    const githubClient = await GitHubClient.createWithUserToken(session.user.id)

    // Post comment to GitHub
    const { data: githubComment } = await githubClient.octokit.rest.issues.createComment({
      owner,
      repo,
      issue_number: issueNumber,
      body: comment
    })

    // Update analysis record if provided
    if (analysisId) {
      await prisma.completenessAnalysis.update({
        where: { id: analysisId },
        data: {
          githubCommentId: githubComment.id,
          postedAt: new Date(),
          generatedComment: comment
        }
      })
    }

    // Log the activity
    await prisma.activityLog.create({
      data: {
        action: 'POSTED_COMMENT',
        entityType: 'GitHubComment',
        entityId: githubComment.id.toString(),
        metadata: {
          repository: `${owner}/${repo}`,
          issueNumber: issueNumber,
          commentLength: comment.length
        },
        userId: session.user.id
      }
    })

    return NextResponse.json({
      success: true,
      message: 'Comment posted successfully',
      comment: {
        id: githubComment.id,
        url: githubComment.html_url,
        body: githubComment.body,
        createdAt: githubComment.created_at
      }
    })

  } catch (error) {
    console.error('Failed to post comment:', error)
    
    // Handle specific error types
    if (error instanceof Error) {
      if (error.message.includes('Not Found')) {
        return NextResponse.json(
          { error: 'Issue or repository not found' },
          { status: 404 }
        )
      }
      if (error.message.includes('rate limit')) {
        return NextResponse.json(
          { error: 'GitHub API rate limit exceeded. Please try again later.' },
          { status: 429 }
        )
      }
      if (error.message.includes('permission')) {
        return NextResponse.json(
          { error: 'Insufficient permissions to post comments on this repository' },
          { status: 403 }
        )
      }
    }

    return NextResponse.json(
      { error: 'Failed to post comment' },
      { status: 500 }
    )
  }
}
