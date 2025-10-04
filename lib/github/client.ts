import { Octokit } from '@octokit/rest';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export interface GitHubIssueData {
  title: string;
  body: string;
  labels: string[];
  assignees?: string[];
}

export class GitHubClient {
  private octokit: Octokit;

  constructor(token?: string) {
    this.octokit = new Octokit({
      auth: token || process.env.GITHUB_TOKEN,
    });
  }

  // Static method to create client with authenticated user's token
  static async createWithUserToken(userId?: string): Promise<GitHubClient> {
    if (userId) {
      // Get user's GitHub token from database
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { accessToken: true, tokenExpiry: true }
      });

      if (user?.accessToken) {
        // Check if token is still valid
        const isExpired = user.tokenExpiry && user.tokenExpiry < new Date();
        if (!isExpired) {
          return new GitHubClient(user.accessToken);
        }
      }
    }

    // Fallback to environment token or throw error
    if (process.env.GITHUB_TOKEN) {
      return new GitHubClient(process.env.GITHUB_TOKEN);
    }

    throw new Error('No valid GitHub token found. Please sign in with GitHub or set GITHUB_TOKEN environment variable.');
  }

  async createIssue(
    owner: string,
    repo: string,
    issueData: GitHubIssueData
  ): Promise<{ id: number; url: string; number: number }> {
    try {
      const response = await this.octokit.rest.issues.create({
        owner,
        repo,
        title: issueData.title,
        body: issueData.body,
        labels: issueData.labels,
        assignees: issueData.assignees,
      });

      return {
        id: response.data.id,
        url: response.data.html_url,
        number: response.data.number,
      };
    } catch (error) {
      console.error('Error creating GitHub issue:', error);
      throw error;
    }
  }

  async updateIssue(
    owner: string,
    repo: string,
    issueNumber: number,
    updates: Partial<GitHubIssueData>
  ): Promise<void> {
    try {
      await this.octokit.rest.issues.update({
        owner,
        repo,
        issue_number: issueNumber,
        ...updates,
      });
    } catch (error) {
      console.error('Error updating GitHub issue:', error);
      throw error;
    }
  }

  async closeIssue(
    owner: string,
    repo: string,
    issueNumber: number,
    reason: 'completed' | 'not_planned' = 'completed'
  ): Promise<void> {
    try {
      await this.octokit.rest.issues.update({
        owner,
        repo,
        issue_number: issueNumber,
        state: 'closed',
        state_reason: reason,
      });
    } catch (error) {
      console.error('Error closing GitHub issue:', error);
      throw error;
    }
  }

  async addComment(
    owner: string,
    repo: string,
    issueNumber: number,
    body: string
  ): Promise<void> {
    try {
      await this.octokit.rest.issues.createComment({
        owner,
        repo,
        issue_number: issueNumber,
        body,
      });
    } catch (error) {
      console.error('Error adding comment to GitHub issue:', error);
      throw error;
    }
  }

  async getRepository(owner: string, repo: string) {
    try {
      const response = await this.octokit.rest.repos.get({
        owner,
        repo,
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching repository:', error);
      throw error;
    }
  }

  async listIssues(owner: string, repo: string, options?: {
    state?: 'open' | 'closed' | 'all';
    labels?: string[];
    per_page?: number;
  }) {
    try {
      const response = await this.octokit.rest.issues.listForRepo({
        owner,
        repo,
        ...options,
      });
      return response.data;
    } catch (error) {
      console.error('Error listing issues:', error);
      throw error;
    }
  }
}

export const githubClient = new GitHubClient();

// Utility function to create GitHub issue from processed issue
export async function createGitHubIssueFromProcessedIssue(
  processedIssueId: string,
  repositoryOwner: string,
  repositoryName: string,
  githubClient?: GitHubClient
): Promise<{ githubIssueId: number; githubUrl: string }> {
  const processedIssue = await prisma.processedIssue.findUnique({
    where: { id: processedIssueId },
    include: { scrapedPost: true }
  });

  if (!processedIssue) {
    throw new Error('Processed issue not found');
  }

  if (processedIssue.githubIssueId) {
    throw new Error('GitHub issue already exists for this processed issue');
  }

  const { scrapedPost } = processedIssue;
  
  // Use provided client or create new one
  const client = githubClient || new GitHubClient();

  // Create issue title
  const title = `[${processedIssue.severity.toUpperCase()}] ${processedIssue.summary}`;

  // Create issue body
  const body = `## 🔍 Issue Summary
${processedIssue.summary}

## 📝 Technical Details
${processedIssue.technicalDetails || 'No additional technical details provided.'}

## 📊 Classification
- **Type**: ${processedIssue.type}
- **Severity**: ${processedIssue.severity}
- **Confidence**: ${(processedIssue.confidence * 100).toFixed(1)}%
- **Affected Area**: ${processedIssue.affectedArea || 'Unknown'}
- **User Impact**: ${processedIssue.userImpact || 'Unknown'}

## 📱 Source Information
- **Platform**: ${scrapedPost.source}
- **Original Post**: [View Original](${scrapedPost.sourceUrl})
- **Author**: ${scrapedPost.author || 'Unknown'}
- **Posted**: ${scrapedPost.postedAt ? new Date(scrapedPost.postedAt).toLocaleDateString() : 'Unknown'}

## 🤖 AI Analysis
- **Model**: ${processedIssue.aiModel}
- **Sentiment**: ${processedIssue.sentimentScore ? (processedIssue.sentimentScore > 0 ? 'Positive' : 'Negative') : 'Neutral'}
- **Duplicate**: ${processedIssue.isDuplicate ? 'Yes' : 'No'}

---

*This issue was automatically created by the AI Auto-Scraper system.*`;

  // Prepare labels
  const labels = [
    `type:${processedIssue.type}`,
    `severity:${processedIssue.severity}`,
    `source:${scrapedPost.source}`,
    'ai-generated',
    ...processedIssue.suggestedLabels
  ];

  // Create the GitHub issue
  const githubIssue = await client.createIssue(
    repositoryOwner,
    repositoryName,
    {
      title,
      body,
      labels
    }
  );

  // Update the processed issue with GitHub information
  await prisma.processedIssue.update({
    where: { id: processedIssueId },
    data: {
      githubIssueId: githubIssue.id,
      githubUrl: githubIssue.url,
      githubLabels: labels,
      status: 'synced_to_github'
    }
  });

  return {
    githubIssueId: githubIssue.id,
    githubUrl: githubIssue.url
  };
}

// Utility function to sync multiple approved issues to GitHub
export async function syncApprovedIssuesToGitHub(
  repositoryOwner: string,
  repositoryName: string,
  limit: number = 10,
  userId?: string
): Promise<{ synced: number; errors: number }> {
  const approvedIssues = await prisma.processedIssue.findMany({
    where: {
      status: 'approved',
      githubIssueId: null // Only sync issues that haven't been synced yet
    },
    include: { scrapedPost: true },
    take: limit,
    orderBy: { createdAt: 'desc' }
  });

  let synced = 0;
  let errors = 0;

  // Create GitHub client with user's token
  const githubClient = await GitHubClient.createWithUserToken(userId);

  for (const issue of approvedIssues) {
    try {
      await createGitHubIssueFromProcessedIssue(
        issue.id,
        repositoryOwner,
        repositoryName,
        githubClient
      );
      synced++;
      
      // Add delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (error) {
      console.error(`Error syncing issue ${issue.id} to GitHub:`, error);
      errors++;
    }
  }

  return { synced, errors };
}
