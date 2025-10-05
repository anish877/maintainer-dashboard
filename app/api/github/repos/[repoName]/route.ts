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

    // Validate the token by checking if it's still valid
    console.log('🔍 [DEBUG] Validating GitHub token...')
    try {
      const tokenValidationResponse = await fetch('https://api.github.com/user', {
        headers: {
          'Authorization': `Bearer ${user.accessToken}`,
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'GitHub-Dashboard'
        }
      })
      
      if (!tokenValidationResponse.ok) {
        console.log('❌ [DEBUG] Token validation failed:', tokenValidationResponse.status)
        
        // Try to get more details about the token error
        try {
          const errorData = await tokenValidationResponse.json()
          console.log('❌ [DEBUG] Token error details:', errorData)
        } catch (e) {
          console.log('❌ [DEBUG] Could not parse token error response')
        }
        
        // For now, let's continue with the request instead of failing early
        // The actual API call will handle the 403 error more gracefully
        console.log('⚠️ [DEBUG] Token validation failed, but continuing with request...')
      } else {
        console.log('✅ [DEBUG] Token validation successful')
      }
    } catch (error) {
      console.log('❌ [DEBUG] Token validation error:', error)
      // Continue with the request even if validation fails
      console.log('⚠️ [DEBUG] Token validation error, but continuing with request...')
    }

    // Always ensure we have a username - fetch from GitHub API if null
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
          const updatedUser = await prisma.user.update({
            where: { id: session.user.id },
            data: { username: username }
          })
          console.log('✅ [DEBUG] Updated username in database:', updatedUser.username)
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
        console.log('❌ [DEBUG] Repository not found (404) - user may not be owner')
        
        // Try to find the repository in user's accessible repos
        try {
          console.log('🔍 [DEBUG] Searching for repository in user\'s accessible repositories...')
          const userReposResponse = await fetch('https://api.github.com/user/repos?type=all&per_page=100', {
            headers: {
              'Authorization': `Bearer ${user.accessToken}`,
              'Accept': 'application/vnd.github.v3+json',
              'User-Agent': 'GitHub-Dashboard'
            }
          })
          
          if (userReposResponse.ok) {
            const userRepos = await userReposResponse.json()
            const foundRepo = userRepos.find((repo: any) => repo.name === repoName)
            
            if (foundRepo) {
              console.log('✅ [DEBUG] Found repository in user\'s accessible repos:', foundRepo.full_name)
              return NextResponse.json({ 
                error: 'You are not the owner of this repository. You may be a collaborator.',
                repo: foundRepo,
                isCollaborator: true
              }, { status: 403 })
            }
          }
        } catch (searchError) {
          console.log('❌ [DEBUG] Error searching user repositories:', searchError)
        }
        
        return NextResponse.json({ 
          error: 'Repository not found or you don\'t have access to it',
          isCollaborator: false
        }, { status: 404 })
      }
      if (response.status === 403) {
        console.log('❌ [DEBUG] GitHub API 403 - Access denied. This could be due to:')
        console.log('  1. Repository is private and token lacks access')
        console.log('  2. Token has expired')
        console.log('  3. Token lacks required scopes')
        
        // Try to get more details about the 403 error
        try {
          const errorData = await response.json()
          console.log('❌ [DEBUG] 403 Error details:', errorData)
        } catch (e) {
          console.log('❌ [DEBUG] Could not parse 403 error response')
        }
        
        return NextResponse.json({ 
          error: 'Access denied. The repository may be private or your GitHub token may have expired. Please sign out and sign back in to refresh your token.' 
        }, { status: 403 })
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
