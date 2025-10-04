import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { AIKeywordGenerator } from '@/lib/ai/keyword-generator';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const repository = searchParams.get('repository');

    if (!repository) {
      return NextResponse.json(
        { error: 'Repository parameter is required' },
        { status: 400 }
      );
    }

    // For now, we'll generate keywords based on repository name
    // In the future, we could fetch actual repo info from GitHub API
    const [owner, repoName] = repository.split('/');
    
    if (!owner || !repoName) {
      return NextResponse.json(
        { error: 'Invalid repository format. Use "owner/repo"' },
        { status: 400 }
      );
    }

    // Generate AI-powered keywords
    const keywordResult = await AIKeywordGenerator.getCachedKeywords(
      repository,
      undefined, // TODO: Fetch description from GitHub API
      undefined  // TODO: Fetch topics from GitHub API
    );

    return NextResponse.json({
      repository,
      keywords: keywordResult.keywords,
      reasoning: keywordResult.reasoning,
      confidence: keywordResult.confidence,
      generatedAt: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error generating repository keywords:', error);
    return NextResponse.json(
      { error: 'Failed to generate keywords' },
      { status: 500 }
    );
  }
}
