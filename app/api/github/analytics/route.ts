import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { validateGitHubToken } from '@/lib/github-token-utils'

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

    // Get user's GitHub access token and username
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { accessToken: true, username: true }
    })

    if (!user?.accessToken) {
      return NextResponse.json({ error: 'GitHub access token not found' }, { status: 400 })
    }

    // Validate the GitHub token
    const tokenValidation = await validateGitHubToken(user.accessToken)
    if (!tokenValidation.isValid) {
      return NextResponse.json({ 
        error: tokenValidation.error || 'Invalid GitHub token',
        needsReauth: tokenValidation.needsReauth 
      }, { status: 401 })
    }

    // Ensure username is available - fetch from GitHub if not in DB
    let username = user.username
    if (!username) {
      console.log('🔍 [DEBUG] Username is null, fetching from GitHub API')
      try {
        const githubUserResponse = await fetch('https://api.github.com/user', {
          headers: {
            'Authorization': `Bearer ${user.accessToken}`,
            'Accept': 'application/vnd.github.v3+json',
            'User-Agent': 'GitHub-Dashboard'
          }
        })
        
        if (githubUserResponse.ok) {
          const githubUser = await githubUserResponse.json()
          username = githubUser.login
          console.log('✅ [DEBUG] Fetched username from GitHub:', username)
          
          // Update the database with the username
          await prisma.user.update({
            where: { id: session.user.id },
            data: { username: username }
          })
          console.log('✅ [DEBUG] Updated username in database')
        } else {
          console.log('❌ [DEBUG] Failed to fetch GitHub user data:', githubUserResponse.status)
          return NextResponse.json({ error: 'Failed to fetch GitHub user data' }, { status: 400 })
        }
      } catch (error) {
        console.error('❌ [DEBUG] Error fetching GitHub user:', error)
        return NextResponse.json({ error: 'Failed to fetch GitHub user data' }, { status: 500 })
      }
    } else {
      console.log('✅ [DEBUG] Using existing username from database:', username)
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
      const errorText = await reposResponse.text()
      console.error('GitHub API error:', {
        status: reposResponse.status,
        statusText: reposResponse.statusText,
        error: errorText
      })
      
      if (reposResponse.status === 403) {
        throw new Error('GitHub API access forbidden. Please re-authenticate with GitHub to refresh your permissions.')
      }
      
      throw new Error(`GitHub API error: ${reposResponse.status} - ${reposResponse.statusText}`)
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

    // Get commit count for each repository (last 30 days for dashboard)
    try {
      let totalCommits = 0
      const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString() // Last 30 days
      
      console.log(`🔍 [DEBUG] Fetching commits for ${repos.length} repositories since ${since}`)
      console.log(`🔍 [DEBUG] Using username: ${username}`)
      
      // Get commits from ALL repositories (no arbitrary limits)
      for (const repo of repos) {
        try {
          // Fetch commits with pagination to get all commits, not just first 100
          let repoCommits = 0
          let page = 1
          let hasMore = true
          
          while (hasMore && page <= 10) { // Limit to 10 pages to avoid infinite loops
            const commitsResponse = await fetch(
              `https://api.github.com/repos/${repo.full_name}/commits?since=${since}&per_page=100&page=${page}&author=${username}`, 
              {
                headers: {
                  'Authorization': `Bearer ${user.accessToken}`,
                  'Accept': 'application/vnd.github.v3+json',
                  'User-Agent': 'GitHub-Dashboard'
                }
              }
            )

            if (commitsResponse.ok) {
              const commitsData = await commitsResponse.json()
              repoCommits += commitsData.length
              
              // If we got less than 100 commits, we've reached the end
              if (commitsData.length < 100) {
                hasMore = false
              } else {
                page++
              }
            } else {
              console.warn(`Failed to fetch commits from ${repo.full_name} (page ${page}):`, commitsResponse.status)
              hasMore = false
            }
          }
          
          totalCommits += repoCommits
          console.log(`📊 [DEBUG] ${repo.full_name}: ${repoCommits} commits`)
        } catch (repoError) {
          console.warn(`Failed to fetch commits from ${repo.full_name}:`, repoError)
          // Continue with other repos
        }
      }
      
      console.log(`✅ [DEBUG] Total commits across all repos: ${totalCommits}`)
      stats.totalCommits = totalCommits
    } catch (error) {
      console.log('Could not fetch contribution data:', error)
      stats.totalCommits = 0
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
