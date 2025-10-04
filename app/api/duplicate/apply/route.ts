import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { Octokit } from '@octokit/rest';

/**
 * API Route for Applying Duplicate Analysis
 * 
 * This endpoint applies the duplicate analysis results by posting comments to GitHub issues
 * and optionally marking issues as duplicates.
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
    const { owner, repo, issueNumber, action, duplicateOf } = body;

    // Validate required fields
    if (!owner || !repo || !issueNumber || !action) {
      return NextResponse.json(
        { error: 'Missing required fields: owner, repo, issueNumber, action' },
        { status: 400 }
      );
    }

    // Validate action
    if (!['mark_duplicate', 'not_duplicate'].includes(action)) {
      return NextResponse.json(
        { error: 'Invalid action. Must be "mark_duplicate" or "not_duplicate"' },
        { status: 400 }
      );
    }

    // Validate duplicateOf for mark_duplicate action
    if (action === 'mark_duplicate' && !duplicateOf) {
      return NextResponse.json(
        { error: 'duplicateOf is required when action is "mark_duplicate"' },
        { status: 400 }
      );
    }

    console.log(`📝 Applying duplicate analysis for user ${session.user.id} on ${owner}/${repo}#${issueNumber}`);

    // Get user's GitHub access token from database
    const { prisma } = await import('@/lib/prisma');
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { accessToken: true }
    });

    if (!user?.accessToken) {
      return NextResponse.json(
        { error: 'No GitHub access token found. Please re-authenticate with GitHub.' },
        { status: 401 }
      );
    }

    // Initialize GitHub client using user's token
    const octokit = new Octokit({
      auth: user.accessToken,
    });

    let commentBody = '';
    let labelsToAdd: string[] = [];

    if (action === 'mark_duplicate') {
      // Mark as duplicate
      commentBody = generateDuplicateComment(issueNumber, duplicateOf);
      labelsToAdd = ['duplicate'];
    } else {
      // Not a duplicate
      commentBody = generateNotDuplicateComment();
    }

    // Post comment to the issue
    const commentResponse = await octokit.rest.issues.createComment({
      owner,
      repo,
      issue_number: issueNumber,
      body: commentBody,
    });

    console.log(`✅ Posted comment on issue #${issueNumber}: ${commentResponse.data.html_url}`);

    // Add labels if marking as duplicate
    if (action === 'mark_duplicate' && labelsToAdd.length > 0) {
      try {
        // Get existing labels
        const issueResponse = await octokit.rest.issues.get({
          owner,
          repo,
          issue_number: issueNumber,
        });

        const existingLabels = issueResponse.data.labels.map(label => 
          typeof label === 'string' ? label : label.name
        );

        // Add new labels
        const labelsToSet = [...existingLabels, ...labelsToAdd];
        
        await octokit.rest.issues.setLabels({
          owner,
          repo,
          issue_number: issueNumber,
          labels: labelsToSet,
        });

        console.log(`🏷️ Added labels to issue #${issueNumber}: ${labelsToAdd.join(', ')}`);
      } catch (labelError) {
        console.warn(`⚠️ Failed to add labels to issue #${issueNumber}:`, labelError);
        // Don't fail the whole operation if label addition fails
      }
    }

    // If marking as duplicate, also post a comment on the original issue
    if (action === 'mark_duplicate' && duplicateOf) {
      try {
        const originalCommentBody = generateOriginalIssueComment(issueNumber);
        
        await octokit.rest.issues.createComment({
          owner,
          repo,
          issue_number: duplicateOf,
          body: originalCommentBody,
        });

        console.log(`✅ Posted cross-reference comment on original issue #${duplicateOf}`);
      } catch (crossRefError) {
        console.warn(`⚠️ Failed to post cross-reference comment on issue #${duplicateOf}:`, crossRefError);
        // Don't fail the whole operation if cross-reference fails
      }
    }

    return NextResponse.json({
      success: true,
      message: `Successfully applied duplicate analysis to issue #${issueNumber}`,
      commentUrl: commentResponse.data.html_url,
      action,
      duplicateOf: action === 'mark_duplicate' ? duplicateOf : null,
    });

  } catch (error) {
    console.error('Error applying duplicate analysis:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

function generateDuplicateComment(currentIssueNumber: number, duplicateOf: number): string {
  return `## 🤖 AI Duplicate Detection

This issue has been identified as a **duplicate** of #${duplicateOf} by our AI-powered duplicate detection system.

### Analysis Summary
- **Similarity Score**: High confidence match
- **AI Reasoning**: Issues describe the same problem and would benefit from the same solution
- **Recommended Action**: Consolidate discussion on the original issue

### Next Steps
- Please continue the discussion on #${duplicateOf}
- If you believe this is not a duplicate, please provide additional context
- Consider closing this issue once the original issue is resolved

---
*This analysis was performed by our AI duplicate detection system. If you disagree with this assessment, please let us know!*`;
}

function generateNotDuplicateComment(): string {
  return `## 🤖 AI Duplicate Detection

After analysis, this issue appears to be **not a duplicate** of the similar issues found.

### Analysis Summary
- **Similarity Assessment**: While similar issues were found, they describe distinct problems
- **AI Reasoning**: Each issue has unique aspects that warrant separate discussion
- **Recommended Action**: Continue with individual issue resolution

### Next Steps
- This issue will be tracked separately
- Consider linking related issues if they share common themes
- Proceed with normal issue resolution workflow

---
*This analysis was performed by our AI duplicate detection system. If you have additional context that suggests this might be a duplicate, please share it!*`;
}

function generateOriginalIssueComment(duplicateIssueNumber: number): string {
  return `## 🔗 Related Issue Found

Issue #${duplicateIssueNumber} has been identified as a duplicate of this issue.

### Duplicate Detection
- **Duplicate Issue**: #${duplicateIssueNumber}
- **Status**: Marked as duplicate
- **Action**: Consolidating discussion here

### Next Steps
- Monitor #${duplicateIssueNumber} for any unique context that might be relevant
- Consider this issue when prioritizing and assigning resources
- Close #${duplicateIssueNumber} once this issue is resolved

---
*This cross-reference was created by our AI duplicate detection system.*`;
}
