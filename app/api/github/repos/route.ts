import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    // Get the current session
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's GitHub access token from database
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { 
        accessToken: true, 
        githubId: true,
        username: true 
      }
    })

    if (!user?.accessToken) {
      return NextResponse.json({ error: 'GitHub access token not found' }, { status: 400 })
    }

    // Fetch all repositories from GitHub API with pagination
    let allRepos: any[] = []
    let page = 1
    const perPage = 100
    
    while (true) {
      const githubResponse = await fetch(`https://api.github.com/user/repos?sort=updated&per_page=${perPage}&page=${page}`, {
        headers: {
          'Authorization': `Bearer ${user.accessToken}`,
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'Maintainer-Dashboard'
        }
      })

      if (!githubResponse.ok) {
        throw new Error(`GitHub API error: ${githubResponse.status}`)
      }

      const pageRepos = await githubResponse.json()
      
      // If no more repos, break the loop
      if (pageRepos.length === 0) {
        break
      }
      
      allRepos = allRepos.concat(pageRepos)
      
      // If we got less than perPage, we've reached the end
      if (pageRepos.length < perPage) {
        break
      }
      
      page++
      
      // Safety limit to prevent infinite loops (max 50 pages = 5000 repos)
      if (page > 50) {
        break
      }
    }

    const githubRepos = allRepos

    // Transform GitHub data to our format
    const repos = githubRepos.map((repo: any) => ({
      id: repo.id,
      name: repo.name,
      fullName: repo.full_name,
      description: repo.description || 'No description available',
      owner: repo.owner.login,
      stars: repo.stargazers_count,
      language: repo.language || 'Unknown',
      visibility: repo.private ? 'Private' : 'Public',
      createdAt: repo.created_at,
      updatedAt: repo.updated_at,
      cloneUrl: repo.clone_url,
      htmlUrl: repo.html_url,
      defaultBranch: repo.default_branch,
      forks: repo.forks_count,
      openIssues: repo.open_issues_count,
      size: repo.size,
      archived: repo.archived,
      disabled: repo.disabled,
      fork: repo.fork
    }))

    return NextResponse.json({ repos })

  } catch (error) {
    console.error('Error fetching GitHub repositories:', error)
    return NextResponse.json(
      { error: 'Failed to fetch repositories' }, 
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

    const { repoIds } = await request.json()

    if (!Array.isArray(repoIds)) {
      return NextResponse.json({ error: 'Invalid repository IDs' }, { status: 400 })
    }

    // Here you can add logic to save selected repositories to your database
    // For now, we'll just return success
    console.log('Selected repository IDs:', repoIds)

    return NextResponse.json({ message: 'Repositories selected successfully' })

  } catch (error) {
    console.error('Error selecting repositories:', error)
    return NextResponse.json(
      { error: 'Failed to select repositories' }, 
      { status: 500 }
    )
  }
}
