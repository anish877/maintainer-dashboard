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

    // Fetch repositories from GitHub API with pagination (optimized for faster loading)
    let allRepos: any[] = []
    let page = 1
    const perPage = 30 // Reduced from 100 to 30 for faster loading
    const maxPages = 5 // Limit to first 5 pages (150 repos max) for faster loading
    
    while (page <= maxPages) {
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

    // Save repositories to database
    const savedRepos = []
    for (const repo of repos) {
      try {
        const savedRepo = await prisma.repository.upsert({
          where: { githubId: repo.id },
          update: {
            name: repo.name,
            fullName: repo.fullName,
            description: repo.description,
            owner: repo.owner,
            stars: repo.stars,
            language: repo.language,
            isPrivate: repo.visibility === 'Private',
            defaultBranch: repo.defaultBranch,
            forks: repo.forks,
            lastSyncedAt: new Date()
          },
          create: {
            githubId: repo.id,
            name: repo.name,
            fullName: repo.fullName,
            description: repo.description,
            owner: repo.owner,
            stars: repo.stars,
            language: repo.language,
            isPrivate: repo.visibility === 'Private',
            defaultBranch: repo.defaultBranch,
            forks: repo.forks,
            ownerId: session.user.id,
            lastSyncedAt: new Date()
          }
        })
        savedRepos.push(savedRepo)
      } catch (error) {
        console.error(`Error saving repository ${repo.fullName}:`, error)
        // Continue with other repositories even if one fails
      }
    }

    return NextResponse.json({ 
      repos,
      savedCount: savedRepos.length,
      totalCount: repos.length,
      message: `Successfully synced ${savedRepos.length} repositories to database (showing most recent ${repos.length} repositories for faster loading)`,
      note: repos.length >= 150 ? 'Showing first 150 repositories sorted by most recent updates. Use the search functionality to find specific repositories.' : null
    })

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
