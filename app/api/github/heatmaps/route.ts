import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    console.log('🔍 [HEATMAPS DEBUG] Starting POST /api/github/heatmaps')
    
    const session = await getServerSession(authOptions)
    console.log('🔍 [HEATMAPS DEBUG] Session check:', { 
      hasSession: !!session, 
      hasUser: !!session?.user, 
      userId: session?.user?.id 
    })
    
    if (!session?.user?.id) {
      console.log('❌ [HEATMAPS DEBUG] Authentication failed - no session or user ID')
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    // Get user's GitHub access token from database
    console.log('🔍 [HEATMAPS DEBUG] Fetching user from database:', { userId: session.user.id })
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { accessToken: true }
    })
    console.log('🔍 [HEATMAPS DEBUG] User data:', { 
      hasUser: !!user, 
      hasAccessToken: !!user?.accessToken 
    })

    if (!user?.accessToken) {
      console.log('❌ [HEATMAPS DEBUG] GitHub access token not found for user')
      return NextResponse.json({ error: 'GitHub access token not found' }, { status: 400 })
    }

    const { owner, repo, period } = await request.json()
    console.log('🔍 [HEATMAPS DEBUG] Request parameters:', { owner, repo, period })

    if (!owner || !repo) {
      console.log('❌ [HEATMAPS DEBUG] Missing required parameters')
      return NextResponse.json({ error: 'Owner and repo are required' }, { status: 400 })
    }

    // Calculate date range based on period
    const endDate = new Date()
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - parseInt(period))
    
    console.log('🔍 [HEATMAPS DEBUG] Date range:', {
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      period: `${period} days`
    })

    // Fetch contribution data from GitHub API
    const commitsUrl = `https://api.github.com/repos/${owner}/${repo}/commits?since=${startDate.toISOString()}&until=${endDate.toISOString()}`
    const issuesUrl = `https://api.github.com/repos/${owner}/${repo}/issues?since=${startDate.toISOString()}&state=all`
    const prsUrl = `https://api.github.com/repos/${owner}/${repo}/pulls?since=${startDate.toISOString()}&state=all`
    
    console.log('🔍 [HEATMAPS DEBUG] GitHub API URLs:', {
      commitsUrl,
      issuesUrl,
      prsUrl,
      hasToken: !!user.accessToken
    })
    
    console.log('🔍 [HEATMAPS DEBUG] Making GitHub API requests...')
    const [commitsResponse, issuesResponse, prsResponse] = await Promise.all([
      // Get commits
      fetch(commitsUrl, {
        headers: {
          'Authorization': `Bearer ${user.accessToken}`,
          'Accept': 'application/vnd.github.v3+json',
        },
      }),
      // Get issues
      fetch(issuesUrl, {
        headers: {
          'Authorization': `Bearer ${user.accessToken}`,
          'Accept': 'application/vnd.github.v3+json',
        },
      }),
      // Get pull requests
      fetch(prsUrl, {
        headers: {
          'Authorization': `Bearer ${user.accessToken}`,
          'Accept': 'application/vnd.github.v3+json',
        },
      }),
    ])

    // Log API response statuses
    console.log('🔍 [HEATMAPS DEBUG] API response statuses:', {
      commits: { status: commitsResponse.status, ok: commitsResponse.ok },
      issues: { status: issuesResponse.status, ok: issuesResponse.ok },
      prs: { status: prsResponse.status, ok: prsResponse.ok }
    })

    // Check for API errors before parsing responses
    if (!commitsResponse.ok || !issuesResponse.ok || !prsResponse.ok) {
      const errors = []
      if (!commitsResponse.ok) errors.push(`Commits API: ${commitsResponse.status}`)
      if (!issuesResponse.ok) errors.push(`Issues API: ${issuesResponse.status}`)
      if (!prsResponse.ok) errors.push(`PRs API: ${prsResponse.status}`)
      
      console.error('❌ [HEATMAPS DEBUG] GitHub API errors:', errors)
      
      // Log detailed error information
      if (!commitsResponse.ok) {
        console.log('❌ [HEATMAPS DEBUG] Commits API error details:', {
          status: commitsResponse.status,
          statusText: commitsResponse.statusText,
          url: commitsUrl
        })
      }
      if (!issuesResponse.ok) {
        console.log('❌ [HEATMAPS DEBUG] Issues API error details:', {
          status: issuesResponse.status,
          statusText: issuesResponse.statusText,
          url: issuesUrl
        })
      }
      if (!prsResponse.ok) {
        console.log('❌ [HEATMAPS DEBUG] PRs API error details:', {
          status: prsResponse.status,
          statusText: prsResponse.statusText,
          url: prsUrl
        })
      }
      
      if (commitsResponse.status === 403 || issuesResponse.status === 403 || prsResponse.status === 403) {
        console.log('❌ [HEATMAPS DEBUG] Returning 403 - Access denied')
        return NextResponse.json({ 
          error: 'Access denied. The repository may be private or your GitHub token may have expired. Please sign out and sign back in to refresh your token.' 
        }, { status: 403 })
      }
      
      if (commitsResponse.status === 404 || issuesResponse.status === 404 || prsResponse.status === 404) {
        console.log('❌ [HEATMAPS DEBUG] Returning 404 - Repository not found')
        return NextResponse.json({ 
          error: 'Repository not found or not accessible. Please check the repository name and ensure you have access to it.' 
        }, { status: 404 })
      }
      
      console.log('❌ [HEATMAPS DEBUG] Returning 500 - Other API errors')
      return NextResponse.json({ 
        error: `GitHub API errors: ${errors.join(', ')}` 
      }, { status: 500 })
    }

    console.log('✅ [HEATMAPS DEBUG] All API calls successful, parsing responses...')
    const [commits, issues, prs] = await Promise.all([
      commitsResponse.json(),
      issuesResponse.json(),
      prsResponse.json(),
    ])

    // Handle empty responses
    const safeCommits = Array.isArray(commits) ? commits : []
    const safeIssues = Array.isArray(issues) ? issues : []
    const safePRs = Array.isArray(prs) ? prs : []

    console.log('🔍 [HEATMAPS DEBUG] Data summary:', {
      commitsCount: safeCommits.length,
      issuesCount: safeIssues.length,
      prsCount: safePRs.length,
      commitsIsArray: Array.isArray(commits),
      issuesIsArray: Array.isArray(issues),
      prsIsArray: Array.isArray(prs)
    })

    console.log('🔍 [HEATMAPS DEBUG] Processing data...')
    // Process time of day activity
    const timeOfDayActivity = processTimeOfDayActivity(safeCommits, safeIssues, safePRs)
    
    // Process geographic distribution (simplified - using timezone data)
    const geographicDistribution = processGeographicDistribution(safeCommits, safeIssues, safePRs)
    
    // Process busiest days/weeks
    const busiestDays = processBusiestDays(safeCommits, safeIssues, safePRs)
    
    // Process response time metrics
    const responseMetrics = processResponseMetrics(safeIssues, safePRs)

    const responseData = {
      repository: `${owner}/${repo}`,
      period: `${period} days`,
      timeOfDayActivity,
      geographicDistribution,
      busiestDays,
      responseMetrics,
      summary: {
        totalCommits: safeCommits.length,
        totalIssues: safeIssues.length,
        totalPullRequests: safePRs.length,
        period: `${period} days`,
      },
    }

    console.log('✅ [HEATMAPS DEBUG] Successfully processed data, returning response:', {
      repository: responseData.repository,
      period: responseData.period,
      summary: responseData.summary
    })

    return NextResponse.json(responseData)

  } catch (error) {
    console.error('❌ [HEATMAPS DEBUG] Unexpected error:', error)
    console.error('❌ [HEATMAPS DEBUG] Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      name: error instanceof Error ? error.name : undefined
    })
    return NextResponse.json(
      { error: 'Failed to fetch heatmap data' },
      { status: 500 }
    )
  }
}

function processTimeOfDayActivity(commits: any[], issues: any[], prs: any[]) {
  const hourlyActivity = Array.from({ length: 24 }, () => 0)
  
  // Process commits
  commits.forEach((commit: any) => {
    const date = new Date(commit.commit.author.date)
    hourlyActivity[date.getUTCHours()]++
  })
  
  // Process issues
  issues.forEach((issue: any) => {
    const date = new Date(issue.created_at)
    hourlyActivity[date.getUTCHours()]++
  })
  
  // Process PRs
  prs.forEach((pr: any) => {
    const date = new Date(pr.created_at)
    hourlyActivity[date.getUTCHours()]++
  })
  
  return {
    hourlyData: hourlyActivity.map((count, hour) => ({
      hour: hour,
      count: count,
      label: `${hour}:00 UTC`
    })),
    peakHour: hourlyActivity.indexOf(Math.max(...hourlyActivity)),
    totalActivity: hourlyActivity.reduce((sum, count) => sum + count, 0)
  }
}

function processGeographicDistribution(commits: any[], issues: any[], prs: any[]) {
  // Simplified geographic distribution based on timezone patterns
  const timezones = {
    'Americas': 0,
    'Europe': 0,
    'Asia': 0,
    'Other': 0
  }
  
  const allActivities = [
    ...commits.map((c: any) => new Date(c.commit.author.date)),
    ...issues.map((i: any) => new Date(i.created_at)),
    ...prs.map((p: any) => new Date(p.created_at))
  ]
  
  allActivities.forEach((date: Date) => {
    const hour = date.getUTCHours()
    if (hour >= 5 && hour < 13) {
      timezones['Americas']++
    } else if (hour >= 13 && hour < 21) {
      timezones['Europe']++
    } else if (hour >= 21 || hour < 5) {
      timezones['Asia']++
    } else {
      timezones['Other']++
    }
  })
  
  return Object.entries(timezones).map(([region, count]) => ({
    region,
    count,
    percentage: allActivities.length > 0 ? Math.round((count / allActivities.length) * 100) : 0
  }))
}

function processBusiestDays(commits: any[], issues: any[], prs: any[]) {
  const dailyActivity = Array.from({ length: 7 }, () => 0)
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
  
  const allActivities = [
    ...commits.map((c: any) => new Date(c.commit.author.date)),
    ...issues.map((i: any) => new Date(i.created_at)),
    ...prs.map((p: any) => new Date(p.created_at))
  ]
  
  allActivities.forEach((date: Date) => {
    dailyActivity[date.getDay()]++
  })
  
  return dailyActivity.map((count, day) => ({
    day: day,
    dayName: dayNames[day],
    count: count,
    percentage: allActivities.length > 0 ? Math.round((count / allActivities.length) * 100) : 0
  }))
}

function processResponseMetrics(issues: any[], prs: any[]) {
  // Calculate average response times for issues and PRs
  let totalIssueResponseTime = 0
  let totalPRResponseTime = 0
  let respondedIssues = 0
  let respondedPRs = 0
  
  issues.forEach((issue: any) => {
    if (issue.comments > 0) {
      // Simplified: assume first response within 24 hours for demo
      totalIssueResponseTime += 2 // hours
      respondedIssues++
    }
  })
  
  prs.forEach((pr: any) => {
    if (pr.comments > 0) {
      totalPRResponseTime += 4 // hours
      respondedPRs++
    }
  })
  
  return {
    issues: {
      averageResponseTime: respondedIssues > 0 ? Math.round(totalIssueResponseTime / respondedIssues * 10) / 10 : 0,
      respondedCount: respondedIssues,
      totalCount: issues.length,
      responseRate: issues.length > 0 ? Math.round((respondedIssues / issues.length) * 100) : 0
    },
    pullRequests: {
      averageResponseTime: respondedPRs > 0 ? Math.round(totalPRResponseTime / respondedPRs * 10) / 10 : 0,
      respondedCount: respondedPRs,
      totalCount: prs.length,
      responseRate: prs.length > 0 ? Math.round((respondedPRs / prs.length) * 100) : 0
    }
  }
}
