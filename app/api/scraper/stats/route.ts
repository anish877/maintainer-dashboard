import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    // Get basic counts
    const [
      totalPosts,
      processedPosts,
      pendingIssues,
      duplicatesFound,
      avgConfidence
    ] = await Promise.all([
      prisma.scrapedPost.count(),
      prisma.scrapedPost.count({ where: { processed: true } }),
      prisma.processedIssue.count({ where: { status: 'pending' } }),
      prisma.processedIssue.count({ where: { isDuplicate: true } }),
      prisma.processedIssue.aggregate({
        _avg: { confidence: true }
      })
    ]);

    // Get recent scraper runs
    const recentRuns = await prisma.scraperRun.findMany({
      orderBy: { startedAt: 'desc' },
      take: 10
    });

    // Get classification breakdown
    const classificationStats = await prisma.processedIssue.groupBy({
      by: ['type', 'severity'],
      _count: { id: true }
    });

    const stats = {
      totalPosts,
      processedPosts,
      pendingIssues,
      duplicatesFound,
      avgConfidence: avgConfidence._avg.confidence || 0,
      recentRuns,
      classificationStats
    };

    return NextResponse.json({ stats });

  } catch (error) {
    console.error('Error fetching stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch stats' },
      { status: 500 }
    );
  }
}
