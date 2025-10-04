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

    // Get user's GitHub access token
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { accessToken: true, username: true }
    })

    if (!user?.accessToken) {
      return NextResponse.json({ error: 'GitHub access token not found' }, { status: 400 })
    }

    // Get query parameters
    const { searchParams } = new URL(request.url)
    const days = parseInt(searchParams.get('days') || '30')
    const repo = searchParams.get('repo')

    let commitsData: CommitData[] = []

    if (repo) {
      // Get commits for specific repository
      const [owner, repoName] = repo.split('/')
      commitsData = await getCommitsForRepo(user.accessToken, owner, repoName, days)
    } else {
      // Get commits across all repositories
      commitsData = await getCommitsForUser(user.accessToken, user.username, days)
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
    // Use GitHub Contributions API for user-wide data
    const response = await fetch(`https://github-contributions-api.vercel.app/api/v1/${username}`, {
      headers: {
        'User-Agent': 'GitHub-Dashboard'
      }
    })

    if (!response.ok) {
      throw new Error(`Contributions API error: ${response.status}`)
    }

    const data = await response.json()
    
    // Transform the data to our format
    const commits: CommitData[] = []
    const now = new Date()
    
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(now)
      date.setDate(date.getDate() - i)
      const dateStr = date.toISOString().split('T')[0]
      
      // Find contribution for this date
      const contribution = data.contributions?.find((c: any) => c.date === dateStr)
      
      commits.push({
        date: dateStr,
        commits: contribution?.contributionCount || 0,
        additions: 0, // Not available from this API
        deletions: 0  // Not available from this API
      })
    }

    return commits
  } catch (error) {
    console.error('Error fetching user commits:', error)
    // Return empty data instead of failing
    return generateEmptyCommitData(days)
  }
}

async function getCommitsForRepo(accessToken: string, owner: string, repo: string, days: number): Promise<CommitData[]> {
  try {
    const commits: CommitData[] = []
    const now = new Date()
    const since = new Date(now.getTime() - days * 24 * 60 * 60 * 1000).toISOString()

    // Get commits from the repository
    const response = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/commits?since=${since}&per_page=100`, 
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
