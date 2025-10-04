import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ repoName: string }> }
) {
  try {
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
      return NextResponse.json({ error: 'GitHub access token not found' }, { status: 400 })
    }

    const { repoName } = await params

    // Get the repository data from GitHub
    const response = await fetch(`https://api.github.com/repos/${user.username}/${repoName}`, {
      headers: {
        'Authorization': `Bearer ${user.accessToken}`,
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'GitHub-Dashboard'
      }
    })

    if (!response.ok) {
      if (response.status === 404) {
        return NextResponse.json({ error: 'Repository not found' }, { status: 404 })
      }
      throw new Error(`GitHub API error: ${response.status}`)
    }

    const repo = await response.json()

    return NextResponse.json({ repo })

  } catch (error) {
    console.error('Error fetching repository:', error)
    return NextResponse.json(
      { error: 'Failed to fetch repository data' }, 
      { status: 500 }
    )
  }
}
