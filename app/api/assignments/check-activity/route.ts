import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { Octokit } from '@octokit/rest'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const body = await request.json()
    const { repositoryName, assignmentId } = body

    if (!repositoryName || !assignmentId) {
      return NextResponse.json({ 
        error: 'Repository name and assignment ID are required' 
      }, { status: 400 })
    }

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
    const [owner, repo] = repositoryName.includes('/') 
      ? repositoryName.split('/') 
      : [user.username, repositoryName]

    // Extract issue number from assignmentId
    const issueNumber = parseInt(assignmentId.replace('assignment-', ''))

    console.log(`🔍 Manual trigger: Checking activity for ${assignmentId} in ${owner}/${repo}`)

    // Get issue details
    const { data: issue } = await octokit.rest.issues.get({
      owner,
      repo,
      issue_number: issueNumber
    })

    // Get issue comments
    const { data: comments } = await octokit.rest.issues.listComments({
      owner,
      repo,
      issue_number: issueNumber
    })

    // Find assignee
    const assignee = issue.assignees?.[0]
    if (!assignee) {
      return NextResponse.json({ 
        error: 'No assignee found for this issue' 
      }, { status: 404 })
    }

    // Calculate activity metrics
    const now = new Date()
    const issueCreatedAt = new Date(issue.created_at)
    const issueUpdatedAt = new Date(issue.updated_at)
    
    // Find last comment by assignee
    const lastComment = comments
      .filter(comment => comment.user?.login === assignee.login)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0]

    const lastCommentTime = lastComment ? new Date(lastComment.created_at) : null
    
    // Determine last activity
    const lastActivityAt = lastCommentTime && lastCommentTime > issueUpdatedAt 
      ? lastCommentTime 
      : issueUpdatedAt

    // Calculate time differences
    const minutesSinceActivity = Math.floor((now.getTime() - lastActivityAt.getTime()) / (1000 * 60))
    const minutesSinceAssignment = Math.floor((now.getTime() - issueCreatedAt.getTime()) / (1000 * 60))
    const hoursSinceActivity = Math.floor(minutesSinceActivity / 60)
    const daysSinceActivity = Math.floor(hoursSinceActivity / 24)

    // Determine status and recommendations
    let status = 'ACTIVE'
    let recommendation = 'Continue monitoring'
    let urgency = 'low'
    let message = ''

    if (minutesSinceActivity >= 6) {
      status = 'CRITICAL'
      recommendation = 'Consider removing from issue'
      urgency = 'critical'
      message = `🚨 Critical: ${minutesSinceActivity} minutes (${hoursSinceActivity}h) since last activity`
    } else if (minutesSinceActivity >= 5) {
      status = 'ALERT'
      recommendation = 'Send final warning'
      urgency = 'high'
      message = `⚠️ Alert: ${minutesSinceActivity} minutes since last activity`
    } else if (minutesSinceActivity >= 3) {
      status = 'WARNING'
      recommendation = 'Send gentle reminder'
      urgency = 'medium'
      message = `🔔 Warning: ${minutesSinceActivity} minutes since last activity`
    } else if (minutesSinceActivity >= 2) {
      status = 'ACTIVE'
      recommendation = 'Normal activity'
      urgency = 'low'
      message = `✅ Active: ${minutesSinceActivity} minutes since last activity`
    } else {
      status = 'VERY_ACTIVE'
      recommendation = 'Very recent activity'
      urgency = 'low'
      message = `🔥 Very Active: Just ${minutesSinceActivity} minutes ago`
    }

    // Get recent commits (if we can access the repository)
    let recentCommits: Array<{
      sha: string
      message: string
      date: string
      url: string
    }> = []
    try {
      const { data: commits } = await octokit.rest.repos.listCommits({
        owner,
        repo,
        author: assignee.login,
        since: lastActivityAt.toISOString(),
        per_page: 5
      })
      recentCommits = commits.map(commit => ({
        sha: commit.sha,
        message: commit.commit.message,
        date: commit.commit.author?.date || new Date().toISOString(),
        url: commit.html_url
      }))
    } catch (error) {
      console.log('Could not fetch commits:', error instanceof Error ? error.message : 'Unknown error')
    }

    const activityReport = {
      assignmentId,
      repositoryName: `${owner}/${repo}`,
      issueNumber,
      assignee: {
        login: assignee.login,
        avatar: assignee.avatar_url,
        profile: assignee.html_url
      },
      timestamps: {
        issueCreated: issueCreatedAt.toISOString(),
        lastActivity: lastActivityAt.toISOString(),
        lastComment: lastCommentTime?.toISOString() || null,
        issueUpdated: issueUpdatedAt.toISOString()
      },
      metrics: {
        minutesSinceActivity,
        minutesSinceAssignment,
        hoursSinceActivity,
        daysSinceActivity
      },
      status,
      recommendation,
      urgency,
      message,
      recentCommits,
      issueUrl: `https://github.com/${owner}/${repo}/issues/${issueNumber}`,
      lastComment: lastComment ? {
        body: lastComment.body,
        createdAt: lastComment.created_at,
        url: lastComment.html_url
      } : null
    }

    console.log(`✅ Activity check complete for ${assignee.login}: ${status} (${minutesSinceActivity} min)`)

    return NextResponse.json({
      success: true,
      report: activityReport,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Error checking activity:', error)
    return NextResponse.json({ 
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
