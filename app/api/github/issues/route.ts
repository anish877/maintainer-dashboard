import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

interface IssueData {
  totalIssues: number
  openIssues: number
  closedIssues: number
  issuesByLabel: Record<string, number>
  issuesByState: Record<string, number>
  recentIssues: Array<{
    id: number
    title: string
    state: string
    labels: string[]
    createdAt: string
    repo: string
    number: number
  }>
}

export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    // Get user's GitHub access token
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { accessToken: true, username: true }
    })

    if (!user?.accessToken) {
      return NextResponse.json({ error: 'GitHub access token not found. Please sign in again.' }, { status: 400 })
    }

    const { searchParams } = new URL(request.url)
    const repo = searchParams.get('repo')
    const state = searchParams.get('state') || 'all'

    let issuesData: IssueData

    try {
      if (repo) {
        // Get issues for specific repository
        const [owner, repoName] = repo.split('/')
        issuesData = await getIssuesForRepo(user.accessToken, owner, repoName, state)
      } else {
        // Get issues across all repositories
        issuesData = await getIssuesForUser(user.accessToken, user.username, state)
      }

      return NextResponse.json({ issues: issuesData })
    } catch (error) {
      console.error('Error in issues API:', error)
      // Return fallback data instead of failing
      const fallbackData = {
        totalIssues: 0,
        openIssues: 0,
        closedIssues: 0,
        issuesByLabel: {},
        issuesByState: {},
        recentIssues: []
      }
      return NextResponse.json({ issues: fallbackData })
    }

  } catch (error) {
    console.error('Error fetching GitHub issues:', error)
    // Return fallback data instead of failing
    const fallbackData = {
      totalIssues: 0,
      openIssues: 0,
      closedIssues: 0,
      issuesByLabel: {},
      issuesByState: {},
      recentIssues: []
    }
    return NextResponse.json({ issues: fallbackData })
  }
}

async function getIssuesForUser(accessToken: string, username: string, state: string): Promise<IssueData> {
  try {
    // Get user's repositories first
    const reposResponse = await fetch('https://api.github.com/user/repos?sort=updated&per_page=10', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'GitHub-Dashboard'
      }
    })

    if (!reposResponse.ok) {
      const errorText = await reposResponse.text()
      console.error('GitHub API error:', {
        status: reposResponse.status,
        statusText: reposResponse.statusText,
        error: errorText
      })
      
      if (reposResponse.status === 403) {
        throw new Error('GitHub API access forbidden. Please re-authenticate with GitHub to refresh your permissions.')
      }
      
      throw new Error(`GitHub API error: ${reposResponse.status} - ${reposResponse.statusText}`)
    }

    const repos = await reposResponse.json()

    // Get issues from first few repositories only to avoid rate limits
    const allIssues: any[] = []
    const issuesByLabel: Record<string, number> = {}
    const issuesByState: Record<string, number> = {}

    // Limit to first 3 repos to avoid rate limiting
    for (const repo of repos.slice(0, 3)) {
      try {
        const issuesResponse = await fetch(
          `https://api.github.com/repos/${repo.full_name}/issues?state=${state}&per_page=30`,
          {
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Accept': 'application/vnd.github.v3+json',
              'User-Agent': 'GitHub-Dashboard'
            }
          }
        )

        if (issuesResponse.ok) {
          const issues = await issuesResponse.json()
          // Filter out pull requests (GitHub API returns both issues and PRs)
          const actualIssues = issues.filter((issue: any) => !issue.pull_request)
          allIssues.push(...actualIssues.map((issue: any) => ({
            ...issue,
            repo: repo.name
          })))
        } else {
          console.log(`Failed to fetch issues for ${repo.full_name}: ${issuesResponse.status}`)
        }
        
        // Add small delay to respect rate limits
        await new Promise(resolve => setTimeout(resolve, 100))
      } catch (error) {
        console.log(`Error fetching issues for ${repo.full_name}:`, error)
        // Continue with other repos even if one fails
      }
    }

    // Process issues data
    allIssues.forEach(issue => {
      // Count by state
      issuesByState[issue.state] = (issuesByState[issue.state] || 0) + 1
      
      // Count by labels
      if (issue.labels && Array.isArray(issue.labels)) {
        issue.labels.forEach((label: any) => {
          const labelName = label.name || label
          issuesByLabel[labelName] = (issuesByLabel[labelName] || 0) + 1
        })
      }
    })

    // Get recent issues
    const recentIssues = allIssues
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 10)
      .map(issue => ({
        id: issue.id,
        title: issue.title,
        state: issue.state,
        labels: issue.labels ? issue.labels.map((label: any) => label.name || label) : [],
        createdAt: issue.created_at,
        repo: issue.repo,
        number: issue.number
      }))

    return {
      totalIssues: allIssues.length,
      openIssues: issuesByState.open || 0,
      closedIssues: issuesByState.closed || 0,
      issuesByLabel,
      issuesByState,
      recentIssues
    }

  } catch (error) {
    console.error('Error fetching user issues:', error)
    return {
      totalIssues: 0,
      openIssues: 0,
      closedIssues: 0,
      issuesByLabel: {},
      issuesByState: {},
      recentIssues: []
    }
  }
}

async function getIssuesForRepo(accessToken: string, owner: string, repo: string, state: string): Promise<IssueData> {
  try {
    const response = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/issues?state=${state}&per_page=100`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'GitHub-Dashboard'
        }
      }
    )

    if (!response.ok) {
      throw new Error(`GitHub API error: ${response.status}`)
    }

    const issues = await response.json()
    const issuesByLabel: Record<string, number> = {}
    const issuesByState: Record<string, number> = {}

    // Process issues data
    issues.forEach((issue: any) => {
      // Count by state
      issuesByState[issue.state] = (issuesByState[issue.state] || 0) + 1
      
      // Count by labels
      issue.labels.forEach((label: any) => {
        const labelName = label.name || label
        issuesByLabel[labelName] = (issuesByLabel[labelName] || 0) + 1
      })
    })

    // Get recent issues
    const recentIssues = issues
      .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 10)
      .map((issue: any) => ({
        id: issue.id,
        title: issue.title,
        state: issue.state,
        labels: issue.labels.map((label: any) => label.name || label),
        createdAt: issue.created_at,
        repo: repo,
        number: issue.number
      }))

    return {
      totalIssues: issues.length,
      openIssues: issuesByState.open || 0,
      closedIssues: issuesByState.closed || 0,
      issuesByLabel,
      issuesByState,
      recentIssues
    }

  } catch (error) {
    console.error('Error fetching repo issues:', error)
    return {
      totalIssues: 0,
      openIssues: 0,
      closedIssues: 0,
      issuesByLabel: {},
      issuesByState: {},
      recentIssues: []
    }
  }
}