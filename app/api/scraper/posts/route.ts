import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const filter = searchParams.get('filter') || 'all';
  const source = searchParams.get('source') || 'all';
  const repository = searchParams.get('repository'); // New: filter by repository
  const limit = parseInt(searchParams.get('limit') || '50');

  let whereClause: any = {};

  try {
    // Filter by repository (if specified)
    if (repository) {
      whereClause.targetRepository = repository;
    }

    // Filter by source
    if (source !== 'all') {
      whereClause.source = source;
    }

    // Filter by processing status
    if (filter === 'pending') {
      whereClause.processed = false;
    } else if (filter === 'processed') {
      whereClause.processed = true;
      whereClause.processedIssue = {
        status: { not: 'duplicate' }
      };
    } else if (filter === 'duplicates') {
      whereClause.processed = true;
      whereClause.processedIssue = {
        isDuplicate: true
      };
    }

    const posts = await prisma.scrapedPost.findMany({
      where: whereClause,
      include: {
        processedIssue: true
      },
      orderBy: { scrapedAt: 'desc' },
      take: limit
    });

    return NextResponse.json({ posts });

  } catch (error) {
    console.error('Error fetching posts:', error);
    console.error('Repository parameter:', repository);
    console.error('Where clause:', JSON.stringify(whereClause, null, 2));
    return NextResponse.json(
      { 
        error: 'Failed to fetch posts',
        details: error instanceof Error ? error.message : 'Unknown error',
        repository,
        whereClause
      },
      { status: 500 }
    );
  }
}
