import { prisma } from '@/lib/prisma';

export interface ScraperHealth {
  source: string;
  status: 'healthy' | 'warning' | 'critical';
  lastRun: Date | null;
  lastSuccess: Date | null;
  successRate: number;
  avgDuration: number;
  totalRuns: number;
  failedRuns: number;
  errorMessage?: string;
}

export interface SystemHealth {
  overall: 'healthy' | 'warning' | 'critical';
  scrapers: ScraperHealth[];
  ai: {
    status: 'healthy' | 'warning' | 'critical';
    lastProcessed: Date | null;
    avgConfidence: number;
    processingRate: number;
  };
  database: {
    status: 'healthy' | 'warning' | 'critical';
    totalPosts: number;
    processedPosts: number;
    pendingPosts: number;
  };
  github: {
    status: 'healthy' | 'warning' | 'critical';
    lastSync: Date | null;
    syncedIssues: number;
    pendingIssues: number;
  };
}

export async function getScraperHealth(): Promise<ScraperHealth[]> {
  const sources = ['reddit', 'twitter', 'stackoverflow'];
  const health: ScraperHealth[] = [];

  for (const source of sources) {
    try {
      // Get recent runs (last 7 days)
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const runs = await prisma.scraperRun.findMany({
        where: {
          source,
          startedAt: { gte: sevenDaysAgo }
        },
        orderBy: { startedAt: 'desc' }
      });

      const totalRuns = runs.length;
      const failedRuns = runs.filter(r => r.status === 'failed').length;
      const successfulRuns = runs.filter(r => r.status === 'success');

      const lastRun = runs[0]?.startedAt || null;
      const lastSuccess = successfulRuns[0]?.startedAt || null;
      const successRate = totalRuns > 0 ? (successfulRuns.length / totalRuns) * 100 : 0;
      const avgDuration = successfulRuns.length > 0 
        ? successfulRuns.reduce((sum, r) => sum + (r.duration || 0), 0) / successfulRuns.length 
        : 0;

      // Determine status
      let status: 'healthy' | 'warning' | 'critical' = 'healthy';
      let errorMessage: string | undefined;

      if (totalRuns === 0) {
        status = 'critical';
        errorMessage = 'No runs in the last 7 days';
      } else if (successRate < 50) {
        status = 'critical';
        errorMessage = `Low success rate: ${successRate.toFixed(1)}%`;
      } else if (successRate < 80) {
        status = 'warning';
        errorMessage = `Moderate success rate: ${successRate.toFixed(1)}%`;
      } else if (lastRun && (Date.now() - lastRun.getTime()) > 24 * 60 * 60 * 1000) {
        status = status === 'critical' ? 'critical' : 'warning';
        errorMessage = 'No runs in the last 24 hours';
      }

      health.push({
        source,
        status,
        lastRun,
        lastSuccess,
        successRate,
        avgDuration,
        totalRuns,
        failedRuns,
        errorMessage
      });

    } catch (error) {
      health.push({
        source,
        status: 'critical',
        lastRun: null,
        lastSuccess: null,
        successRate: 0,
        avgDuration: 0,
        totalRuns: 0,
        failedRuns: 0,
        errorMessage: `Health check failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
    }
  }

  return health;
}

export async function getAIHealth() {
  try {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const [totalProcessed, avgConfidence, recentProcessed] = await Promise.all([
      prisma.processedIssue.count({
        where: { createdAt: { gte: sevenDaysAgo } }
      }),
      prisma.processedIssue.aggregate({
        where: { createdAt: { gte: sevenDaysAgo } },
        _avg: { confidence: true }
      }),
      prisma.processedIssue.findFirst({
        where: { createdAt: { gte: sevenDaysAgo } },
        orderBy: { createdAt: 'desc' }
      })
    ]);

    const processingRate = totalProcessed / 7; // per day

    let status: 'healthy' | 'warning' | 'critical' = 'healthy';
    
    if (totalProcessed === 0) {
      status = 'critical';
    } else if (processingRate < 5) {
      status = 'warning';
    }

    if (avgConfidence._avg.confidence && avgConfidence._avg.confidence < 0.7) {
      status = status === 'critical' ? 'critical' : 'warning';
    }

    return {
      status,
      lastProcessed: recentProcessed?.createdAt || null,
      avgConfidence: avgConfidence._avg.confidence || 0,
      processingRate
    };

  } catch (error) {
    return {
      status: 'critical' as const,
      lastProcessed: null,
      avgConfidence: 0,
      processingRate: 0
    };
  }
}

export async function getDatabaseHealth() {
  try {
    const [totalPosts, processedPosts, pendingPosts] = await Promise.all([
      prisma.scrapedPost.count(),
      prisma.scrapedPost.count({ where: { processed: true } }),
      prisma.scrapedPost.count({ where: { processed: false } })
    ]);

    const processingRate = totalPosts > 0 ? (processedPosts / totalPosts) * 100 : 0;

    let status: 'healthy' | 'warning' | 'critical' = 'healthy';
    
    if (processingRate < 50) {
      status = 'critical';
    } else if (processingRate < 80) {
      status = 'warning';
    }

    return {
      status,
      totalPosts,
      processedPosts,
      pendingPosts
    };

  } catch (error) {
    return {
      status: 'critical' as const,
      totalPosts: 0,
      processedPosts: 0,
      pendingPosts: 0
    };
  }
}

export async function getGitHubHealth() {
  try {
    const [syncedIssues, pendingIssues, lastSync] = await Promise.all([
      prisma.processedIssue.count({
        where: { status: 'synced_to_github' }
      }),
      prisma.processedIssue.count({
        where: { status: 'approved', githubIssueId: null }
      }),
      prisma.processedIssue.findFirst({
        where: { status: 'synced_to_github' },
        orderBy: { updatedAt: 'desc' }
      })
    ]);

    let status: 'healthy' | 'warning' | 'critical' = 'healthy';
    
    if (pendingIssues > 20) {
      status = 'warning';
    }
    
    if (lastSync && (Date.now() - lastSync.updatedAt.getTime()) > 7 * 24 * 60 * 60 * 1000) {
      status = status === 'critical' ? 'critical' : 'warning';
    }

    return {
      status,
      lastSync: lastSync?.updatedAt || null,
      syncedIssues,
      pendingIssues
    };

  } catch (error) {
    return {
      status: 'critical' as const,
      lastSync: null,
      syncedIssues: 0,
      pendingIssues: 0
    };
  }
}

export async function getSystemHealth(): Promise<SystemHealth> {
  try {
    const [scrapers, ai, database, github] = await Promise.all([
      getScraperHealth(),
      getAIHealth(),
      getDatabaseHealth(),
      getGitHubHealth()
    ]);

    // Determine overall system health
    const criticalCount = [
      ...scrapers.filter(s => s.status === 'critical'),
      ai.status === 'critical' ? ai : null,
      database.status === 'critical' ? database : null,
      github.status === 'critical' ? github : null
    ].filter(Boolean).length;

    const warningCount = [
      ...scrapers.filter(s => s.status === 'warning'),
      ai.status === 'warning' ? ai : null,
      database.status === 'warning' ? database : null,
      github.status === 'warning' ? github : null
    ].filter(Boolean).length;

    let overall: 'healthy' | 'warning' | 'critical' = 'healthy';
    if (criticalCount > 0) {
      overall = 'critical';
    } else if (warningCount > 0) {
      overall = 'warning';
    }

    return {
      overall,
      scrapers,
      ai,
      database,
      github
    };

  } catch (error) {
    console.error('Error getting system health:', error);
    return {
      overall: 'critical',
      scrapers: [],
      ai: {
        status: 'critical',
        lastProcessed: null,
        avgConfidence: 0,
        processingRate: 0
      },
      database: {
        status: 'critical',
        totalPosts: 0,
        processedPosts: 0,
        pendingPosts: 0
      },
      github: {
        status: 'critical',
        lastSync: null,
        syncedIssues: 0,
        pendingIssues: 0
      }
    };
  }
}

// Utility function to send health alerts (placeholder for email/Slack integration)
export async function sendHealthAlert(health: SystemHealth) {
  if (health.overall === 'critical') {
    console.error('🚨 CRITICAL SYSTEM ALERT:', {
      overall: health.overall,
      criticalIssues: health.scrapers.filter(s => s.status === 'critical').map(s => ({
        source: s.source,
        error: s.errorMessage
      }))
    });
    
    // TODO: Implement email/Slack notification
    // await sendEmail({
    //   to: 'admin@example.com',
    //   subject: '🚨 AI Scraper System Critical Alert',
    //   body: `Critical issues detected in the AI Scraper system...`
    // });
  }
}
