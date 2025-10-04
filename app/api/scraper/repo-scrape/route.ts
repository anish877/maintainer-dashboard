import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { RepoSpecificScraper } from '@/lib/scrapers/repo-specific-scraper';

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, message: 'Authentication required' },
        { status: 401 }
      );
    }

    const { repository, sources, customKeywords } = await request.json();
    
    if (!repository) {
      return NextResponse.json(
        { success: false, message: 'Repository is required' },
        { status: 400 }
      );
    }

    // Validate repository format
    if (!repository.includes('/') || repository.split('/').length !== 2) {
      return NextResponse.json(
        { success: false, message: 'Repository must be in format "owner/repo"' },
        { status: 400 }
      );
    }

    // Default sources if not provided
    const scrapingSources = sources || ['reddit', 'stackoverflow'];
    
    // Validate sources
    const validSources = ['reddit', 'stackoverflow'];
    const invalidSources = scrapingSources.filter((s: string) => !validSources.includes(s));
    
    if (invalidSources.length > 0) {
      return NextResponse.json(
        { success: false, message: `Invalid sources: ${invalidSources.join(', ')}` },
        { status: 400 }
      );
    }

    console.log(`🚀 Starting repository-specific scraping for ${repository}`);
    console.log(`📊 Sources: ${scrapingSources.join(', ')}`);
    console.log(`🔑 Custom keywords: ${customKeywords?.join(', ') || 'none'}`);

    // Start scraping
    const result = await RepoSpecificScraper.scrapeForRepo(
      repository,
      scrapingSources,
      customKeywords
    );

    console.log(`✅ Repository scraping completed for ${repository}:`, result);

    return NextResponse.json({
      success: true,
      message: `Scraping completed for ${repository}`,
      repository,
      sources: scrapingSources,
      results: {
        totalPosts: result.total,
        newPosts: result.new,
        errors: result.errors
      }
    });

  } catch (error) {
    console.error('Error in repository scraping:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: 'Failed to scrape repository',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, message: 'Authentication required' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const repository = searchParams.get('repository');
    
    if (!repository) {
      return NextResponse.json(
        { success: false, message: 'Repository parameter is required' },
        { status: 400 }
      );
    }

    // Get scraping statistics for the repository
    const stats = await getRepositoryScrapingStats(repository);
    
    return NextResponse.json({
      success: true,
      repository,
      stats
    });

  } catch (error) {
    console.error('Error getting repository scraping stats:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: 'Failed to get repository stats',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

async function getRepositoryScrapingStats(repository: string) {
  // This would be implemented to get stats from the database
  // For now, return mock data
  return {
    totalScraped: 0,
    totalProcessed: 0,
    totalApproved: 0,
    totalSynced: 0,
    lastScraped: null,
    sources: {
      reddit: { total: 0, processed: 0 },
      twitter: { total: 0, processed: 0 },
      stackoverflow: { total: 0, processed: 0 }
    }
  };
}
