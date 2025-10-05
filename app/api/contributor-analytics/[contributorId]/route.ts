import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: NextRequest,
  { params }: { params: { contributorId: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const timeRange = searchParams.get('timeRange') || '30d'
    const { contributorId } = params

    // Calculate date range
    const now = new Date()
    const daysBack = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : timeRange === '90d' ? 90 : 365
    const startDate = new Date(now.getTime() - (daysBack * 24 * 60 * 60 * 1000))

    // Get contributor health data
    const contributor = await prisma.contributorHealth.findUnique({
      where: { id: contributorId },
      include: {
        repository: {
          select: { id: true, fullName: true, owner: true, name: true }
        },
        healthMetrics: {
          where: { date: { gte: startDate } },
          orderBy: { date: 'desc' }
        },
        insights: {
          where: { isActive: true },
          orderBy: { createdAt: 'desc' },
          take: 10
        }
      }
    })

    if (!contributor) {
      return NextResponse.json({ error: 'Contributor not found' }, { status: 404 })
    }

    // Get detailed contribution history
    const issues = await prisma.issue.findMany({
      where: {
        repositoryId: contributor.repositoryId,
        authorUsername: contributor.username,
        createdAt: { gte: startDate }
      },
      select: {
        id: true,
        number: true,
        title: true,
        state: true,
        createdAt: true,
        closedAt: true,
        labels: {
          include: { label: true }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 20
    })

    const pullRequests = await prisma.pullRequest.findMany({
      where: {
        repositoryId: contributor.repositoryId,
        authorUsername: contributor.username,
        createdAt: { gte: startDate }
      },
      select: {
        id: true,
        number: true,
        title: true,
        state: true,
        createdAt: true,
        closedAt: true,
        mergedAt: true,
        additions: true,
        deletions: true,
        changedFiles: true
      },
      orderBy: { createdAt: 'desc' },
      take: 20
    })

    // Calculate activity patterns
    const activityPattern = calculateActivityPattern(contributor.healthMetrics)
    
    // Calculate contribution quality metrics
    const qualityMetrics = {
      avgPRSize: pullRequests.length > 0 
        ? pullRequests.reduce((sum, pr) => sum + (pr.additions + pr.deletions), 0) / pullRequests.length 
        : 0,
      mergeRate: pullRequests.length > 0 
        ? pullRequests.filter(pr => pr.mergedAt).length / pullRequests.length 
        : 0,
      avgIssueResolutionTime: issues.length > 0 
        ? calculateAvgResolutionTime(issues) 
        : 0
    }

    // Generate insights
    const generatedInsights = generateContributorInsights(contributor, issues, pullRequests)

    return NextResponse.json({
      contributor: {
        id: contributor.id,
        username: contributor.username,
        totalContributions: contributor.totalContributions,
        issuesCreated: contributor.issuesCreated,
        prsCreated: contributor.prsCreated,
        commitsCount: contributor.commitsCount,
        commentsCount: contributor.commentsCount,
        isFirstTime: contributor.isFirstTime,
        isAtRisk: contributor.isAtRisk,
        isRisingStar: contributor.isRisingStar,
        retentionScore: contributor.retentionScore,
        engagementScore: contributor.engagementScore,
        burnoutRisk: contributor.burnoutRisk,
        location: contributor.location,
        timezone: contributor.timezone,
        country: contributor.country,
        firstContributionAt: contributor.firstContributionAt,
        lastContributionAt: contributor.lastContributionAt,
        avgTimeBetweenContributions: contributor.avgTimeBetweenContributions,
        contributionPattern: contributor.contributionPattern,
        dayOfWeekPattern: contributor.dayOfWeekPattern,
        avgResponseTime: contributor.avgResponseTime,
        codeReviewScore: contributor.codeReviewScore,
        collaborationScore: contributor.collaborationScore,
        contributionStreak: contributor.contributionStreak,
        longestStreak: contributor.longestStreak,
        decliningActivity: contributor.decliningActivity,
        longAbsence: contributor.longAbsence,
        negativeFeedback: contributor.negativeFeedback
      },
      repository: contributor.repository,
      timeRange,
      activityPattern,
      qualityMetrics,
      recentActivity: {
        issues: issues.map(issue => ({
          id: issue.id,
          number: issue.number,
          title: issue.title,
          state: issue.state,
          createdAt: issue.createdAt,
          closedAt: issue.closedAt,
          labels: issue.labels.map(il => il.label.name)
        })),
        pullRequests: pullRequests.map(pr => ({
          id: pr.id,
          number: pr.number,
          title: pr.title,
          state: pr.state,
          createdAt: pr.createdAt,
          closedAt: pr.closedAt,
          mergedAt: pr.mergedAt,
          additions: pr.additions,
          deletions: pr.deletions,
          changedFiles: pr.changedFiles
        }))
      },
      healthMetrics: contributor.healthMetrics.map(metric => ({
        id: metric.id,
        date: metric.date,
        contributionsToday: metric.contributionsToday,
        issuesToday: metric.issuesToday,
        prsToday: metric.prsToday,
        commitsToday: metric.commitsToday,
        commentsToday: metric.commentsToday,
        contributionsThisWeek: metric.contributionsThisWeek,
        contributionsThisMonth: metric.contributionsThisMonth,
        monthlyGrowthRate: metric.monthlyGrowthRate,
        dailyHealthScore: metric.dailyHealthScore,
        engagementLevel: metric.engagementLevel,
        activeHours: metric.activeHours,
        mostActiveDay: metric.mostActiveDay
      })),
      insights: [
        ...contributor.insights.map(insight => ({
          id: insight.id,
          type: insight.type,
          title: insight.title,
          description: insight.description,
          severity: insight.severity,
          confidence: insight.confidence,
          createdAt: insight.createdAt
        })),
        ...generatedInsights
      ]
    })

  } catch (error) {
    console.error('Error fetching contributor details:', error)
    return NextResponse.json(
      { error: 'Failed to fetch contributor details' }, 
      { status: 500 }
    )
  }
}

function calculateActivityPattern(metrics: any[]) {
  if (metrics.length === 0) return null

  const hoursPattern: { [key: string]: number } = {}
  const daysPattern: { [key: string]: number } = {}

  metrics.forEach(metric => {
    // Aggregate active hours
    if (metric.activeHours) {
      Object.entries(metric.activeHours as object).forEach(([hour, count]) => {
        hoursPattern[hour] = (hoursPattern[hour] || 0) + (count as number)
      })
    }

    // Aggregate days of week
    const dayName = new Date(metric.date).toLocaleDateString('en-US', { weekday: 'long' })
    daysPattern[dayName] = (daysPattern[dayName] || 0) + metric.contributionsToday
  })

  return {
    hours: hoursPattern,
    days: daysPattern,
    mostActiveHour: Object.keys(hoursPattern).reduce((a, b) => 
      hoursPattern[a] > hoursPattern[b] ? a : b, '0'
    ),
    mostActiveDay: Object.keys(daysPattern).reduce((a, b) => 
      daysPattern[a] > daysPattern[b] ? a : b, 'Monday'
    )
  }
}

function calculateAvgResolutionTime(issues: any[]): number {
  const resolvedIssues = issues.filter(issue => issue.closedAt)
  if (resolvedIssues.length === 0) return 0

  const totalTime = resolvedIssues.reduce((sum, issue) => {
    const created = new Date(issue.createdAt)
    const closed = new Date(issue.closedAt)
    return sum + (closed.getTime() - created.getTime())
  }, 0)

  return totalTime / (resolvedIssues.length * (24 * 60 * 60 * 1000)) // Convert to days
}

function generateContributorInsights(contributor: any, issues: any[], pullRequests: any[]): any[] {
  const insights = []

  // Rising star insight
  if (contributor.isRisingStar) {
    insights.push({
      id: `rising-star-${contributor.id}`,
      type: 'RISING_STAR',
      title: 'Rising Star Contributor',
      description: `${contributor.username} shows excellent engagement with high recent activity. Consider recognizing their contributions.`,
      severity: 'SUCCESS',
      confidence: 85
    })
  }

  // At-risk insight
  if (contributor.isAtRisk) {
    insights.push({
      id: `at-risk-${contributor.id}`,
      type: 'AT_RISK',
      title: 'Contributor at Risk',
      description: `${contributor.username} has been less active recently despite previous contributions. Consider reaching out.`,
      severity: 'WARNING',
      confidence: 75
    })
  }

  // First-time contributor insight
  if (contributor.isFirstTime) {
    insights.push({
      id: `first-time-${contributor.id}`,
      type: 'FIRST_TIME_CONTRIBUTOR',
      title: 'First-time Contributor',
      description: `Welcome ${contributor.username}! This is their first contribution to the project.`,
      severity: 'INFO',
      confidence: 100
    })
  }

  // High performer insight
  if (contributor.engagementScore > 90) {
    insights.push({
      id: `high-performer-${contributor.id}`,
      type: 'HIGH_PERFORMER',
      title: 'High Performer',
      description: `${contributor.username} demonstrates exceptional engagement and contribution quality.`,
      severity: 'SUCCESS',
      confidence: 90
    })
  }

  // Burnout warning
  if (contributor.burnoutRisk > 70) {
    insights.push({
      id: `burnout-warning-${contributor.id}`,
      type: 'BURNOUT_WARNING',
      title: 'Burnout Risk Detected',
      description: `${contributor.username} may be at risk of burnout. Consider checking in on their wellbeing.`,
      severity: 'WARNING',
      confidence: 80
    })
  }

  return insights
}
