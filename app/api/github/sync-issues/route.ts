import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { Octokit } from '@octokit/rest';

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
    const { owner, repo, limit = 50 } = body;

    // Validate required fields
    if (!owner || !repo) {
      return NextResponse.json(
        { error: 'Missing required fields: owner, repo' },
        { status: 400 }
      );
    }

    console.log(`Starting issue sync for ${owner}/${repo}`);

    // Get user's GitHub access token
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { accessToken: true }
    });

    if (!user?.accessToken) {
      return NextResponse.json({ error: 'GitHub access token not found' }, { status: 400 });
    }

    // Initialize GitHub client
    const octokit = new Octokit({ auth: user.accessToken });

    // Find repository in database
    const repository = await prisma.repository.findUnique({
      where: { fullName: `${owner}/${repo}` }
    });

    if (!repository) {
      return NextResponse.json({
        repository: { owner, repo },
        error: `Repository "${owner}/${repo}" not found in database. Please sync your repositories first.`,
        code: 'REPOSITORY_NOT_FOUND'
      }, { status: 404 });
    }

    // Fetch issues from GitHub
    const issues = await fetchIssuesFromGitHub(octokit, owner, repo, limit);
    console.log(`Found ${issues.length} issues to sync`);

    if (issues.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No issues found to sync',
        syncedCount: 0,
        repository: { owner, repo }
      });
    }

    // Sync issues to database
    const syncResults = await syncIssuesToDatabase(issues, repository.id);
    
    // Update repository sync timestamp
    await prisma.repository.update({
      where: { id: repository.id },
      data: { lastSyncedAt: new Date() }
    });

    console.log(`✅ Issue sync complete: ${syncResults.synced} synced, ${syncResults.updated} updated, ${syncResults.errors} errors`);

    return NextResponse.json({
      success: true,
      message: `Successfully synced ${syncResults.synced} issues to database`,
      syncedCount: syncResults.synced,
      updatedCount: syncResults.updated,
      errorCount: syncResults.errors,
      repository: { owner, repo }
    });

  } catch (error) {
    console.error('Error syncing issues:', error);
    return NextResponse.json(
      { error: 'Failed to sync issues to database' },
      { status: 500 }
    );
  }
}

async function fetchIssuesFromGitHub(
  octokit: Octokit,
  owner: string,
  repo: string,
  limit: number
): Promise<any[]> {
  const issues: any[] = [];
  let page = 1;
  const perPage = Math.min(100, limit);

  while (issues.length < limit) {
    try {
      const response = await octokit.rest.issues.listForRepo({
        owner,
        repo,
        state: 'all', // Get both open and closed issues
        page,
        per_page: perPage,
        sort: 'updated',
        direction: 'desc'
      });

      if (response.data.length === 0) break;

      // Filter out pull requests (GitHub API returns both issues and PRs)
      const actualIssues = response.data.filter(issue => !issue.pull_request);
      issues.push(...actualIssues);

      if (response.data.length < perPage) break;
      page++;

      // Add delay to respect rate limits
      await new Promise(resolve => setTimeout(resolve, 100));
    } catch (error) {
      console.error(`Error fetching issues page ${page}:`, error);
      break;
    }
  }

  return issues.slice(0, limit);
}

async function syncIssuesToDatabase(
  issues: any[],
  repositoryId: string
): Promise<{ synced: number; updated: number; errors: number }> {
  let synced = 0;
  let updated = 0;
  let errors = 0;

  for (const issue of issues) {
    try {
      // Check if issue already exists
      const existingIssue = await prisma.issue.findUnique({
        where: { githubId: issue.id }
      });

      const issueData = {
        githubId: issue.id,
        number: issue.number,
        title: issue.title,
        body: issue.body || '',
        state: issue.state.toUpperCase() as any,
        githubUrl: issue.html_url,
        authorUsername: issue.user.login,
        authorAvatarUrl: issue.user.avatar_url,
        commentCount: issue.comments || 0,
        reactionCount: (issue.reactions?.total_count || 0),
        createdAt: new Date(issue.created_at),
        updatedAt: new Date(issue.updated_at),
        closedAt: issue.closed_at ? new Date(issue.closed_at) : null,
        repositoryId
      };

      if (existingIssue) {
        // Update existing issue
        await prisma.issue.update({
          where: { githubId: issue.id },
          data: issueData
        });
        updated++;
      } else {
        // Create new issue
        await prisma.issue.create({
          data: issueData
        });
        synced++;
      }

      // Sync labels
      await syncIssueLabels(issue.id, issue.labels || []);

      // Sync comments if any
      if (issue.comments > 0) {
        await syncIssueComments(issue.id, repositoryId);
      }

    } catch (error) {
      console.error(`Error syncing issue ${issue.number}:`, error);
      errors++;
    }
  }

  return { synced, updated, errors };
}

async function syncIssueLabels(githubIssueId: number, labels: any[]): Promise<void> {
  try {
    // Find the issue in our database
    const issue = await prisma.issue.findUnique({
      where: { githubId: githubIssueId }
    });

    if (!issue) return;

    // Clear existing labels for this issue
    await prisma.issueLabel.deleteMany({
      where: { issueId: issue.id }
    });

    // Add new labels
    for (const label of labels) {
      // Find or create label
      const existingLabel = await prisma.label.findFirst({
        where: {
          name: label.name,
          repository: { issues: { some: { githubId: githubIssueId } } }
        }
      });

      let labelRecord;
      if (existingLabel) {
        labelRecord = existingLabel;
      } else {
        // Create new label
        const repository = await prisma.repository.findFirst({
          where: { issues: { some: { githubId: githubIssueId } } }
        });

        if (repository) {
          labelRecord = await prisma.label.create({
            data: {
              name: label.name,
              color: label.color || '#000000',
              description: label.description || null,
              repositoryId: repository.id
            }
          });
        }
      }

      if (labelRecord) {
        // Create issue-label relationship
        await prisma.issueLabel.create({
          data: {
            issueId: issue.id,
            labelId: labelRecord.id,
            appliedAt: new Date()
          }
        });
      }
    }
  } catch (error) {
    console.error('Error syncing issue labels:', error);
  }
}

async function syncIssueComments(githubIssueId: number, repositoryId: string): Promise<void> {
  try {
    // Find the issue in our database
    const issue = await prisma.issue.findUnique({
      where: { githubId: githubIssueId }
    });

    if (!issue) return;

    // Get user's access token to fetch comments
    const user = await prisma.user.findFirst({
      where: { repositories: { some: { id: repositoryId } } },
      select: { accessToken: true }
    });

    if (!user?.accessToken) return;

    const octokit = new Octokit({ auth: user.accessToken });

    // Fetch comments from GitHub
    const response = await octokit.rest.issues.listComments({
      owner: issue.repository.owner,
      repo: issue.repository.name,
      issue_number: issue.number
    });

    // Sync comments
    for (const comment of response.data) {
      try {
        await prisma.issueComment.upsert({
          where: { githubId: comment.id },
          update: {
            body: comment.body || '',
            authorUsername: comment.user.login,
            updatedAt: new Date(comment.updated_at)
          },
          create: {
            githubId: comment.id,
            body: comment.body || '',
            authorUsername: comment.user.login,
            createdAt: new Date(comment.created_at),
            updatedAt: new Date(comment.updated_at),
            issueId: issue.id
          }
        });
      } catch (error) {
        console.error(`Error syncing comment ${comment.id}:`, error);
      }
    }
  } catch (error) {
    console.error('Error syncing issue comments:', error);
  }
}
