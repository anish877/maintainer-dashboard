import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { Octokit } from '@octokit/rest'

export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Get query parameters
    const { searchParams } = new URL(request.url)
    const owner = searchParams.get('owner')
    const repo = searchParams.get('repo')

    if (!owner || !repo) {
      return NextResponse.json(
        { error: 'Missing required parameters: owner, repo' },
        { status: 400 }
      )
    }

    // Get user's GitHub access token from database
    const { prisma } = await import('@/lib/prisma')
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { accessToken: true }
    })

    if (!user?.accessToken) {
      return NextResponse.json(
        { error: 'No GitHub access token found. Please re-authenticate with GitHub.' },
        { status: 401 }
      )
    }

    // Initialize GitHub client
    const octokit = new Octokit({
      auth: user.accessToken,
    })

    // Get repository labels
    const response = await octokit.rest.issues.listLabelsForRepo({
      owner,
      repo,
    })

    const labels = response.data.map(label => ({
      name: label.name,
      color: label.color,
      description: label.description,
    }))

    return NextResponse.json({
      success: true,
      labels,
    })

  } catch (error) {
    console.error('Error fetching repository labels:', error)
    
    if (error instanceof Error) {
      // Handle GitHub API errors
      if (error.message.includes('Not Found')) {
        return NextResponse.json(
          { error: 'Repository not found' },
          { status: 404 }
        )
      }
      
      if (error.message.includes('Forbidden')) {
        return NextResponse.json(
          { error: 'Insufficient permissions to access repository labels' },
          { status: 403 }
        )
      }
    }

    return NextResponse.json(
      { error: 'Failed to fetch repository labels' },
      { status: 500 }
    )
  }
}
