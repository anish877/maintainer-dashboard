import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ repoName: string }> }
) {
  try {
    console.log('🔍 [DEBUG] Starting GET /api/github/repos/[repoName]')
    
    // Check authentication
    const session = await getServerSession(authOptions)
    console.log('🔍 [DEBUG] Session check:', { 
      hasSession: !!session, 
      hasUser: !!session?.user, 
      userId: session?.user?.id 
    })
    
    if (!session?.user?.id) {
      console.log('❌ [DEBUG] Authentication failed - no session or user ID')
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    // Get user's GitHub access token
    console.log('🔍 [DEBUG] Fetching user from database:', { userId: session.user.id })
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { accessToken: true, username: true }
    })
    console.log('🔍 [DEBUG] User data:', { 
      hasUser: !!user, 
      hasAccessToken: !!user?.accessToken, 
      username: user?.username 
    })

    if (!user?.accessToken) {
      console.log('❌ [DEBUG] GitHub access token not found for user')
      return NextResponse.json({ error: 'GitHub access token not found' }, { status: 400 })
    }

    // If username is null, fetch it from GitHub API
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
    }

    const { repoName } = await params
    console.log('🔍 [DEBUG] Repository name:', repoName)
    console.log('🔍 [DEBUG] Using username:', username)

    // Get the repository data from GitHub
    const githubUrl = `https://api.github.com/repos/${username}/${repoName}`
    console.log('🔍 [DEBUG] Making GitHub API request:', { 
      url: githubUrl, 
      hasToken: !!user.accessToken 
    })
    
    const response = await fetch(githubUrl, {
      headers: {
        'Authorization': `Bearer ${user.accessToken}`,
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'GitHub-Dashboard'
      }
    })

    console.log('🔍 [DEBUG] GitHub API response:', { 
      status: response.status, 
      statusText: response.statusText, 
      ok: response.ok 
    })

    if (!response.ok) {
      if (response.status === 404) {
        console.log('❌ [DEBUG] Repository not found (404)')
        return NextResponse.json({ error: 'Repository not found' }, { status: 404 })
      }
      console.log('❌ [DEBUG] GitHub API error:', response.status)
      throw new Error(`GitHub API error: ${response.status}`)
    }

    const repo = await response.json()
    console.log('✅ [DEBUG] Successfully fetched repository:', { 
      repoName: repo.name, 
      fullName: repo.full_name,
      hasData: !!repo 
    })

    return NextResponse.json({ repo })

  } catch (error) {
    console.error('❌ [DEBUG] Error fetching repository:', error)
    console.error('❌ [DEBUG] Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    })
    return NextResponse.json(
      { error: 'Failed to fetch repository data' }, 
      { status: 500 }
    )
  }
}
