import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { Octokit } from '@octokit/rest';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { owner, repo, issueNumber, action, metadata } = await request.json();

    if (!owner || !repo || !issueNumber || !action) {
      return NextResponse.json({ error: 'Owner, repo, issueNumber, and action are required' }, { status: 400 });
    }

    // Get user's GitHub access token
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { accessToken: true }
    });

    if (!user?.accessToken) {
      return NextResponse.json({ error: 'GitHub access token not found' }, { status: 400 });
    }

    const octokit = new Octokit({ auth: user.accessToken });

    console.log(`Updating lifecycle for ${owner}/${repo}#${issueNumber} with action: ${action}`);

    // Find the issue in our database
    const issue = await prisma.issue.findFirst({
      where: {
        number: issueNumber,
        repository: {
          fullName: `${owner}/${repo}`
        }
      },
      include: {
        lifecycleTracking: {
          include: {
            events: {
              orderBy: { timestamp: 'desc' },
              take: 10
            }
          }
        }
      }
    });

    if (!issue) {
      return NextResponse.json({ error: 'Issue not found in database' }, { status: 404 });
    }

    let result;
    
    switch (action) {
      case 'mark_stuck':
        result = await markIssueAsStuck(issue, metadata);
        break;
      case 'update_status':
        result = await updateIssueStatus(issue, metadata, octokit, owner, repo);
        break;
      case 'add_comment':
        result = await addLifecycleComment(issue, metadata, octokit, owner, repo);
        break;
      case 'apply_labels':
        result = await applyLifecycleLabels(issue, metadata, octokit, owner, repo);
        break;
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: result.message,
      data: result.data
    });

  } catch (error) {
    console.error('Error in lifecycle update:', error);
    return NextResponse.json(
      { error: 'Failed to update issue lifecycle' }, 
      { status: 500 }
    );
  }
}

async function markIssueAsStuck(issue: any, metadata: any) {
  const { reason, suggestedActions } = metadata;
  
  // Update lifecycle tracking
  const lifecycle = await prisma.issueLifecycle.upsert({
    where: { issueId: issue.id },
    update: {
      isStuck: true,
      stuckReason: reason,
      stuckSince: new Date(),
      currentStatus: 'STUCK',
      updatedAt: new Date()
    },
    create: {
      issueId: issue.id,
      isStuck: true,
      stuckReason: reason,
      stuckSince: new Date(),
      currentStatus: 'STUCK'
    }
  });

  // Create lifecycle event
  await prisma.lifecycleEvent.create({
    data: {
      lifecycleId: lifecycle.id,
      eventType: 'STUCK_DETECTED',
      fromStatus: issue.lifecycleTracking?.currentStatus || 'OPEN',
      toStatus: 'STUCK',
      triggeredBy: 'system',
      metadata: {
        reason,
        suggestedActions
      }
    }
  });

  return {
    message: `Issue #${issue.number} marked as stuck: ${reason}`,
    data: { lifecycleId: lifecycle.id, isStuck: true }
  };
}

async function updateIssueStatus(issue: any, metadata: any, octokit: Octokit, owner: string, repo: string) {
  const { newStatus, reason } = metadata;
  
  // Update lifecycle tracking
  const lifecycle = await prisma.issueLifecycle.upsert({
    where: { issueId: issue.id },
    update: {
      currentStatus: newStatus,
      isStuck: false,
      stuckReason: null,
      stuckSince: null,
      updatedAt: new Date()
    },
    create: {
      issueId: issue.id,
      currentStatus: newStatus
    }
  });

  // Create lifecycle event
  await prisma.lifecycleEvent.create({
    data: {
      lifecycleId: lifecycle.id,
      eventType: 'STATUS_CHANGE',
      fromStatus: issue.lifecycleTracking?.currentStatus || 'OPEN',
      toStatus: newStatus,
      triggeredBy: 'user',
      metadata: {
        reason,
        updatedBy: 'lifecycle-tracker'
      }
    }
  });

  // Add GitHub comment if reason provided
  if (reason) {
    try {
      await octokit.rest.issues.createComment({
        owner,
        repo,
        issue_number: issue.number,
        body: `**Status Update**: ${newStatus}\n\n${reason}`
      });
    } catch (error) {
      console.error('Failed to add GitHub comment:', error);
    }
  }

  return {
    message: `Issue #${issue.number} status updated to ${newStatus}`,
    data: { lifecycleId: lifecycle.id, currentStatus: newStatus }
  };
}

async function addLifecycleComment(issue: any, metadata: any, octokit: Octokit, owner: string, repo: string) {
  const { comment, commentType = 'lifecycle_update' } = metadata;
  
  try {
    const githubComment = await octokit.rest.issues.createComment({
      owner,
      repo,
      issue_number: issue.number,
      body: `📊 **Lifecycle Analysis**\n\n${comment}`
    });

    // Create lifecycle event
    if (issue.lifecycleTracking) {
      await prisma.lifecycleEvent.create({
        data: {
          lifecycleId: issue.lifecycleTracking.id,
          eventType: 'COMMENT_ADDED',
          triggeredBy: 'system',
          metadata: {
            commentType,
            githubCommentId: githubComment.data.id
          }
        }
      });
    }

    return {
      message: `Comment added to issue #${issue.number}`,
      data: { githubCommentId: githubComment.data.id }
    };
  } catch (error) {
    throw new Error(`Failed to add comment: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

async function applyLifecycleLabels(issue: any, metadata: any, octokit: Octokit, owner: string, repo: string) {
  const { labels, reason } = metadata;
  
  if (!Array.isArray(labels) || labels.length === 0) {
    throw new Error('Labels array is required');
  }

  try {
    // Get existing labels
    const existingLabels = await octokit.rest.issues.listLabelsOnIssue({
      owner,
      repo,
      issue_number: issue.number
    });

    const existingLabelNames = existingLabels.data.map(label => label.name);
    const newLabels = labels.filter(label => !existingLabelNames.includes(label));

    if (newLabels.length > 0) {
      await octokit.rest.issues.addLabels({
        owner,
        repo,
        issue_number: issue.number,
        labels: newLabels
      });
    }

    // Create lifecycle event
    if (issue.lifecycleTracking) {
      await prisma.lifecycleEvent.create({
        data: {
          lifecycleId: issue.lifecycleTracking.id,
          eventType: 'LABEL_ADDED',
          triggeredBy: 'system',
          metadata: {
            labels: newLabels,
            reason
          }
        }
      });
    }

    // Add comment if reason provided
    if (reason && newLabels.length > 0) {
      await octokit.rest.issues.createComment({
        owner,
        repo,
        issue_number: issue.number,
        body: `🏷️ **Labels Applied**: ${newLabels.join(', ')}\n\n${reason}`
      });
    }

    return {
      message: `Applied ${newLabels.length} labels to issue #${issue.number}`,
      data: { 
        appliedLabels: newLabels,
        skippedLabels: labels.filter(label => existingLabelNames.includes(label))
      }
    };
  } catch (error) {
    throw new Error(`Failed to apply labels: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
