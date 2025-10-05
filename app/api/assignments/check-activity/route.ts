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
    
    // Determine last activity (will be updated after checking fork activity)
    let lastActivityAt = lastCommentTime && lastCommentTime > issueUpdatedAt 
      ? lastCommentTime 
      : issueUpdatedAt

    // Calculate initial time differences (will be updated after fork check)
    const minutesSinceActivity = Math.floor((now.getTime() - lastActivityAt.getTime()) / (1000 * 60))
    const minutesSinceAssignment = Math.floor((now.getTime() - issueCreatedAt.getTime()) / (1000 * 60))
    const hoursSinceActivity = Math.floor(minutesSinceActivity / 60)
    const daysSinceActivity = Math.floor(hoursSinceActivity / 24)

    // Get recent commits from main repository
    let recentCommits: Array<{
      sha: string
      message: string
      date: string
      url: string
      source: 'main' | 'fork'
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
        url: commit.html_url,
        source: 'main' as const
      }))
    } catch (error) {
      console.log('Could not fetch commits from main repo:', error instanceof Error ? error.message : 'Unknown error')
    }

    // 🔍 NEW: Check for fork activity
    let forkCommits: Array<{
      sha: string
      message: string
      date: string
      url: string
      source: 'fork'
      forkName: string
    }> = []
    let forkActivity = {
      hasFork: false,
      forkName: '',
      forkUrl: '',
      lastForkCommit: null as any,
      totalForkCommits: 0
    }

    try {
      console.log(`🔍 Checking for forks by ${assignee.login}...`)
      
      // Get all forks of the repository
      const { data: forks } = await octokit.rest.repos.listForks({
        owner,
        repo,
        per_page: 100
      })

      // Find fork owned by the assignee
      const assigneeFork = forks.find(fork => fork.owner.login === assignee.login)
      
      if (assigneeFork) {
        console.log(`✅ Found fork: ${assigneeFork.full_name}`)
        forkActivity.hasFork = true
        forkActivity.forkName = assigneeFork.full_name
        forkActivity.forkUrl = assigneeFork.html_url

        // Get commits from the fork since last activity
        const { data: forkCommitsData } = await octokit.rest.repos.listCommits({
          owner: assigneeFork.owner.login,
          repo: assigneeFork.name,
          author: assignee.login,
          since: lastActivityAt.toISOString(),
          per_page: 10
        })

        // Get total commits from the fork (not filtered by time)
        const { data: totalForkCommitsData } = await octokit.rest.repos.listCommits({
          owner: assigneeFork.owner.login,
          repo: assigneeFork.name,
          author: assignee.login,
          per_page: 100
        })

        forkCommits = forkCommitsData.map(commit => ({
          sha: commit.sha,
          message: commit.commit.message,
          date: commit.commit.author?.date || new Date().toISOString(),
          url: commit.html_url,
          source: 'fork' as const,
          forkName: assigneeFork.full_name
        }))

        forkActivity.totalForkCommits = totalForkCommitsData.length
        forkActivity.lastForkCommit = forkCommitsData[0] || null

        console.log(`📊 Found ${forkCommitsData.length} commits in fork since ${lastActivityAt.toISOString()}`)
        console.log(`📊 Total commits in fork: ${totalForkCommitsData.length}`)
      } else {
        console.log(`❌ No fork found for ${assignee.login}`)
      }
    } catch (error) {
      console.log('Could not check fork activity:', error instanceof Error ? error.message : 'Unknown error')
    }

    // Combine main repo and fork commits
    const allCommits = [...recentCommits, ...forkCommits].sort((a, b) => 
      new Date(b.date).getTime() - new Date(a.date).getTime()
    )

    // 🔄 Update last activity if fork has more recent commits
    if (forkCommits.length > 0) {
      const latestForkCommit = forkCommits[0]
      const forkCommitTime = new Date(latestForkCommit.date)
      
      if (forkCommitTime > lastActivityAt) {
        console.log(`🔄 Updating last activity from fork: ${forkCommitTime.toISOString()}`)
        lastActivityAt = forkCommitTime
      }
    }

    // Recalculate time differences with updated lastActivityAt
    const updatedMinutesSinceActivity = Math.floor((now.getTime() - lastActivityAt.getTime()) / (1000 * 60))
    const updatedHoursSinceActivity = Math.floor(updatedMinutesSinceActivity / 60)
    const updatedDaysSinceActivity = Math.floor(updatedHoursSinceActivity / 24)

    // Determine status and recommendations using updated time
    let status = 'ACTIVE'
    let recommendation = 'Continue monitoring'
    let urgency = 'low'
    let message = ''

    if (updatedMinutesSinceActivity >= 6) {
      status = 'CRITICAL'
      recommendation = 'Consider removing from issue'
      urgency = 'critical'
      message = `🚨 Critical: ${updatedMinutesSinceActivity} minutes (${updatedHoursSinceActivity}h) since last activity`
    } else if (updatedMinutesSinceActivity >= 5) {
      status = 'ALERT'
      recommendation = 'Send final warning'
      urgency = 'high'
      message = `⚠️ Alert: ${updatedMinutesSinceActivity} minutes since last activity`
    } else if (updatedMinutesSinceActivity >= 3) {
      status = 'WARNING'
      recommendation = 'Send gentle reminder'
      urgency = 'medium'
      message = `🔔 Warning: ${updatedMinutesSinceActivity} minutes since last activity`
    } else if (updatedMinutesSinceActivity >= 2) {
      status = 'ACTIVE'
      recommendation = 'Normal activity'
      urgency = 'low'
      message = `✅ Active: ${updatedMinutesSinceActivity} minutes since last activity`
    } else {
      status = 'VERY_ACTIVE'
      recommendation = 'Very recent activity'
      urgency = 'low'
      message = `🔥 Very Active: Just ${updatedMinutesSinceActivity} minutes ago`
    }

    // Add fork activity context to message
    if (forkActivity.hasFork && forkCommits.length > 0) {
      message += ` (${forkCommits.length} commits in fork)`
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
        minutesSinceActivity: updatedMinutesSinceActivity,
        minutesSinceAssignment,
        hoursSinceActivity: updatedHoursSinceActivity,
        daysSinceActivity: updatedDaysSinceActivity
      },
      status,
      recommendation,
      urgency,
      message,
      recentCommits: allCommits,
      forkActivity,
      issueUrl: `https://github.com/${owner}/${repo}/issues/${issueNumber}`,
      lastComment: lastComment ? {
        body: lastComment.body,
        createdAt: lastComment.created_at,
        url: lastComment.html_url
      } : null
    }

    console.log(`✅ Activity check complete for ${assignee.login}: ${status} (${updatedMinutesSinceActivity} min)`)

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
