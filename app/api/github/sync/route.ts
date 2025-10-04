import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { syncApprovedIssuesToGitHub } from '@/lib/github/client';

export async function POST(request: NextRequest) {
  try {
    // Check if user is authenticated
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, message: 'Authentication required' },
        { status: 401 }
      );
    }

    const { owner, repo, limit } = await request.json();
    
    if (!owner || !repo) {
      return NextResponse.json(
        { error: 'Repository owner and name are required' },
        { status: 400 }
      );
    }

    // Use authenticated user's GitHub token
    const result = await syncApprovedIssuesToGitHub(
      owner,
      repo,
      limit || 10,
      session.user.id
    );

    return NextResponse.json({
      success: true,
      message: result.synced > 0 
        ? `Synced ${result.synced} issues to GitHub` 
        : 'No approved issues found to sync',
      synced: result.synced,
      errors: result.errors,
      user: session.user.name
    });

  } catch (error) {
    console.error('Error syncing to GitHub:', error);
    
    // Handle specific authentication errors
    if (error instanceof Error && error.message.includes('No valid GitHub token')) {
      return NextResponse.json(
        { 
          success: false, 
          message: 'GitHub authentication required. Please sign in with GitHub.',
          error: 'Missing GitHub token'
        },
        { status: 401 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to sync issues to GitHub' },
      { status: 500 }
    );
  }
}
