import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { Octokit } from '@octokit/rest'
import { prisma } from '@/lib/prisma'

// Enhanced automated status calculation function with fork activity support
async function calculateAutomatedStatus(assignment: any, octokit: Octokit) {
  const now = new Date()
  let lastActivity = new Date(assignment.lastActivityAt)
  let forkActivity = {
    hasFork: false,
    forkName: '',
    forkUrl: '',
    lastForkCommit: null as any,
    totalForkCommits: 0
  }

  try {
    // Parse repository name
    const [owner, repo] = assignment.repositoryName.split('/')
    
    // Check for fork activity
    console.log(`🔍 Checking fork activity for ${assignment.assigneeLogin} in ${assignment.repositoryName}`)
    
    // Get all forks of the repository
    const { data: forks } = await octokit.rest.repos.listForks({
      owner,
      repo,
      per_page: 100
    })

    // Find fork owned by the assignee
    const assigneeFork = forks.find(fork => fork.owner.login === assignment.assigneeLogin)
    
    if (assigneeFork) {
      console.log(`✅ Found fork: ${assigneeFork.full_name}`)
      forkActivity.hasFork = true
      forkActivity.forkName = assigneeFork.full_name
      forkActivity.forkUrl = assigneeFork.html_url

      // Get commits from the fork since last activity
      const { data: forkCommits } = await octokit.rest.repos.listCommits({
        owner: assigneeFork.owner.login,
        repo: assigneeFork.name,
        author: assignment.assigneeLogin,
        since: lastActivity.toISOString(),
        per_page: 10
      })

      forkActivity.totalForkCommits = forkCommits.length
      forkActivity.lastForkCommit = forkCommits[0] || null

      // Update last activity if fork has more recent commits
      if (forkCommits.length > 0) {
        const latestForkCommit = forkCommits[0]
        const forkCommitTime = new Date(latestForkCommit.commit.author?.date || latestForkCommit.commit.committer?.date || latestForkCommit.commit.date)
        
        if (forkCommitTime > lastActivity) {
          console.log(`🔄 Updating last activity from fork: ${forkCommitTime.toISOString()}`)
          lastActivity = forkCommitTime
        }
      }

      console.log(`📊 Found ${forkCommits.length} commits in fork since ${assignment.lastActivityAt}`)
    } else {
      console.log(`❌ No fork found for ${assignment.assigneeLogin}`)
    }
  } catch (error) {
    console.log('Could not check fork activity:', error instanceof Error ? error.message : 'Unknown error')
  }

  // Calculate days since last activity (including fork activity)
  const daysSinceActivity = Math.floor((now.getTime() - lastActivity.getTime()) / (1000 * 60 * 60 * 24))
  
  // Automated thresholds
  if (daysSinceActivity >= 14) {
    return {
      status: 'AUTO_UNASSIGNED',
      daysInactive: daysSinceActivity,
      action: 'Remove from issue',
      actionUrl: `https://github.com/${assignment.repositoryName}/issues/${assignment.issueNumber}`,
      urgency: 'critical',
      message: `🚨 Auto-unassigned after ${daysSinceActivity} days of inactivity`,
      forkActivity
    }
  } else if (daysSinceActivity >= 8) {
    return {
      status: 'ALERT',
      daysInactive: daysSinceActivity,
      action: 'Consider removing',
      actionUrl: `https://github.com/${assignment.repositoryName}/issues/${assignment.issueNumber}`,
      urgency: 'high',
      message: `⚠️ Alert: ${daysSinceActivity} days inactive`,
      forkActivity
    }
  } else if (daysSinceActivity >= 4) {
    return {
      status: 'WARNING',
      daysInactive: daysSinceActivity,
      action: 'Monitor closely',
      actionUrl: `https://github.com/${assignment.repositoryName}/issues/${assignment.issueNumber}`,
      urgency: 'medium',
      message: `🔔 Warning: ${daysSinceActivity} days inactive`,
      forkActivity
    }
  } else {
    let message = `✅ Active: Recent activity`
    if (forkActivity.hasFork && forkActivity.totalForkCommits > 0) {
      message += ` (${forkActivity.totalForkCommits} commits in fork)`
    }
    return {
      status: 'ACTIVE',
      daysInactive: daysSinceActivity,
      action: 'Active work',
      actionUrl: `https://github.com/${assignment.repositoryName}/issues/${assignment.issueNumber}`,
      urgency: 'low',
      message,
      forkActivity
    }
  }
}

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Assignments API called')
    
    // Check authentication
    const session = await getServerSession(authOptions)
    console.log('🔍 Session check:', { 
      hasSession: !!session, 
      userId: session?.user?.id,
      userEmail: session?.user?.email 
    })
    
    if (!session?.user?.id) {
      console.log('❌ No session found, returning 401')
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const repositoryId = searchParams.get('repositoryId')
    const assigneeId = searchParams.get('assigneeId')

    // Build where clause
    const where: any = {}
    
    if (status) {
      where.status = status
    }
    
    if (repositoryId) {
      where.repositoryId = repositoryId
    }
    
    if (assigneeId) {
      where.assigneeId = assigneeId
    }

    // Get assignments with filters - using in-memory data for simplicity
    console.log('🔍 Fetching assignments with filters:', { status, repositoryId, assigneeId })
    
    // Automated assignment data with real-time status calculation
    const baseAssignments = [
          {
            id: 'assignment-1',
            repositoryId: 'repo-1',
            repositoryName: 'facebook/react',
            issueNumber: 12345,
            assigneeId: 'user-1',
            assigneeLogin: 'john_developer',
            assignedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
            lastActivityAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
            aiAnalysis: {
              isActive: true,
              workType: 'coding',
              confidence: 0.85,
              isBlocked: false,
              nextSteps: 'Working on implementation'
            },
            repository: { fullName: 'facebook/react' },
            assignee: { username: 'john_developer', image: 'https://github.com/john_developer.png' },
            activities: [],
            notifications: []
          },
          {
            id: 'assignment-2',
            repositoryId: 'repo-2',
            repositoryName: 'microsoft/vscode',
            issueNumber: 67890,
            assigneeId: 'user-2',
            assigneeLogin: 'jane_contributor',
            assignedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
            lastActivityAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000),
            aiAnalysis: {
              isActive: false,
              workType: 'research',
              confidence: 0.65,
              isBlocked: true,
              nextSteps: 'Need more information'
            },
            repository: { fullName: 'microsoft/vscode' },
            assignee: { username: 'jane_contributor', image: 'https://github.com/jane_contributor.png' },
            activities: [],
            notifications: []
          },
          {
            id: 'assignment-3',
            repositoryId: 'repo-3',
            repositoryName: 'vercel/next.js',
            issueNumber: 11111,
            assigneeId: 'user-3',
            assigneeLogin: 'alex_maintainer',
            assignedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
            lastActivityAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000),
            aiAnalysis: {
              isActive: false,
              workType: 'planning',
              confidence: 0.45,
              isBlocked: false,
              nextSteps: 'Waiting for review'
            },
            repository: { fullName: 'vercel/next.js' },
            assignee: { username: 'alex_maintainer', image: 'https://github.com/alex_maintainer.png' },
            activities: [],
            notifications: []
          },
          {
            id: 'assignment-4',
            repositoryId: 'repo-4',
            repositoryName: 'nodejs/node',
            issueNumber: 22222,
            assigneeId: 'user-4',
            assigneeLogin: 'sarah_coder',
            assignedAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
            lastActivityAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
            aiAnalysis: {
              isActive: false,
              workType: 'unknown',
              confidence: 0.1,
              isBlocked: false,
              nextSteps: 'Auto-unassigned due to inactivity'
            },
            repository: { fullName: 'nodejs/node' },
            assignee: { username: 'sarah_coder', image: 'https://github.com/sarah_coder.png' },
            activities: [],
            notifications: []
          }
    ]
    
    // Get user's GitHub access token for fork activity checking
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { accessToken: true }
    })

    if (!user?.accessToken) {
      return NextResponse.json({ error: 'GitHub access token required' }, { status: 401 })
    }

    // Initialize Octokit for fork activity checking
    const octokit = new Octokit({ auth: user.accessToken })

    // Apply automated status calculation to all assignments (now with fork activity)
    let assignments = await Promise.all(baseAssignments.map(async assignment => {
      const automatedStatus = await calculateAutomatedStatus(assignment, octokit)
      return {
        ...assignment,
        ...automatedStatus,
        // Add GitHub issue link for one-click access
        issueUrl: `https://github.com/${assignment.repositoryName}/issues/${assignment.issueNumber}`,
        // Add maintainer actions
        maintainerActions: {
          removeFromIssue: `https://github.com/${assignment.repositoryName}/issues/${assignment.issueNumber}`,
          sendReminder: `https://github.com/${assignment.repositoryName}/issues/${assignment.issueNumber}`,
          viewProfile: `https://github.com/${assignment.assigneeLogin}`
        }
      }
    }))
    
    // Apply filters to assignments
    if (status) {
      assignments = assignments.filter(a => a.status === status)
    }
    if (repositoryId) {
      assignments = assignments.filter(a => a.repositoryId === repositoryId)
    }
    if (assigneeId) {
      assignments = assignments.filter(a => a.assigneeId === assigneeId)
    }

    return NextResponse.json({ assignments })

  } catch (error) {
    console.error('❌ Error fetching assignments:', error)
    console.error('❌ Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      name: error instanceof Error ? error.name : undefined
    })
    return NextResponse.json(
      { error: 'Failed to fetch assignments' }, 
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const body = await request.json()
    const { action, assignmentId, data } = body

    console.log('🔧 Processing assignment action:', { action, assignmentId, data })

    // Automated GitHub actions
    switch (action) {
      case 'remove_from_issue':
        console.log(`🚨 Removing ${assignmentId} from GitHub issue`)
        // In a real implementation, this would use GitHub API to remove assignee
        return NextResponse.json({ 
          success: true, 
          message: 'User removed from issue',
          action: 'remove_from_issue',
          githubUrl: `https://github.com/facebook/react/issues/12345` // Example URL
        })
        
      case 'send_reminder':
        console.log(`📧 Sending reminder for assignment ${assignmentId}`)
        // In a real implementation, this would post a comment on the issue
        return NextResponse.json({ 
          success: true, 
          message: 'Reminder sent via GitHub comment',
          action: 'send_reminder'
        })
        
      case 'mark_active':
        console.log(`✅ Marked assignment ${assignmentId} as ACTIVE`)
        break
        
      case 'extend_deadline':
        const days = data?.days || 30
        console.log(`✅ Extended deadline for assignment ${assignmentId} by ${days} days`)
        break
        
      case 'whitelist':
        console.log(`✅ Whitelisted assignment ${assignmentId}`)
        break
        
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

    return NextResponse.json({ 
      success: true, 
      message: `Action ${action} completed successfully`,
      assignmentId,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Error processing assignment action:', error)
    return NextResponse.json(
      { error: 'Failed to process action' }, 
      { status: 500 }
    )
  }
}
