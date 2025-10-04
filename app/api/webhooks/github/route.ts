// GitHub webhook handler without database dependency
import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { AssignmentService } from '@/lib/services/assignment-service'
import { AIAnalysisService } from '@/lib/services/ai-analysis-service'

const assignmentService = new AssignmentService()
const aiService = new AIAnalysisService()

export async function POST(request: NextRequest) {
  try {
    const payload = await request.text()
    const signature = request.headers.get('x-hub-signature-256')
    
    // Verify webhook signature
    if (!verifySignature(payload, signature)) {
      console.error('❌ Invalid webhook signature')
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
    }
    
    const event = request.headers.get('x-github-event')
    const data = JSON.parse(payload)
    
    console.log(`📡 Received GitHub webhook: ${event}`)
    
    // Route to appropriate handler
    switch (event) {
      case 'issues':
        await handleIssuesEvent(data)
        break
      case 'issue_comment':
        await handleIssueCommentEvent(data)
        break
      case 'pull_request':
        await handlePullRequestEvent(data)
        break
      case 'push':
        await handlePushEvent(data)
        break
      default:
        console.log(`⚠️ Unhandled webhook event: ${event}`)
    }
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('❌ Error processing webhook:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

async function handleIssuesEvent(data: any) {
  try {
    const action = data.action
    const issue = data.issue
    const repository = data.repository
    
    console.log(`📋 Handling issues event: ${action} for issue #${issue.number}`)
    
    if (action === 'assigned' && issue.assignees && issue.assignees.length > 0) {
      // Record new assignment
      for (const assignee of issue.assignees) {
        await assignmentService.recordAssignment({
          repositoryId: repository.id.toString(),
          repositoryName: repository.full_name,
          issueNumber: issue.number,
          assigneeId: assignee.id.toString(),
          assigneeLogin: assignee.login
        })
      }
    } else if (action === 'unassigned' && issue.assignees && issue.assignees.length === 0) {
      // Handle unassignment
      console.log(`🚫 Issue #${issue.number} was unassigned`)
    }
  } catch (error) {
    console.error('❌ Error handling issues event:', error)
  }
}

async function handleIssueCommentEvent(data: any) {
  try {
    const comment = data.comment
    const issue = data.issue
    const repository = data.repository
    
    console.log(`💬 Handling issue comment event for issue #${issue.number}`)
    
    // Check if comment is from an assignee
    if (issue.assignees && issue.assignees.some((assignee: any) => assignee.login === comment.user.login)) {
      console.log(`📝 Comment from assignee ${comment.user.login} on issue #${issue.number}`)
      
      // Update assignment activity (simulated)
      const assignmentId = `assignment-${issue.number}`
      await assignmentService.updateActivity(
        assignmentId,
        'ISSUE_COMMENT',
        'MAIN_REPO',
        {
          commentId: comment.id,
          commentBody: comment.body,
          timestamp: new Date()
        }
      )
      
      // Perform AI analysis on comment
      try {
        const aiAnalysis = await aiService.analyzeComment(comment.body)
        console.log(`🤖 AI analysis of comment:`, aiAnalysis)
        
        // Update assignment with AI analysis
        await assignmentService.updateAIAnalysis(assignmentId, aiAnalysis)
      } catch (aiError) {
        console.error('❌ Error in AI analysis:', aiError)
      }
    }
  } catch (error) {
    console.error('❌ Error handling issue comment event:', error)
  }
}

async function handlePullRequestEvent(data: any) {
  try {
    const action = data.action
    const pullRequest = data.pull_request
    const repository = data.repository
    
    console.log(`🔀 Handling pull request event: ${action} for PR #${pullRequest.number}`)
    
    // Check if PR is from an assignee
    if (pullRequest.user && repository.owner.login !== pullRequest.user.login) {
      console.log(`📝 PR from ${pullRequest.user.login} in ${repository.full_name}`)
      
      // Update assignment activity (simulated)
      const assignmentId = `assignment-${pullRequest.number}`
      await assignmentService.updateActivity(
        assignmentId,
        'PULL_REQUEST',
        'MAIN_REPO',
        {
          prNumber: pullRequest.number,
          prTitle: pullRequest.title,
          timestamp: new Date()
        }
      )
    }
  } catch (error) {
    console.error('❌ Error handling pull request event:', error)
  }
}

async function handlePushEvent(data: any) {
  try {
    const commits = data.commits
    const repository = data.repository
    const pusher = data.pusher
    
    console.log(`📝 Handling push event: ${commits.length} commits by ${pusher.name}`)
    
    // Update assignment activity for commits (simulated)
    for (const commit of commits) {
      const assignmentId = `assignment-${commit.id}`
      await assignmentService.updateActivity(
        assignmentId,
        'PUSH',
        'MAIN_REPO',
        {
          commitSha: commit.id,
          commitMessage: commit.message,
          timestamp: new Date()
        }
      )
    }
  } catch (error) {
    console.error('❌ Error handling push event:', error)
  }
}

function verifySignature(payload: string, signature: string | null): boolean {
  if (!signature) return false
  
  const secret = process.env.GITHUB_WEBHOOK_SECRET
  if (!secret) {
    console.warn('⚠️ GITHUB_WEBHOOK_SECRET not set, skipping signature verification')
    return true
  }
  
  const expectedSignature = `sha256=${crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex')}`
  
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  )
}