import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { StaleIssueResolver } from '@/lib/services/stale-issue-resolver'

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Stale issues API called')
    
    // Check authentication
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    // Get user's GitHub access token
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { accessToken: true, username: true }
    })

    if (!user?.accessToken) {
      return NextResponse.json({ error: 'GitHub access token required' }, { status: 401 })
    }

    // Get query parameters
    const { searchParams } = new URL(request.url)
    const repo = searchParams.get('repo')
    const days = parseInt(searchParams.get('days') || '30')

    if (!repo) {
      return NextResponse.json({ error: 'Repository parameter is required' }, { status: 400 })
    }

    console.log(`🔍 Scanning stale issues for ${repo} (${days}+ days old)`)

    // Initialize stale issue resolver
    const staleResolver = new StaleIssueResolver(user.accessToken)
    
    // Detect stale issues
    const staleIssues = await staleResolver.detectStaleIssues(repo, days)
    
    // Create cleanup queue
    const cleanupQueue = await staleResolver.createCleanupQueue(staleIssues)

    return NextResponse.json({
      success: true,
      repository: repo,
      daysThreshold: days,
      staleIssues: staleIssues.length,
      cleanupQueue: cleanupQueue,
      summary: {
        total: staleIssues.length,
        byPriority: {
          critical: staleIssues.filter(i => i.analysis.cleanupPriority === 'critical').length,
          high: staleIssues.filter(i => i.analysis.cleanupPriority === 'high').length,
          medium: staleIssues.filter(i => i.analysis.cleanupPriority === 'medium').length,
          low: staleIssues.filter(i => i.analysis.cleanupPriority === 'low').length
        },
        byAction: {
          close: staleIssues.filter(i => i.analysis.suggestedAction === 'close').length,
          comment: staleIssues.filter(i => i.analysis.suggestedAction === 'comment').length,
          wait: staleIssues.filter(i => i.analysis.suggestedAction === 'wait').length,
          escalate: staleIssues.filter(i => i.analysis.suggestedAction === 'escalate').length
        }
      }
    })

  } catch (error) {
    console.error('❌ Error in stale issues API:', error)
    return NextResponse.json({
      error: 'Failed to fetch stale issues',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log('🔧 Stale issues action API called')
    
    // Check authentication
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    // Get user's GitHub access token
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { accessToken: true, username: true }
    })

    if (!user?.accessToken) {
      return NextResponse.json({ error: 'GitHub access token required' }, { status: 401 })
    }

    const body = await request.json()
    const { action, repository, issueNumber, analysis } = body

    console.log(`🔧 Processing stale issue action: ${action} for issue #${issueNumber}`)
    console.log(`📤 Request body:`, { action, repository, issueNumber, analysis: analysis ? 'present' : 'missing' })

    // Initialize stale issue resolver
    const staleResolver = new StaleIssueResolver(user.accessToken)

    let result: { success: boolean; message: string; data?: any } = { success: false, message: '' }

    switch (action) {
      case 'comment':
        // Get issue details first
        const [owner, repo] = repository.split('/')
        const { data: issue } = await staleResolver['octokit'].rest.issues.get({
          owner,
          repo,
          issue_number: issueNumber
        })
        
        result.success = await staleResolver.commentOnStaleIssue(issue, analysis, repository)
        result.message = result.success ? 'Comment posted successfully' : 'Failed to post comment'
        break

      case 'close':
        // Get issue details first
        const [owner2, repo2] = repository.split('/')
        const { data: issue2 } = await staleResolver['octokit'].rest.issues.get({
          owner: owner2,
          repo: repo2,
          issue_number: issueNumber
        })
        
        result.success = await staleResolver.closeStaleIssue(issue2, analysis, repository)
        result.message = result.success ? 'Issue closed successfully' : 'Failed to close issue'
        break

      case 'remove':
        // Remove issue from stale detection (just return success)
        console.log(`🗑️ Remove action for issue #${issueNumber} in ${repository}`)
        result.success = true
        result.message = 'Issue removed from stale detection'
        console.log(`✅ Remove result:`, result)
        break

      case 'delete':
        // Actually delete the issue from GitHub
        console.log(`🗑️ Delete action for issue #${issueNumber} in ${repository}`)
        const [owner3, repo3] = repository.split('/')
        const { data: issue3 } = await staleResolver['octokit'].rest.issues.get({
          owner: owner3,
          repo: repo3,
          issue_number: issueNumber
        })
        
        result.success = await staleResolver.deleteStaleIssue(issue3, repository)
        result.message = result.success ? 'Issue deleted from GitHub' : 'Failed to delete issue'
        console.log(`✅ Delete result:`, result)
        break

      case 'scan':
        const staleIssues = await staleResolver.detectStaleIssues(repository, 30)
        const cleanupQueue = await staleResolver.createCleanupQueue(staleIssues)
        
        result.success = true
        result.message = `Found ${staleIssues.length} stale issues`
        result.data = { staleIssues, cleanupQueue }
        break

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

    console.log(`📤 Returning result for ${action}:`, {
      success: result.success,
      message: result.message,
      action,
      repository,
      issueNumber
    })
    
    return NextResponse.json({
      success: result.success,
      message: result.message,
      action,
      repository,
      issueNumber,
      data: result.data
    })

  } catch (error) {
    console.error('❌ Error in stale issues action:', error)
    return NextResponse.json({
      error: 'Failed to process stale issue action',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
