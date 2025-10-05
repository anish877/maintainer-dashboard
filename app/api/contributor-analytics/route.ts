import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const repositoryId = searchParams.get('repositoryId')
    const timeRange = searchParams.get('timeRange') || '30d' // 7d, 30d, 90d, 1y

    if (!repositoryId) {
      return NextResponse.json({ error: 'Repository ID is required' }, { status: 400 })
    }

    // Calculate date range
    const now = new Date()
    const daysBack = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : timeRange === '90d' ? 90 : 365
    const startDate = new Date(now.getTime() - (daysBack * 24 * 60 * 60 * 1000))

    // Get repository info - handle both database ID and GitHub full name
    let repository
    const repoIdStr = String(repositoryId)
    if (repoIdStr.includes('/')) {
      // If it contains '/', treat it as a GitHub full name (owner/repo)
      repository = await prisma.repository.findUnique({
        where: { fullName: repoIdStr },
        select: { id: true, fullName: true, owner: true, name: true }
      })
    } else {
      // Otherwise treat it as a database ID
      repository = await prisma.repository.findUnique({
        where: { id: repoIdStr },
        select: { id: true, fullName: true, owner: true, name: true }
      })
    }

    if (!repository) {
      return NextResponse.json({ 
        error: 'Repository not found in database. Please sync your repositories first by visiting the Repositories page.',
        code: 'REPOSITORY_NOT_FOUND'
      }, { status: 404 })
    }

    // Get contributor health data
    const contributors = await prisma.contributorHealth.findMany({
      where: { 
        repositoryId: repository.id,
        updatedAt: { gte: startDate }
      },
      include: {
        healthMetrics: {
          where: { date: { gte: startDate } },
          orderBy: { date: 'desc' }
        }
      },
      orderBy: { totalContributions: 'desc' }
    })

    // Calculate aggregate metrics
    const totalContributors = contributors.length
    const firstTimeContributors = contributors.filter(c => c.isFirstTime).length
    const atRiskContributors = contributors.filter(c => c.isAtRisk).length
    const risingStars = contributors.filter(c => c.isRisingStar).length
    
    const avgRetentionScore = contributors.length > 0 
      ? contributors.reduce((sum, c) => sum + c.retentionScore, 0) / contributors.length 
      : 0

    const avgEngagementScore = contributors.length > 0
      ? contributors.reduce((sum, c) => sum + c.engagementScore, 0) / contributors.length
      : 0

    // Geographic diversity
    const countries = [...new Set(contributors.map(c => c.country).filter(Boolean))]
    const timezones = [...new Set(contributors.map(c => c.timezone).filter(Boolean))]

    // Contribution patterns over time
    const contributionTrend = await prisma.contributorHealthMetrics.groupBy({
      by: ['date'],
      where: {
        contributor: { repositoryId: repository.id },
        date: { gte: startDate }
      },
      _sum: {
        contributionsToday: true,
        issuesToday: true,
        prsToday: true,
        commitsToday: true
      },
      orderBy: { date: 'asc' }
    })

    // Get insights
    const insights = await prisma.contributorInsight.findMany({
      where: {
        repositoryId: repository.id,
        isActive: true,
        createdAt: { gte: startDate }
      },
      include: {
        contributor: true
      },
      orderBy: { createdAt: 'desc' },
      take: 10
    })

    // Calculate health distribution
    const healthDistribution = {
      excellent: contributors.filter(c => c.retentionScore >= 80).length,
      good: contributors.filter(c => c.retentionScore >= 60 && c.retentionScore < 80).length,
      fair: contributors.filter(c => c.retentionScore >= 40 && c.retentionScore < 60).length,
      poor: contributors.filter(c => c.retentionScore < 40).length
    }

    return NextResponse.json({
      repository: {
        id: repository.id,
        fullName: repository.fullName,
        owner: repository.owner,
        name: repository.name
      },
      timeRange,
      metrics: {
        totalContributors,
        firstTimeContributors,
        atRiskContributors,
        risingStars,
        avgRetentionScore: Math.round(avgRetentionScore * 100) / 100,
        avgEngagementScore: Math.round(avgEngagementScore * 100) / 100,
        diversity: {
          countries: countries.length,
          timezones: timezones.length,
          geographicDistribution: countries
        }
      },
      healthDistribution,
      contributionTrend: contributionTrend.map(day => ({
        date: day.date,
        total: day._sum.contributionsToday || 0,
        issues: day._sum.issuesToday || 0,
        prs: day._sum.prsToday || 0,
        commits: day._sum.commitsToday || 0
      })),
      contributors: contributors.map(contributor => ({
        id: contributor.id,
        username: contributor.username,
        totalContributions: contributor.totalContributions,
        issuesCreated: contributor.issuesCreated,
        prsCreated: contributor.prsCreated,
        commitsCount: contributor.commitsCount,
        isFirstTime: contributor.isFirstTime,
        isAtRisk: contributor.isAtRisk,
        isRisingStar: contributor.isRisingStar,
        retentionScore: contributor.retentionScore,
        engagementScore: contributor.engagementScore,
        burnoutRisk: contributor.burnoutRisk,
        location: contributor.location,
        timezone: contributor.timezone,
        firstContributionAt: contributor.firstContributionAt,
        lastContributionAt: contributor.lastContributionAt,
        recentActivity: contributor.healthMetrics.slice(0, 7) // Last 7 days
      })),
      insights: insights.map(insight => ({
        id: insight.id,
        type: insight.type,
        title: insight.title,
        description: insight.description,
        severity: insight.severity,
        confidence: insight.confidence,
        contributor: insight.contributor.username,
        createdAt: insight.createdAt
      }))
    })

  } catch (error) {
    console.error('Error fetching contributor analytics:', error)
    return NextResponse.json(
      { error: 'Failed to fetch contributor analytics' }, 
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { repositoryId, action } = await request.json()

    console.log('POST request received:', { repositoryId, action, type: typeof repositoryId })

    if (!repositoryId) {
      return NextResponse.json({ error: 'Repository ID is required' }, { status: 400 })
    }

    if (action === 'analyze') {
      // Trigger contributor health analysis
      return await analyzeContributorHealth(repositoryId, session.user.id)
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })

  } catch (error) {
    console.error('Error processing contributor analytics request:', error)
    return NextResponse.json(
      { error: 'Failed to process request' }, 
      { status: 500 }
    )
  }
}

async function analyzeContributorHealth(repositoryId: string, userId: string) {
  try {
    // Get repository info - handle both database ID and GitHub full name
    let repository
    const repoIdStr = String(repositoryId)
    if (repoIdStr.includes('/')) {
      // If it contains '/', treat it as a GitHub full name (owner/repo)
      repository = await prisma.repository.findUnique({
        where: { fullName: repoIdStr },
        select: { id: true, fullName: true, owner: true, name: true }
      })
    } else {
      // Otherwise treat it as a database ID
      repository = await prisma.repository.findUnique({
        where: { id: repoIdStr },
        select: { id: true, fullName: true, owner: true, name: true }
      })
    }

    if (!repository) {
      console.log(`Repository not found for ID: ${repoIdStr}`)
      // Let's also check what repositories exist in the database
      const allRepos = await prisma.repository.findMany({
        select: { id: true, fullName: true, owner: true, name: true },
        take: 10
      })
      console.log('Available repositories:', allRepos)
      
      return NextResponse.json({ 
        error: 'Repository not found in database. Please sync your repositories first by visiting the Repositories page.',
        code: 'REPOSITORY_NOT_FOUND',
        debug: {
          searchedId: repoIdStr,
          availableRepos: allRepos.map(r => ({ id: r.id, fullName: r.fullName }))
        }
      }, { status: 404 })
    }

    console.log(`Found repository: ${repository.fullName} with ID: ${repository.id}`)

    // Get user's GitHub access token
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { accessToken: true }
    })

    if (!user?.accessToken) {
      return NextResponse.json({ error: 'GitHub access token not found' }, { status: 400 })
    }

    // Fetch contributors from GitHub API
    const [owner, repo] = repository.fullName.split('/')
    
    // Get repository contributors
    const contributorsResponse = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/contributors`,
      {
        headers: {
          'Authorization': `Bearer ${user.accessToken}`,
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'Maintainer-Dashboard'
        }
      }
    )

    if (!contributorsResponse.ok) {
      throw new Error(`GitHub API error: ${contributorsResponse.status}`)
    }

    const contributors = await contributorsResponse.json()

    // Process each contributor
    const processedContributors = []
    
    for (const contributor of contributors.slice(0, 50)) { // Limit to top 50 contributors
      try {
        // Get user details
        const userResponse = await fetch(
          `https://api.github.com/users/${contributor.login}`,
          {
            headers: {
              'Authorization': `Bearer ${user.accessToken}`,
              'Accept': 'application/vnd.github.v3+json'
            }
          }
        )

        let userDetails = null
        if (userResponse.ok) {
          userDetails = await userResponse.json()
        }

        // Calculate health metrics
        const healthData = await calculateContributorHealth(
          contributor.login,
          repositoryId,
          contributor.contributions,
          userDetails
        )

        // Upsert contributor health record
        const contributorHealth = await prisma.contributorHealth.upsert({
          where: {
            username_repositoryId: {
              username: contributor.login,
              repositoryId
            }
          },
          update: healthData,
          create: {
            username: contributor.login,
            repositoryId,
            ...healthData
          }
        })

        processedContributors.push(contributorHealth)

      } catch (error) {
        console.error(`Error processing contributor ${contributor.login}:`, error)
        // Continue with other contributors
      }
    }

    return NextResponse.json({
      message: `Successfully analyzed ${processedContributors.length} contributors`,
      contributorsAnalyzed: processedContributors.length,
      repository: repository.fullName
    })

  } catch (error) {
    console.error('Error analyzing contributor health:', error)
    throw error
  }
}

async function calculateContributorHealth(
  username: string,
  repositoryId: string,
  totalContributions: number,
  userDetails: any
) {
  // Get recent activity data
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
  
  // Count recent contributions
  const recentIssues = await prisma.issue.count({
    where: {
      repositoryId,
      authorUsername: username,
      createdAt: { gte: thirtyDaysAgo }
    }
  })

  const recentPRs = await prisma.pullRequest.count({
    where: {
      repositoryId,
      authorUsername: username,
      createdAt: { gte: thirtyDaysAgo }
    }
  })

  // Calculate health scores
  const retentionScore = Math.min(100, (totalContributions / 10) * 100) // Basic retention based on total contributions
  const engagementScore = Math.min(100, ((recentIssues + recentPRs) / 5) * 100) // Recent activity
  const burnoutRisk = Math.max(0, 100 - engagementScore) // Inverse of engagement

  // Determine health indicators
  const isFirstTime = totalContributions <= 1
  const isAtRisk = engagementScore < 20 && totalContributions > 5 // Experienced but low recent activity
  const isRisingStar = engagementScore > 80 && totalContributions < 20 // High recent activity, relatively new

  return {
    totalContributions,
    issuesCreated: recentIssues,
    prsCreated: recentPRs,
    commitsCount: Math.floor(totalContributions * 0.7), // Estimate
    commentsCount: Math.floor(totalContributions * 0.3), // Estimate
    isFirstTime,
    isAtRisk,
    isRisingStar,
    retentionScore,
    engagementScore,
    burnoutRisk,
    location: userDetails?.location || null,
    timezone: userDetails?.timezone || null,
    country: extractCountry(userDetails?.location),
    firstContributionAt: thirtyDaysAgo, // Simplified
    lastContributionAt: new Date(),
    avgTimeBetweenContributions: totalContributions > 1 ? 30 / totalContributions : null
  }
}

function extractCountry(location: string | null): string | null {
  if (!location) return null
  
  // Simple country extraction (you might want to use a more sophisticated approach)
  const commonCountries = [
    'United States', 'USA', 'US', 'Canada', 'United Kingdom', 'UK', 'Germany',
    'France', 'Japan', 'China', 'India', 'Australia', 'Brazil', 'Russia'
  ]
  
  for (const country of commonCountries) {
    if (location.toLowerCase().includes(country.toLowerCase())) {
      return country
    }
  }
  
  return location
}
