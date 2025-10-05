import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { Octokit } from '@octokit/rest';
import { OpenAI } from 'openai';

interface LifecycleAnalysis {
  issueNumber: number;
  title: string;
  currentStatus: string;
  timeInEachStatus: {
    open: number;
    inProgress: number;
    inReview: number;
    inTesting: number;
  };
  totalTimeOpen: number;
  predictedResolutionTime: number;
  predictionConfidence: number;
  isStuck: boolean;
  stuckReason?: string;
  efficiencyScore: number;
  bottleneckAnalysis: string;
  suggestedActions: string[];
  similarIssues: {
    issueNumber: number;
    title: string;
    resolutionTime: number;
    similarity: number;
  }[];
}

interface LifecycleSummary {
  totalIssues: number;
  averageResolutionTime: number;
  stuckIssues: number;
  efficiencyTrend: 'improving' | 'declining' | 'stable';
  bottleneckInsights: string[];
  recommendations: string[];
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { owner, repo } = await request.json();

    if (!owner || !repo) {
      return NextResponse.json({ error: 'Owner and repo are required' }, { status: 400 });
    }

    // Get user's GitHub access token
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { accessToken: true }
    });

    if (!user?.accessToken) {
      return NextResponse.json({ error: 'GitHub access token not found' }, { status: 400 });
    }

    // Initialize OpenAI
    const openaiApiKey = process.env.OPEN_AI_KEY;
    if (!openaiApiKey) {
      return NextResponse.json({ error: 'OpenAI API key not configured' }, { status: 500 });
    }

    const openai = new OpenAI({ apiKey: openaiApiKey });
    const octokit = new Octokit({ auth: user.accessToken });

    console.log(`Starting lifecycle analysis for ${owner}/${repo}`);

    // Fetch repository from database
    const repository = await prisma.repository.findUnique({
      where: { fullName: `${owner}/${repo}` },
      include: {
        issues: {
          include: {
            lifecycleTracking: {
              include: {
                events: {
                  orderBy: { timestamp: 'asc' }
                }
              }
            },
            activities: {
              orderBy: { createdAt: 'asc' }
            },
            comments: {
              orderBy: { createdAt: 'asc' }
            },
            labels: {
              include: {
                label: true
              }
            }
          }
        }
      }
    });

    if (!repository) {
      return NextResponse.json({
        repository: { owner, repo },
        error: `Repository "${owner}/${repo}" not found in database. Please sync your repositories first by visiting the Repositories page.`,
        code: 'REPOSITORY_NOT_FOUND'
      }, { status: 404 });
    }

    const issues = repository.issues;
    console.log(`Found ${issues.length} issues to analyze`);

    if (issues.length === 0) {
      return NextResponse.json({
        success: false,
        results: [],
        summary: {
          totalIssues: 0,
          averageResolutionTime: 0,
          stuckIssues: 0,
          efficiencyTrend: 'stable' as const,
          bottleneckInsights: ['No issues found in database'],
          recommendations: ['Please sync repository issues first by clicking the "Sync Issues" button']
        },
        message: 'No issues found to analyze for lifecycle tracking. Please sync your repository issues first.',
        needsSync: true
      });
    }

    // Analyze each issue
    const analysisResults: LifecycleAnalysis[] = [];
    
    for (const issue of issues) {
      try {
        const analysis = await analyzeIssueLifecycle(openai, issue, issues);
        analysisResults.push(analysis);
        
        // Update database with analysis
        await updateIssueLifecycleInDB(issue, analysis);
        
        // Add delay to respect rate limits
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (error) {
        console.error(`Failed to analyze issue #${issue.number}:`, error);
      }
    }

    // Generate summary insights
    const summary = await generateLifecycleSummary(openai, analysisResults);

    console.log(`✅ Lifecycle analysis complete. Analyzed ${analysisResults.length} issues.`);

    return NextResponse.json({
      success: true,
      results: analysisResults,
      summary,
      message: `Analysis complete! Analyzed ${analysisResults.length} issues and identified ${summary.stuckIssues} stuck issues.`
    });

  } catch (error) {
    console.error('Error in lifecycle analysis:', error);
    return NextResponse.json(
      { error: 'Failed to analyze issue lifecycle' }, 
      { status: 500 }
    );
  }
}

async function analyzeIssueLifecycle(
  openai: OpenAI, 
  issue: any, 
  allIssues: any[]
): Promise<LifecycleAnalysis> {
  
  // Calculate time in each status
  const lifecycleData = issue.lifecycleTracking;
  const timeInEachStatus = {
    open: lifecycleData?.timeInOpen || 0,
    inProgress: lifecycleData?.timeInProgress || 0,
    inReview: lifecycleData?.timeInReview || 0,
    inTesting: lifecycleData?.timeInTesting || 0
  };

  const totalTimeOpen = Object.values(timeInEachStatus).reduce((sum, time) => sum + time, 0);
  
  // Find similar issues for comparison
  const similarIssues = findSimilarIssuesForPrediction(issue, allIssues);
  
  // AI analysis for predictions and insights
  const aiAnalysis = await analyzeWithAI(openai, issue, timeInEachStatus, similarIssues);
  
  return {
    issueNumber: issue.number,
    title: issue.title,
    currentStatus: determineCurrentStatus(issue),
    timeInEachStatus,
    totalTimeOpen,
    predictedResolutionTime: aiAnalysis.predictedResolutionTime,
    predictionConfidence: aiAnalysis.predictionConfidence,
    isStuck: aiAnalysis.isStuck,
    stuckReason: aiAnalysis.stuckReason,
    efficiencyScore: aiAnalysis.efficiencyScore,
    bottleneckAnalysis: aiAnalysis.bottleneckAnalysis,
    suggestedActions: aiAnalysis.suggestedActions,
    similarIssues
  };
}

function determineCurrentStatus(issue: any): string {
  if (issue.state === 'CLOSED') return 'CLOSED';
  
  const lifecycle = issue.lifecycleTracking;
  if (lifecycle?.isStuck) return 'STUCK';
  if (lifecycle?.currentStatus) return lifecycle.currentStatus;
  
  // Determine status based on activities
  const activities = issue.activities || [];
  const labels = issue.labels || [];
  
  // Check for common status indicators
  const hasInProgressLabel = labels.some((l: any) => 
    l.label.name.toLowerCase().includes('in progress') || 
    l.label.name.toLowerCase().includes('working on it')
  );
  
  const hasReviewLabel = labels.some((l: any) => 
    l.label.name.toLowerCase().includes('review') || 
    l.label.name.toLowerCase().includes('needs review')
  );
  
  const hasTestingLabel = labels.some((l: any) => 
    l.label.name.toLowerCase().includes('test') || 
    l.label.name.toLowerCase().includes('qa')
  );
  
  if (hasTestingLabel) return 'IN_TESTING';
  if (hasReviewLabel) return 'IN_REVIEW';
  if (hasInProgressLabel || issue.isAssigned) return 'IN_PROGRESS';
  
  return 'OPEN';
}

function findSimilarIssuesForPrediction(currentIssue: any, allIssues: any[]): any[] {
  const similarIssues = [];
  
  for (const issue of allIssues) {
    if (issue.id === currentIssue.id || issue.state !== 'CLOSED') continue;
    
    // Calculate similarity based on type, priority, and complexity
    let similarity = 0;
    
    if (issue.issueType === currentIssue.issueType) similarity += 30;
    if (issue.priority === currentIssue.priority) similarity += 25;
    if (issue.difficulty === currentIssue.difficulty) similarity += 20;
    
    // Check for similar labels
    const currentLabels = (currentIssue.labels || []).map((l: any) => l.label.name);
    const otherLabels = (issue.labels || []).map((l: any) => l.label.name);
    const commonLabels = currentLabels.filter((label: string) => otherLabels.includes(label));
    similarity += commonLabels.length * 5;
    
    if (similarity > 40) {
      const resolutionTime = issue.closedAt && issue.createdAt 
        ? Math.floor((new Date(issue.closedAt).getTime() - new Date(issue.createdAt).getTime()) / (1000 * 60)) // minutes
        : 0;
        
      similarIssues.push({
        issueNumber: issue.number,
        title: issue.title,
        resolutionTime,
        similarity
      });
    }
  }
  
  return similarIssues
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, 5);
}

async function analyzeWithAI(
  openai: OpenAI,
  issue: any,
  timeInEachStatus: any,
  similarIssues: any[]
): Promise<{
  predictedResolutionTime: number;
  predictionConfidence: number;
  isStuck: boolean;
  stuckReason?: string;
  efficiencyScore: number;
  bottleneckAnalysis: string;
  suggestedActions: string[];
}> {
  
  const similarIssuesText = similarIssues
    .map(similar => `Issue #${similar.issueNumber}: "${similar.title}" (resolved in ${Math.floor(similar.resolutionTime / 60)} hours, ${similar.similarity}% similar)`)
    .join('\n');

  const prompt = `
Analyze the lifecycle of GitHub issue #${issue.number} and provide insights:

ISSUE DETAILS:
Title: "${issue.title}"
Type: ${issue.issueType || 'Unknown'}
Priority: ${issue.priority || 'Unknown'}
Difficulty: ${issue.difficulty || 'Unknown'}
Created: ${issue.createdAt}
Updated: ${issue.updatedAt}
State: ${issue.state}

TIME IN EACH STATUS:
- Open: ${Math.floor(timeInEachStatus.open / 60)} hours
- In Progress: ${Math.floor(timeInEachStatus.inProgress / 60)} hours  
- In Review: ${Math.floor(timeInEachStatus.inReview / 60)} hours
- In Testing: ${Math.floor(timeInEachStatus.inTesting / 60)} hours
- Total: ${Math.floor(Object.values(timeInEachStatus).reduce((sum: number, time: number) => sum + time, 0) / 60)} hours

SIMILAR RESOLVED ISSUES:
${similarIssuesText || 'No similar issues found'}

Please analyze and respond with a JSON object containing:
{
  "predictedResolutionTime": number (minutes to resolution),
  "predictionConfidence": number (0-1 confidence),
  "isStuck": boolean,
  "stuckReason": "explanation if stuck",
  "efficiencyScore": number (0-100 efficiency rating),
  "bottleneckAnalysis": "detailed analysis of bottlenecks",
  "suggestedActions": ["action1", "action2", "action3"]
}

Consider:
- Time spent in each status vs typical patterns
- Whether the issue appears stuck in any status
- Similar issues' resolution times for prediction
- Bottlenecks and efficiency issues
- Specific actions to improve the lifecycle
`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: 'You are an expert at analyzing GitHub issue lifecycles and identifying bottlenecks. Respond only with valid JSON.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.1
    });

    const analysisText = response.choices[0]?.message?.content;
    if (!analysisText) {
      throw new Error('No response from AI');
    }

    const analysis = JSON.parse(analysisText);
    
    // Validate and provide defaults
    return {
      predictedResolutionTime: Math.max(0, analysis.predictedResolutionTime || 0),
      predictionConfidence: Math.max(0, Math.min(1, analysis.predictionConfidence || 0.5)),
      isStuck: analysis.isStuck || false,
      stuckReason: analysis.stuckReason,
      efficiencyScore: Math.max(0, Math.min(100, analysis.efficiencyScore || 50)),
      bottleneckAnalysis: analysis.bottleneckAnalysis || 'No bottlenecks identified',
      suggestedActions: Array.isArray(analysis.suggestedActions) ? analysis.suggestedActions : []
    };
    
  } catch (error) {
    console.error('Error in AI lifecycle analysis:', error);
    
    // Fallback analysis
    const totalTime = Object.values(timeInEachStatus).reduce((sum: number, time: number) => sum + time, 0);
    const avgSimilarTime = similarIssues.length > 0 
      ? similarIssues.reduce((sum, similar) => sum + similar.resolutionTime, 0) / similarIssues.length
      : totalTime * 1.5;
    
    return {
      predictedResolutionTime: Math.floor(avgSimilarTime),
      predictionConfidence: 0.3,
      isStuck: totalTime > (24 * 60 * 7), // stuck if open for more than a week
      stuckReason: totalTime > (24 * 60 * 7) ? 'Issue has been open for more than a week' : undefined,
      efficiencyScore: Math.max(0, 100 - (totalTime / (24 * 60))), // efficiency decreases with time
      bottleneckAnalysis: 'Fallback analysis: Unable to perform AI analysis',
      suggestedActions: ['Manual review recommended']
    };
  }
}

async function generateLifecycleSummary(openai: OpenAI, results: LifecycleAnalysis[]): Promise<LifecycleSummary> {
  const totalIssues = results.length;
  const stuckIssues = results.filter(r => r.isStuck).length;
  const avgResolutionTime = results.length > 0 
    ? results.reduce((sum, r) => sum + r.totalTimeOpen, 0) / results.length 
    : 0;

  // Simple efficiency trend calculation
  const efficiencyTrend = results.length >= 2 ? 'stable' : 'stable';
  
  const bottleneckInsights = [
    `${stuckIssues} issues are currently stuck`,
    `Average resolution time: ${Math.floor(avgResolutionTime / 60)} hours`,
    `${Math.floor((results.filter(r => r.efficiencyScore < 50).length / totalIssues) * 100)}% of issues have low efficiency scores`
  ];

  const recommendations = [
    'Review stuck issues and provide additional resources',
    'Consider breaking down complex issues into smaller tasks',
    'Improve assignment and review processes',
    'Implement automated testing to reduce testing bottlenecks'
  ];

  return {
    totalIssues,
    averageResolutionTime: Math.floor(avgResolutionTime),
    stuckIssues,
    efficiencyTrend,
    bottleneckInsights,
    recommendations
  };
}

async function updateIssueLifecycleInDB(issue: any, analysis: LifecycleAnalysis): Promise<void> {
  try {
    await prisma.issueLifecycle.upsert({
      where: { issueId: issue.id },
      update: {
        currentStatus: analysis.currentStatus as any,
        timeInOpen: analysis.timeInEachStatus.open,
        timeInProgress: analysis.timeInEachStatus.inProgress,
        timeInReview: analysis.timeInEachStatus.inReview,
        timeInTesting: analysis.timeInEachStatus.inTesting,
        totalResolutionTime: analysis.totalTimeOpen,
        predictedResolutionTime: analysis.predictedResolutionTime,
        predictionConfidence: analysis.predictionConfidence,
        isStuck: analysis.isStuck,
        stuckReason: analysis.stuckReason,
        efficiencyScore: analysis.efficiencyScore,
        bottleneckAnalysis: analysis.bottleneckAnalysis,
        lastActivityAt: new Date(),
        updatedAt: new Date()
      },
      create: {
        issueId: issue.id,
        currentStatus: analysis.currentStatus as any,
        timeInOpen: analysis.timeInEachStatus.open,
        timeInProgress: analysis.timeInEachStatus.inProgress,
        timeInReview: analysis.timeInEachStatus.inReview,
        timeInTesting: analysis.timeInEachStatus.inTesting,
        totalResolutionTime: analysis.totalTimeOpen,
        predictedResolutionTime: analysis.predictedResolutionTime,
        predictionConfidence: analysis.predictionConfidence,
        isStuck: analysis.isStuck,
        stuckReason: analysis.stuckReason,
        efficiencyScore: analysis.efficiencyScore,
        bottleneckAnalysis: analysis.bottleneckAnalysis,
        lastActivityAt: new Date()
      }
    });
  } catch (error) {
    console.error('Failed to update lifecycle in database:', error);
  }
}
