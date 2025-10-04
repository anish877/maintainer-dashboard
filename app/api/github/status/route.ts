import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { GitHubClient } from '@/lib/github/client';

export async function GET(request: NextRequest) {
  try {
    // Check if user is authenticated
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { connected: false, message: 'Not authenticated' },
        { status: 401 }
      );
    }

    try {
      // Test GitHub connection with user's token
      const githubClient = await GitHubClient.createWithUserToken(session.user.id);
      
      // Make a simple API call to verify the token works
      const user = await githubClient.octokit.rest.users.getAuthenticated();
      
      return NextResponse.json({
        connected: true,
        message: 'GitHub connected successfully',
        user: {
          login: user.data.login,
          name: session.user.name,
          avatar: session.user.image
        }
      });
      
    } catch (error) {
      console.error('GitHub connection test failed:', error);
      
      return NextResponse.json({
        connected: false,
        message: 'GitHub token expired or invalid',
        error: error instanceof Error ? error.message : 'Unknown error'
      }, { status: 401 });
    }
    
  } catch (error) {
    console.error('Error checking GitHub status:', error);
    return NextResponse.json(
      { 
        connected: false, 
        message: 'Failed to check GitHub status',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
