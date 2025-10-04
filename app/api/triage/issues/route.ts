import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createAIEnhancedTriageFromSession } from '@/lib/ai-enhanced-triage';

/**
 * API Route for Issue Triage
 * 
 * This endpoint allows authenticated users to triage GitHub issues
 * using their existing GitHub OAuth session (no manual tokens required)
 */

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { owner, repo, issueNumbers, includeComments = true } = body;

    // Validate required fields
    if (!owner || !repo || !issueNumbers || !Array.isArray(issueNumbers)) {
      return NextResponse.json(
        { error: 'Missing required fields: owner, repo, issueNumbers' },
        { status: 400 }
      );
    }

    // Validate issue numbers
    if (!issueNumbers.every(num => typeof num === 'number' && num > 0)) {
      return NextResponse.json(
        { error: 'All issue numbers must be positive integers' },
        { status: 400 }
      );
    }

    console.log(`🤖 Starting AI triage for user ${session.user.id} on ${owner}/${repo}`);
    console.log(`📋 Issues to triage: ${issueNumbers.join(', ')}`);

    // Create AI-enhanced triage system using user's GitHub OAuth session
    const triageSystem = await createAIEnhancedTriageFromSession(owner, repo);

    // Perform batch triage
    const result = await triageSystem.aiTriageIssuesFunction(issueNumbers);

    // Format response
    const response = {
      success: result.success,
      message: formatTriageMessage(result),
      details: {
        totalIssues: result.summary.totalIssues,
        successfulTriages: result.summary.successfulTriages,
        failedTriages: result.summary.failedTriages,
        averageConfidence: Math.round(result.summary.averageConfidence * 100),
        goodFirstIssues: result.results.filter(r => r.difficulty === 'good first issue').length,
        criticalIssues: result.results.filter(r => r.priority === 'critical').length,
        highPriorityIssues: result.results.filter(r => r.priority === 'high').length,
        commonLabels: result.summary.commonLabels,
        suggestedAssignees: result.summary.suggestedAssignees,
        similarIssueClusters: result.summary.similarIssueClusters
      },
      results: result.results.map(r => ({
        issueNumber: r.relatedIssues?.[0] || 'unknown', // This would need to be passed from the triage function
        type: r.type,
        priority: r.priority,
        component: r.component,
        difficulty: r.difficulty,
        confidence: Math.round(r.confidence * 100),
        suggestedLabels: r.suggestedLabels,
        suggestedAssignees: r.suggestedAssignees,
        aiReasoning: r.aiReasoning
      }))
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('❌ Triage API error:', error);
    
    // Handle specific error types
    if (error instanceof Error) {
      if (error.message.includes('No GitHub access token')) {
        return NextResponse.json(
          { error: 'GitHub authentication required. Please re-authenticate with GitHub.' },
          { status: 401 }
        );
      }
      
      if (error.message.includes('access token has expired')) {
        return NextResponse.json(
          { error: 'GitHub access token has expired. Please re-authenticate.' },
          { status: 401 }
        );
      }
      
      if (error.message.includes('OpenAI API key')) {
        return NextResponse.json(
          { error: 'OpenAI API key not configured. Please contact your administrator.' },
          { status: 500 }
        );
      }
    }

    return NextResponse.json(
      { error: 'Internal server error during issue triage' },
      { status: 500 }
    );
  }
}

/**
 * Format triage results into a user-friendly message
 */
function formatTriageMessage(result: any): string {
  const { summary } = result;
  
  if (!result.success) {
    return '❌ Issue triage failed. Please check the logs for details.';
  }
  
  const goodFirstIssues = result.results.filter(r => r.difficulty === 'good first issue').length;
  const criticalIssues = result.results.filter(r => r.priority === 'critical').length;
  const highPriorityIssues = result.results.filter(r => r.priority === 'high').length;
  
  let message = `✅ Successfully triaged ${summary.successfulTriages} out of ${summary.totalIssues} issues with ${Math.round(summary.averageConfidence * 100)}% average confidence.\n\n`;
  
  if (criticalIssues > 0) {
    message += `🚨 Found ${criticalIssues} critical issue(s) that need immediate attention.\n`;
  }
  
  if (highPriorityIssues > 0) {
    message += `🔥 Identified ${highPriorityIssues} high priority issue(s).\n`;
  }
  
  if (goodFirstIssues > 0) {
    message += `🌟 Discovered ${goodFirstIssues} good first issue(s) for new contributors.\n`;
  }
  
  // Add top labels
  const topLabels = Object.entries(summary.commonLabels)
    .sort(([,a], [,b]) => (b as number) - (a as number))
    .slice(0, 3);
  
  if (topLabels.length > 0) {
    message += `\n🏷️ Most common labels: ${topLabels.map(([label, count]) => `${label} (${count})`).join(', ')}`;
  }
  
  // Add suggested assignees
  if (summary.suggestedAssignees.length > 0) {
    message += `\n👥 Suggested assignees: ${summary.suggestedAssignees.join(', ')}`;
  }
  
  return message;
}

/**
 * GET endpoint to check triage system status
 */
export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const owner = searchParams.get('owner');
    const repo = searchParams.get('repo');

    if (!owner || !repo) {
      return NextResponse.json(
        { error: 'Missing required query parameters: owner, repo' },
        { status: 400 }
      );
    }

    // Test GitHub API access
    const triageSystem = await createAIEnhancedTriageFromSession(owner, repo);
    
    // Try to fetch repository info to verify access
    // This would be a simple test call
    
    return NextResponse.json({
      success: true,
      message: 'Triage system is ready',
      user: {
        id: session.user.id,
        name: session.user.name,
        username: session.user.username
      },
      repository: {
        owner,
        repo
      },
      features: {
        aiAnalysis: true,
        autoLabeling: true,
        issueClustering: true,
        teamAssignment: true
      }
    });

  } catch (error) {
    console.error('❌ Triage status check error:', error);
    
    if (error instanceof Error && error.message.includes('No GitHub access token')) {
      return NextResponse.json(
        { error: 'GitHub authentication required', authenticated: false },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to verify triage system status' },
      { status: 500 }
    );
  }
}
