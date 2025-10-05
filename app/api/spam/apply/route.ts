import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { Octokit } from '@octokit/rest'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { owner, repo, issueNumber, action, labels, comment } = await request.json()

    if (!owner || !repo || !issueNumber || !action) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 })
    }

    // Get user's GitHub access token
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { accessToken: true }
    })

    if (!user?.accessToken) {
      return NextResponse.json({ error: 'GitHub access token not found' }, { status: 400 })
    }

    const octokit = new Octokit({ auth: user.accessToken })

    let result: any = { success: true }

    // Apply labels if provided
    if (labels && labels.length > 0) {
      try {
        await octokit.rest.issues.setLabels({
          owner,
          repo,
          issue_number: issueNumber,
          labels
        })
        result.appliedLabels = labels
      } catch (error) {
        console.error('Error applying labels:', error)
        result.labelError = 'Failed to apply labels'
      }
    }

    // Add comment if provided
    if (comment) {
      try {
        await octokit.rest.issues.createComment({
          owner,
          repo,
          issue_number: issueNumber,
          body: comment
        })
        result.commentAdded = true
      } catch (error) {
        console.error('Error adding comment:', error)
        result.commentError = 'Failed to add comment'
      }
    }

    // Handle specific actions
    switch (action) {
      case 'block':
        // Close the issue/PR and add blocking comment
        try {
          await octokit.rest.issues.update({
            owner,
            repo,
            issue_number: issueNumber,
            state: 'closed',
            state_reason: 'not_planned'
          })
          
          const blockComment = `**Blocked by Spam Detection**

This ${comment ? 'issue' : 'pull request'} has been automatically blocked due to detected spam or low-quality content.

**Reason:** ${comment || 'Spam/low-quality content detected'}

If you believe this is an error, please contact the maintainers.`
          
          await octokit.rest.issues.createComment({
            owner,
            repo,
            issue_number: issueNumber,
            body: blockComment
          })
          
          result.action = 'blocked'
        } catch (error) {
          console.error('Error blocking issue:', error)
          result.actionError = 'Failed to block issue'
        }
        break

      case 'flag':
        // Add flagging comment and labels
        try {
          const flagComment = `⚠️ **Flagged for Review**

This ${comment ? 'issue' : 'pull request'} has been flagged for potential spam or low-quality content.

**Reason:** ${comment || 'Potential spam/low-quality content detected'}

Please review before proceeding.`
          
          await octokit.rest.issues.createComment({
            owner,
            repo,
            issue_number: issueNumber,
            body: flagComment
          })
          
          result.action = 'flagged'
        } catch (error) {
          console.error('Error flagging issue:', error)
          result.actionError = 'Failed to flag issue'
        }
        break

      case 'review':
        // Just add review comment
        try {
          const reviewComment = `🔍 **Manual Review Required**

This ${comment ? 'issue' : 'pull request'} has been flagged for manual review.

**Reason:** ${comment || 'Manual review recommended'}

Please review the content and take appropriate action.`
          
          await octokit.rest.issues.createComment({
            owner,
            repo,
            issue_number: issueNumber,
            body: reviewComment
          })
          
          result.action = 'review_requested'
        } catch (error) {
          console.error('Error requesting review:', error)
          result.actionError = 'Failed to request review'
        }
        break

      case 'approve':
        // Mark as approved (no action needed)
        result.action = 'approved'
        break

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

    return NextResponse.json(result)

  } catch (error) {
    console.error('Error applying spam analysis:', error)
    return NextResponse.json(
      { error: 'Failed to apply spam analysis' }, 
      { status: 500 }
    )
  }
}
