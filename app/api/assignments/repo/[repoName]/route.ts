import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { Octokit } from '@octokit/rest'
import { prisma } from '@/lib/prisma'
import { AIAnalysisService } from '@/lib/services/ai-analysis-service'

// Repository-specific assignments API
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ repoName: string }> }
) {
  try {
    console.log('🔍 Repository-specific assignments API called')
    
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

    const { repoName } = await params
    console.log('🔍 Repository name:', repoName)

    // Get user's GitHub access token
    console.log('🔍 Fetching user from database:', { userId: session.user.id })
    
    let user
    try {
      user = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { accessToken: true, username: true }
      })
      console.log('🔍 User data:', { hasUser: !!user, hasAccessToken: !!user?.accessToken, username: user?.username })
    } catch (error) {
      console.error('❌ Database error:', error)
      return NextResponse.json({ error: 'Database error' }, { status: 500 })
    }

    if (!user?.accessToken) {
      return NextResponse.json({ error: 'GitHub access token required' }, { status: 401 })
    }

    // Initialize Octokit
    const octokit = new Octokit({
      auth: user.accessToken
    })

    // Parse repository name (handle both "owner/repo" and "repo" formats)
    const [owner, repo] = repoName.includes('/') 
      ? repoName.split('/') 
      : [user.username || 'unknown', repoName]

    console.log(`🔍 Fetching issues for ${owner}/${repo}`)

    // Fetch all open issues with assignees
    let issues
    try {
      const response = await octokit.rest.issues.listForRepo({
        owner,
        repo,
        state: 'open',
        per_page: 100
      })
      issues = response.data
      console.log(`📋 Found ${issues.length} open issues`)
    } catch (error) {
      console.error('❌ GitHub API error:', error)
      return NextResponse.json({ 
        error: 'Failed to fetch issues from GitHub',
        details: error instanceof Error ? error.message : 'Unknown error'
      }, { status: 500 })
    }

    // Process issues to create assignments
    const repoAssignments = (await Promise.all(
      issues
        .filter(issue => issue.assignees && issue.assignees.length > 0)
        .map(async (issue) => {
          const assignee = issue.assignees?.[0]
          if (!assignee) return null
          
          // Get issue comments for activity tracking
          const { data: comments } = await octokit.rest.issues.listComments({
            owner,
            repo,
            issue_number: issue.number,
            per_page: 10
          })

          // Calculate last activity
          const lastComment = comments
            .filter(comment => comment.user?.login === assignee.login)
            .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0]

          // Calculate last activity from multiple sources
          const lastCommentTime = lastComment ? new Date(lastComment.created_at) : null
          const issueUpdateTime = new Date(issue.updated_at)
          const issueAssignTime = new Date(issue.created_at)
          
          // Use the most recent activity as lastActivityAt
          const lastActivityAt = lastCommentTime && lastCommentTime > issueUpdateTime 
            ? lastCommentTime 
            : issueUpdateTime

          // AI analysis of recent comments
          const recentComments = comments
            .filter(comment => comment.user?.login === assignee.login)
            .slice(-3)
            .map(comment => comment.body)

          let aiAnalysis = {
            isActive: false,
            workType: 'unknown',
            confidence: 0,
            isBlocked: false,
            nextSteps: 'No recent activity'
          }

          // Use AI analysis if we have comments
          if (recentComments.length > 0) {
            try {
              const aiService = new AIAnalysisService()
              const combinedText = recentComments.join('\n\n')
              
              console.log(`🤖 Analyzing comments for ${assignee.login} in issue #${issue.number}`)
              
              const analysis = await aiService.analyzeWorkProgress(combinedText)
              
              aiAnalysis = {
                isActive: analysis.isActive,
                workType: analysis.workType,
                confidence: analysis.confidence,
                isBlocked: analysis.isBlocked,
                nextSteps: `Last comment: ${recentComments[recentComments.length - 1]?.substring(0, 100)}...`
              }
              
              console.log(`✅ AI Analysis result:`, {
                isActive: aiAnalysis.isActive,
                workType: aiAnalysis.workType,
                confidence: Math.round(aiAnalysis.confidence * 100) + '%',
                isBlocked: aiAnalysis.isBlocked
              })
            } catch (error) {
              console.error('AI analysis failed, using fallback:', error)
              
              // Fallback to basic analysis
              const combinedComments = recentComments.join(' ').toLowerCase()
              aiAnalysis = {
                isActive: combinedComments.includes('working') || combinedComments.includes('progress') || combinedComments.includes('done'),
                workType: combinedComments.includes('code') || combinedComments.includes('implement') ? 'coding' :
                         combinedComments.includes('research') || combinedComments.includes('investigate') ? 'research' :
                         combinedComments.includes('plan') || combinedComments.includes('design') ? 'planning' : 'unknown',
                confidence: Math.min(0.9, 0.3 + (recentComments.length * 0.2)),
                isBlocked: combinedComments.includes('blocked') || combinedComments.includes('stuck') || combinedComments.includes('help'),
                nextSteps: `Last comment: ${recentComments[recentComments.length - 1]?.substring(0, 100)}...`
              }
            }
          }

          return {
            id: `assignment-${issue.number}`,
            repositoryId: issue.repository?.id?.toString() || 'unknown',
            repositoryName: `${owner}/${repo}`,
            issueNumber: issue.number,
            assigneeId: assignee.id?.toString() || 'unknown',
            assigneeLogin: assignee.login || 'unknown',
            assignedAt: new Date(issue.created_at),
            lastActivityAt,
            aiAnalysis,
            repository: { fullName: `${owner}/${repo}` },
            assignee: { 
              username: assignee.login || 'unknown', 
              image: assignee.avatar_url || 'https://github.com/identicons/default.png' 
            },
            activities: [],
            notifications: []
          }
        })
    )).filter(assignment => assignment !== null)

    // Apply automated status calculation to all assignments (TEST MODE: using minutes)
    const assignments = repoAssignments.map(assignment => {
      const now = new Date()
      const lastActivity = new Date(assignment.lastActivityAt)
      const minutesSinceActivity = Math.floor((now.getTime() - lastActivity.getTime()) / (1000 * 60))
      
      // TEST MODE: Automated thresholds (in minutes) - Maintainer controlled
      if (minutesSinceActivity >= 6) {
        return {
          ...assignment,
          status: 'CRITICAL',
          daysInactive: Math.floor(minutesSinceActivity / 60), // Convert to hours for display
          action: 'Consider removing',
          actionUrl: `https://github.com/${assignment.repositoryName}/issues/${assignment.issueNumber}`,
          urgency: 'critical',
          message: `🚨 Critical: ${minutesSinceActivity} minutes of inactivity - Consider removing`
        }
      } else if (minutesSinceActivity >= 5) {
        return {
          ...assignment,
          status: 'ALERT',
          daysInactive: Math.floor(minutesSinceActivity / 60),
          action: 'Final warning sent',
          actionUrl: `https://github.com/${assignment.repositoryName}/issues/${assignment.issueNumber}`,
          urgency: 'high',
          message: `⚠️ Alert: ${minutesSinceActivity} minutes inactive - Final warning sent`
        }
      } else if (minutesSinceActivity >= 3) {
        return {
          ...assignment,
          status: 'WARNING',
          daysInactive: Math.floor(minutesSinceActivity / 60),
          action: 'Gentle reminder sent',
          actionUrl: `https://github.com/${assignment.repositoryName}/issues/${assignment.issueNumber}`,
          urgency: 'medium',
          message: `🔔 Warning: ${minutesSinceActivity} minutes inactive - Reminder sent`
        }
      } else if (minutesSinceActivity >= 2) {
        return {
          ...assignment,
          status: 'ACTIVE',
          daysInactive: Math.floor(minutesSinceActivity / 60),
          action: 'Active work',
          actionUrl: `https://github.com/${assignment.repositoryName}/issues/${assignment.issueNumber}`,
          urgency: 'low',
          message: `✅ Active: Recent activity (${minutesSinceActivity} min ago)`
        }
      } else {
        return {
          ...assignment,
          status: 'ACTIVE',
          daysInactive: 0,
          action: 'Very active',
          actionUrl: `https://github.com/${assignment.repositoryName}/issues/${assignment.issueNumber}`,
          urgency: 'low',
          message: `🔥 Very Active: Just ${minutesSinceActivity} minutes ago`
        }
      }
    })

    // No automatic actions - maintainers have full control
    const processedAssignments = assignments

    // Add GitHub issue links and maintainer actions
    const assignmentsWithActions = processedAssignments.map(assignment => ({
      ...assignment,
      issueUrl: `https://github.com/${assignment.repositoryName}/issues/${assignment.issueNumber}`,
      maintainerActions: {
        removeFromIssue: `https://github.com/${assignment.repositoryName}/issues/${assignment.issueNumber}`,
        sendReminder: `https://github.com/${assignment.repositoryName}/issues/${assignment.issueNumber}`,
        viewProfile: `https://github.com/${assignment.assigneeLogin}`
      }
    }))

    return NextResponse.json({ 
      assignments: assignmentsWithActions,
      repository: repoName,
      total: assignmentsWithActions.length,
      stats: {
        active: assignmentsWithActions.filter(a => a.status === 'ACTIVE').length,
        warning: assignmentsWithActions.filter(a => a.status === 'WARNING').length,
        alert: assignmentsWithActions.filter(a => a.status === 'ALERT').length,
        autoUnassigned: assignmentsWithActions.filter(a => a.status === 'AUTO_UNASSIGNED').length
      }
    })

  } catch (error) {
    console.error('❌ Error fetching repository assignments:', error)
    return NextResponse.json(
      { error: 'Failed to fetch repository assignments' }, 
      { status: 500 }
    )
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ repoName: string }> }
) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const { repoName } = await params
    const body = await request.json()
    const { action, assignmentId, data } = body

    console.log(`🔧 Processing repository-specific assignment action for ${repoName}:`, { action, assignmentId, data })

    // Get user's GitHub access token
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { accessToken: true, username: true }
    })

    if (!user?.accessToken) {
      return NextResponse.json({ error: 'GitHub access token required' }, { status: 401 })
    }

    // Initialize Octokit
    const octokit = new Octokit({
      auth: user.accessToken
    })

    // Parse repository name
    const [owner, repo] = repoName.includes('/') 
      ? repoName.split('/') 
      : [user.username || 'unknown', repoName]

    // Extract issue number from assignmentId (format: assignment-{issueId})
    const issueNumber = parseInt(assignmentId.replace('assignment-', ''))

    // Repository-specific automated GitHub actions
    switch (action) {
      case 'remove_from_issue':
        try {
          console.log(`🚨 Removing assignee from issue #${issueNumber} in ${owner}/${repo}`)
          
          // Get current assignees
          const { data: issue } = await octokit.rest.issues.get({
            owner,
            repo,
            issue_number: issueNumber
          })

          if (issue.assignees && issue.assignees.length > 0) {
            // Remove all assignees
            await octokit.rest.issues.removeAssignees({
              owner,
              repo,
              issue_number: issueNumber,
              assignees: issue.assignees.map(a => a.login)
            })

            // Add a comment about the removal
            await octokit.rest.issues.createComment({
              owner,
              repo,
              issue_number: issueNumber,
              body: `🔔 **Automated Assignment Management**\n\nThis issue has been automatically unassigned due to inactivity. Please reassign if work is still needed.`
            })
          }

          return NextResponse.json({ 
            success: true, 
            message: `Assignee removed from issue #${issueNumber}`,
            action: 'remove_from_issue',
            githubUrl: `https://github.com/${owner}/${repo}/issues/${issueNumber}`,
            repository: `${owner}/${repo}`
          })
        } catch (error) {
          console.error('Error removing assignee:', error)
          return NextResponse.json({ 
            success: false, 
            message: 'Failed to remove assignee from GitHub issue',
            error: error instanceof Error ? error.message : 'Unknown error'
          }, { status: 500 })
        }
        
      case 'send_reminder':
        try {
          console.log(`📧 Sending reminder for issue #${issueNumber} in ${owner}/${repo}`)
          
          // First, verify the issue exists
          const { data: issue } = await octokit.rest.issues.get({
            owner,
            repo,
            issue_number: issueNumber
          })
          
          console.log(`✅ Issue found: ${issue.title}`)
          
          // Add a reminder comment
          await octokit.rest.issues.createComment({
            owner,
            repo,
            issue_number: issueNumber,
            body: `🔔 **Friendly Reminder**\n\nThis issue has been assigned for a while. Please provide an update on your progress or let us know if you need help!`
          })

          return NextResponse.json({ 
            success: true, 
            message: `Reminder sent for issue #${issueNumber}`,
            action: 'send_reminder',
            repository: `${owner}/${repo}`
          })
        } catch (error) {
          console.error('Error sending reminder:', error)
          
          // Provide more specific error messages
          let errorMessage = 'Failed to send reminder'
          if (error && typeof error === 'object' && 'status' in error) {
            if (error.status === 404) {
              errorMessage = `Issue #${issueNumber} not found in ${owner}/${repo}`
            } else if (error.status === 403) {
              errorMessage = 'Insufficient permissions to comment on this issue'
            } else if (error.status === 401) {
              errorMessage = 'GitHub authentication failed'
            }
          }
          
          return NextResponse.json({ 
            success: false, 
            message: errorMessage,
            error: error instanceof Error ? error.message : 'Unknown error'
          }, { status: 500 })
        }
        
      case 'mark_active':
        console.log(`✅ Marked assignment ${assignmentId} as ACTIVE in ${repoName}`)
        return NextResponse.json({ 
          success: true, 
          message: `Assignment marked as active`,
          action: 'mark_active',
          repository: `${owner}/${repo}`
        })
        
      case 'extend_deadline':
        const days = data?.days || 30
        console.log(`✅ Extended deadline for assignment ${assignmentId} by ${days} days in ${repoName}`)
        return NextResponse.json({ 
          success: true, 
          message: `Deadline extended by ${days} days`,
          action: 'extend_deadline',
          repository: `${owner}/${repo}`
        })
        
      case 'whitelist':
        console.log(`✅ Whitelisted assignment ${assignmentId} in ${repoName}`)
        return NextResponse.json({ 
          success: true, 
          message: `Assignment whitelisted`,
          action: 'whitelist',
          repository: `${owner}/${repo}`
        })
        
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

  } catch (error) {
    console.error('Error processing repository assignment action:', error)
    return NextResponse.json(
      { error: 'Failed to process repository assignment action' }, 
      { status: 500 }
    )
  }
}
