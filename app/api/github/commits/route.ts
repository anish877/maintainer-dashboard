import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

interface CommitData {
  date: string
  commits: number
  additions: number
  deletions: number
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

    // Get query parameters
    const { searchParams } = new URL(request.url)
    const days = parseInt(searchParams.get('days') || '30')
    const repo = searchParams.get('repo')

    let commitsData: CommitData[] = []

    if (repo) {
      // Get commits for specific repository
      const [owner, repoName] = repo.split('/')
      commitsData = await getCommitsForRepo(user.accessToken, username, owner, repoName, days)
    } else {
      // Get commits across all repositories
      commitsData = await getCommitsForUser(user.accessToken, username, days)
    }

    return NextResponse.json({ commits: commitsData })

  } catch (error) {
    console.error('Error fetching GitHub commits:', error)
    return NextResponse.json(
      { error: 'Failed to fetch GitHub commits' }, 
      { status: 500 }
    )
  }
}

async function getCommitsForUser(accessToken: string, username: string, days: number): Promise<CommitData[]> {
  try {
    // Get user's repositories first
    const reposResponse = await fetch(`https://api.github.com/user/repos?type=all&per_page=100&sort=updated`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'GitHub-Dashboard'
      }
    })

    if (!reposResponse.ok) {
      throw new Error(`GitHub API error: ${reposResponse.status}`)
    }

    const repos = await reposResponse.json()
    
    console.log(`🔍 [DEBUG] Fetching commits for ${repos.length} repositories since ${days} days ago`)
    console.log(`🔍 [DEBUG] Using username: ${username}`)
    
    // Get commits from all repositories
    const commits: CommitData[] = []
    const now = new Date()
    const since = new Date(now.getTime() - days * 24 * 60 * 60 * 1000).toISOString()
    
    // Group commits by date
    const commitsByDate: Record<string, any[]> = {}
    
    // Fetch commits from ALL repositories (no arbitrary limits)
    for (const repo of repos) {
      try {
        // Fetch commits with pagination to get all commits, not just first 100
        let page = 1
        let hasMore = true
        
        while (hasMore && page <= 5) { // Limit to 5 pages to avoid rate limits
          const commitsResponse = await fetch(
            `https://api.github.com/repos/${repo.full_name}/commits?since=${since}&per_page=100&page=${page}&author=${username}`, 
            {
              headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Accept': 'application/vnd.github.v3+json',
                'User-Agent': 'GitHub-Dashboard'
              }
            }
          )

          if (commitsResponse.ok) {
            const repoCommits = await commitsResponse.json()
            
            repoCommits.forEach((commit: any) => {
              const date = commit.commit.author.date.split('T')[0]
              if (!commitsByDate[date]) {
                commitsByDate[date] = []
              }
              commitsByDate[date].push(commit)
            })
            
            // If we got less than 100 commits, we've reached the end
            if (repoCommits.length < 100) {
              hasMore = false
            } else {
              page++
            }
          } else {
            console.warn(`Failed to fetch commits from ${repo.full_name} (page ${page}):`, commitsResponse.status)
            hasMore = false
          }
        }
      } catch (repoError) {
        console.warn(`Failed to fetch commits from ${repo.full_name}:`, repoError)
        // Continue with other repos
      }
    }
    
    // Generate data for each day
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(now)
      date.setDate(date.getDate() - i)
      const dateStr = date.toISOString().split('T')[0]
      
      const dayCommits = commitsByDate[dateStr] || []
      
      commits.push({
        date: dateStr,
        commits: dayCommits.length,
        additions: 0, // Would need to fetch commit details for this
        deletions: 0  // Would need to fetch commit details for this
      })
    }

    const totalCommits = commits.reduce((sum, commit) => sum + commit.commits, 0)
    console.log(`✅ [DEBUG] Total commits across all repos: ${totalCommits}`)

    return commits
  } catch (error) {
    console.error('Error fetching user commits:', error)
    // Return empty data instead of failing
    return generateEmptyCommitData(days)
  }
}

async function getCommitsForRepo(accessToken: string, username: string, owner: string, repo: string, days: number): Promise<CommitData[]> {
  try {
    const commits: CommitData[] = []
    const now = new Date()
    const since = new Date(now.getTime() - days * 24 * 60 * 60 * 1000).toISOString()

    // Get commits from the repository with username filtering
    const response = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/commits?since=${since}&per_page=100&author=${username}`, 
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'GitHub-Dashboard'
        }
      }
    )

    if (!response.ok) {
      throw new Error(`GitHub API error: ${response.status}`)
    }

    const commitsData = await response.json()

    // Group commits by date
    const commitsByDate: Record<string, any[]> = {}
    
    commitsData.forEach((commit: any) => {
      const date = commit.commit.author.date.split('T')[0]
      if (!commitsByDate[date]) {
        commitsByDate[date] = []
      }
      commitsByDate[date].push(commit)
    })

    // Generate data for each day
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(now)
      date.setDate(date.getDate() - i)
      const dateStr = date.toISOString().split('T')[0]
      
      const dayCommits = commitsByDate[dateStr] || []
      
      commits.push({
        date: dateStr,
        commits: dayCommits.length,
        additions: 0, // Would need to fetch commit details for this
        deletions: 0  // Would need to fetch commit details for this
      })
    }

    return commits
  } catch (error) {
    console.error('Error fetching repo commits:', error)
    return generateEmptyCommitData(days)
  }
}

function generateEmptyCommitData(days: number): CommitData[] {
  const commits: CommitData[] = []
  const now = new Date()
  
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(now)
    date.setDate(date.getDate() - i)
    const dateStr = date.toISOString().split('T')[0]
    
    commits.push({
      date: dateStr,
      commits: 0,
      additions: 0,
      deletions: 0
    })
  }
  
  return commits
}
