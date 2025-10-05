import { NextRequest, NextResponse } from 'next/server';
import { generateRepositoryKeywords } from '@/lib/ai/repository-keyword-generator';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const repository = searchParams.get('repository');
    
    if (!repository) {
      return NextResponse.json({ error: 'Repository parameter is required' }, { status: 400 });
    }

    console.log(`Generating keywords for repository: ${repository}`);

    // Try to fetch repository details from GitHub API for better keyword generation
    let repositoryDescription = '';
    let repositoryLanguage = '';
    let repositoryTopics: string[] = [];

    try {
      const [owner, repo] = repository.split('/');
      if (owner && repo) {
        // Fetch repository details from GitHub API
        const githubResponse = await fetch(`https://api.github.com/repos/${owner}/${repo}`, {
          headers: {
            'Accept': 'application/vnd.github.v3+json',
            'User-Agent': 'MaintainerDashboard/1.0'
          }
        });

        if (githubResponse.ok) {
          const repoData = await githubResponse.json();
          repositoryDescription = repoData.description || '';
          repositoryLanguage = repoData.language || '';
          repositoryTopics = repoData.topics || [];
        }
      }
    } catch (error) {
      console.log('Could not fetch GitHub repository details, using basic info');
    }

    const keywordResult = await generateRepositoryKeywords(
      repository,
      repositoryDescription,
      repositoryLanguage,
      repositoryTopics
    );

    return NextResponse.json({
      success: true,
      keywords: keywordResult.keywords,
      reasoning: keywordResult.reasoning,
      confidence: keywordResult.confidence
    });

  } catch (error) {
    console.error('Error generating keywords:', error);
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}