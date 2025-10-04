import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

interface GitHubStats {
  totalRepos: number
  totalStars: number
  totalForks: number
  totalIssues: number
  totalCommits: number
  publicRepos: number
  privateRepos: number
  languages: Record<string, number>
  recentActivity: Array<{
    type: string
    repo: string
    description: string
    date: string
  }>
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's GitHub access token
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { accessToken: true, username: true }
    })

    if (!user?.accessToken) {
      return NextResponse.json({ error: 'GitHub access token not found' }, { status: 400 })
    }

    // Fetch all repositories
    const reposResponse = await fetch('https://api.github.com/user/repos?sort=updated&per_page=100', {
      headers: {
        'Authorization': `Bearer ${user.accessToken}`,
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'GitHub-Dashboard'
      }
    })

    if (!reposResponse.ok) {
      throw new Error(`GitHub API error: ${reposResponse.status}`)
    }

    const repos = await reposResponse.json()

    // Calculate stats
    const stats: GitHubStats = {
      totalRepos: repos.length,
      totalStars: repos.reduce((sum: number, repo: any) => sum + repo.stargazers_count, 0),
      totalForks: repos.reduce((sum: number, repo: any) => sum + repo.forks_count, 0),
      totalIssues: repos.reduce((sum: number, repo: any) => sum + repo.open_issues_count, 0),
      totalCommits: 0, // Will be calculated separately
      publicRepos: repos.filter((repo: any) => !repo.private).length,
      privateRepos: repos.filter((repo: any) => repo.private).length,
      languages: {},
      recentActivity: []
    }

    // Calculate language distribution
    const languageCounts: Record<string, number> = {}
    repos.forEach((repo: any) => {
      if (repo.language) {
        languageCounts[repo.language] = (languageCounts[repo.language] || 0) + 1
      }
    })
    
    // Sort languages by count and take top 10
    stats.languages = Object.entries(languageCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .reduce((acc, [lang, count]) => ({ ...acc, [lang]: count }), {})

    // Get recent repositories (sorted by creation date)
    const recentReposResponse = await fetch('https://api.github.com/user/repos?sort=created&direction=desc&per_page=10', {
      headers: {
        'Authorization': `Bearer ${user.accessToken}`,
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'GitHub-Dashboard'
      }
    })

    if (recentReposResponse.ok) {
      const recentRepos = await recentReposResponse.json()
      stats.recentActivity = recentRepos.map((repo: any) => ({
        id: repo.id,
        name: repo.name,
        full_name: repo.full_name,
        description: repo.description,
        private: repo.private,
        stargazers_count: repo.stargazers_count,
        forks_count: repo.forks_count,
        created_at: repo.created_at,
        updated_at: repo.updated_at,
        language: repo.language,
        html_url: repo.html_url
      }))
    }

    // Get commit count for each repository (simplified - using contribution graph)
    try {
      const contributionResponse = await fetch(`https://github-contributions-api.vercel.app/api/v1/${user.username}`, {
        headers: {
          'User-Agent': 'GitHub-Dashboard'
        }
      })
      
      if (contributionResponse.ok) {
        const contributionData = await contributionResponse.json()
        stats.totalCommits = contributionData.totalContributions || 0
      }
    } catch (error) {
      console.log('Could not fetch contribution data:', error)
    }

    return NextResponse.json({ stats })

  } catch (error) {
    console.error('Error fetching GitHub analytics:', error)
    return NextResponse.json(
      { error: 'Failed to fetch GitHub analytics' }, 
      { status: 500 }
    )
  }
}

function getEventDescription(event: any): string {
  switch (event.type) {
    case 'PushEvent':
      return `Pushed ${event.payload.commits?.length || 0} commit(s)`
    case 'CreateEvent':
      return `Created ${event.payload.ref_type} ${event.payload.ref}`
    case 'IssuesEvent':
      return `${event.payload.action} issue #${event.payload.issue.number}`
    case 'PullRequestEvent':
      return `${event.payload.action} pull request #${event.payload.pull_request.number}`
    case 'WatchEvent':
      return 'Starred repository'
    case 'ForkEvent':
      return 'Forked repository'
    default:
      return event.type.replace(/([A-Z])/g, ' $1').trim()
  }
}
