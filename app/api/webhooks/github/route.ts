import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { prisma } from '@/lib/prisma'
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
      console.error('Invalid webhook signature')
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
    }
    
    const event = request.headers.get('x-github-event')
    const data = JSON.parse(payload)
    
    console.log(`Received GitHub webhook: ${event}`)
    
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
        console.log(`Unhandled webhook event: ${event}`)
    }
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Webhook processing error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

function verifySignature(payload: string, signature: string | null): boolean {
  if (!signature) return false
  
  const secret = process.env.GITHUB_WEBHOOK_SECRET
  if (!secret) {
    console.warn('GITHUB_WEBHOOK_SECRET not configured')
    return true // Allow in development
  }
  
  const expectedSignature = `sha256=${crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex')}`
  
  return signature === expectedSignature
}

// Handle issue assignment events
async function handleIssuesEvent(payload: any) {
  if (payload.action === 'assigned') {
    console.log(`Issue #${payload.issue.number} assigned to ${payload.assignee.login}`)
    
    // Record assignment
    await assignmentService.recordAssignment({
      repositoryId: payload.repository.id.toString(),
      repositoryName: payload.repository.full_name,
      issueNumber: payload.issue.number,
      assigneeId: payload.assignee.id.toString(),
      assigneeLogin: payload.assignee.login
    })
  } else if (payload.action === 'unassigned') {
    console.log(`Issue #${payload.issue.number} unassigned from ${payload.assignee.login}`)
    
    // Update assignment status
    await assignmentService.unassignUser({
      repositoryId: payload.repository.id.toString(),
      issueNumber: payload.issue.number,
      assigneeId: payload.assignee.id.toString()
    })
  }
}

// Handle issue comment events (MAIN REPO ACTIVITY)
async function handleIssueCommentEvent(payload: any) {
  console.log(`Comment on issue #${payload.issue.number} by ${payload.comment.user.login}`)
  
  // Find assignment for this issue and assignee
  const assignment = await prisma.assignment.findFirst({
    where: {
      repositoryId: payload.repository.id.toString(),
      issueNumber: payload.issue.number,
      assigneeId: payload.comment.user.id.toString()
    }
  })
  
  if (assignment) {
    // Update activity timestamp
    await assignmentService.updateActivity(
      assignment.id,
      'ISSUE_COMMENT',
      'MAIN_REPO',
      {
        commentId: payload.comment.id,
        commentBody: payload.comment.body
      }
    )
    
    // AI analysis of comment for work progress detection
    try {
      const aiAnalysis = await aiService.analyzeComment(payload.comment.body)
      await assignmentService.updateAIAnalysis(assignment.id, aiAnalysis)
    } catch (error) {
      console.error('AI analysis failed:', error)
    }
  }
}

// Handle pull request events (MAIN REPO ACTIVITY)
async function handlePullRequestEvent(payload: any) {
  console.log(`PR #${payload.pull_request.number} ${payload.action} by ${payload.pull_request.user.login}`)
  
  // Check if PR is linked to an issue
  const issueNumbers = extractIssueNumbers(payload.pull_request.body || '')
  
  for (const issueNumber of issueNumbers) {
    const assignment = await prisma.assignment.findFirst({
      where: {
        repositoryId: payload.repository.id.toString(),
        issueNumber: issueNumber,
        assigneeId: payload.pull_request.user.id.toString()
      }
    })
    
    if (assignment) {
      await assignmentService.updateActivity(
        assignment.id,
        'PULL_REQUEST',
        'MAIN_REPO',
        {
          prNumber: payload.pull_request.number,
          prAction: payload.action,
          prTitle: payload.pull_request.title
        }
      )
    }
  }
}

// Handle push events (MAIN REPO + FORK ACTIVITY)
async function handlePushEvent(payload: any) {
  console.log(`Push to ${payload.repository.full_name} by ${payload.pusher.name}`)
  
  // Check if this is a push to the main repository
  if (payload.repository.id.toString() === payload.repository.id.toString()) {
    // Main repo push - check for linked issues
    const issueNumbers = extractIssueNumbersFromCommits(payload.commits)
    
    for (const issueNumber of issueNumbers) {
      const assignment = await prisma.assignment.findFirst({
        where: {
          repositoryId: payload.repository.id.toString(),
          issueNumber: issueNumber
        }
      })
      
      if (assignment) {
        await assignmentService.updateActivity(
          assignment.id,
          'PUSH',
          'MAIN_REPO',
          {
            commitCount: payload.commits.length,
            commits: payload.commits.map((c: any) => ({
              sha: c.id,
              message: c.message
            }))
          }
        )
      }
    }
  } else {
    // This might be a fork push - we'll handle this in the background monitoring
    console.log('Fork push detected - will be processed by background monitoring')
  }
}

// Extract issue numbers from text (e.g., "Fixes #123" or "Closes #456")
function extractIssueNumbers(text: string): number[] {
  const issueRegex = /#(\d+)/g
  const matches = text.match(issueRegex)
  return matches ? matches.map(match => parseInt(match.substring(1))) : []
}

// Extract issue numbers from commit messages
function extractIssueNumbersFromCommits(commits: any[]): number[] {
  const issueNumbers = new Set<number>()
  
  commits.forEach(commit => {
    const numbers = extractIssueNumbers(commit.message)
    numbers.forEach(num => issueNumbers.add(num))
  })
  
  return Array.from(issueNumbers)
}
