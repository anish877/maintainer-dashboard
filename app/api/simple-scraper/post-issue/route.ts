import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { repository, issue } = await request.json();
    
    if (!repository || !issue) {
      return NextResponse.json({ error: 'Repository and issue are required' }, { status: 400 });
    }

    const [owner, repo] = repository.split('/');
    if (!owner || !repo) {
      return NextResponse.json({ error: 'Invalid repository format' }, { status: 400 });
    }

    console.log(`Posting issue to GitHub: ${repository}`);

    // Get user's GitHub token
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { githubToken: true }
    });

    if (!user?.githubToken) {
      return NextResponse.json({ error: 'GitHub token not found' }, { status: 400 });
    }

    // Create GitHub issue
    const githubResponse = await fetch(`https://api.github.com/repos/${owner}/${repo}/issues`, {
      method: 'POST',
      headers: {
        'Authorization': `token ${user.githubToken}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        title: issue.title,
        body: issue.body,
        labels: issue.labels
      })
    });

    if (!githubResponse.ok) {
      const errorData = await githubResponse.json();
      console.error('GitHub API error:', errorData);
      return NextResponse.json({ 
        success: false, 
        error: `GitHub API error: ${errorData.message || 'Unknown error'}` 
      }, { status: 400 });
    }

    const githubIssue = await githubResponse.json();
    
    console.log(`Issue created successfully: ${githubIssue.html_url}`);

    return NextResponse.json({
      success: true,
      githubUrl: githubIssue.html_url,
      issueNumber: githubIssue.number
    });

  } catch (error) {
    console.error('Error posting issue:', error);
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}
