/**
 * API Endpoint: Analyze Repository Issues for Completeness
 * 
 * This endpoint fetches all open issues from a repository and analyzes
 * each one for completeness using AI-powered analysis.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { GitHubClient } from '@/lib/github/client'
import { completenessAnalyzer, IssueData, CompletenessAnalysis } from '@/lib/ai/completeness-analyzer'
import { templateEngine } from '@/lib/templates/template-engine'
import { prisma } from '@/lib/prisma'

// Type for the analysis result with issue metadata
interface IssueAnalysisResult {
  issueNumber: number
  title: string
  url: string
  author: string
  createdAt: string
  updatedAt: string
  labels: string[]
  completeness: CompletenessAnalysis
  qualityScore: number
  isComplete: boolean
  missingElements: string[]
  suggestions: string[]
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { owner, repo, includeComments = false, batchSize = 10, trackProgress = false } = await request.json()
    
    if (!owner || !repo) {
      return NextResponse.json({ 
        error: 'Repository owner and name are required' 
      }, { status: 400 })
    }

    const repositoryFullName = `${owner}/${repo}`

    // Look up repository in database
    const repository = await prisma.repository.findUnique({
      where: { fullName: repositoryFullName }
    })

    if (!repository) {
      return NextResponse.json({
        repository: { owner, repo },
        error: `Repository "${repositoryFullName}" not found in database. Please sync your repositories first by visiting the Repositories page.`,
        code: 'REPOSITORY_NOT_FOUND'
      }, { status: 404 })
    }

    // Initialize GitHub client
    const githubClient = await GitHubClient.createWithUserToken(session.user.id)

    // Check if repository has any templates configured
    const repositoryTemplates = await templateEngine.getTemplatesForRepository(repository.id)
    
    if (repositoryTemplates.length === 0) {
      return NextResponse.json({
        repository: { owner, repo },
        metrics: {
          totalIssues: 0,
          completeIssues: 0,
          incompleteIssues: 0,
          averageQualityScore: 0,
          completenessRate: 0,
          highQualityCount: 0,
          lowQualityCount: 0
        },
        issues: [],
        message: 'No templates configured for this repository. Please create templates first before running analysis.',
        code: 'NO_TEMPLATES_AVAILABLE'
      }, { status: 400 })
    }

    // Fetch all open issues from repository with pagination
    const allIssues = await fetchAllIssues(githubClient, owner, repo)
    
    if (allIssues.length === 0) {
      return NextResponse.json({
        repository: { owner, repo },
        metrics: {
          totalIssues: 0,
          completeIssues: 0,
          incompleteIssues: 0,
          averageQualityScore: 0,
          completenessRate: 0,
          highQualityCount: 0,
          lowQualityCount: 0
        },
        issues: [],
        message: 'No open issues found in repository'
      })
    }

    // Analyze issues in batches to respect rate limits and provide progress
    const analysisResults: IssueAnalysisResult[] = []
    let completeCount = 0
    let highQualityCount = 0
    let lowQualityCount = 0
    let totalQualityScore = 0

    // Process issues in batches
    for (let i = 0; i < allIssues.length; i += batchSize) {
      const batch = allIssues.slice(i, i + batchSize)
      
      const batchResults = await Promise.allSettled(
        batch.map(async (issue) => {
          try {
            const issueData: IssueData = {
              title: issue.title,
              body: issue.body || '',
              number: issue.number,
              url: issue.html_url,
              author: issue.user?.login || 'unknown',
              repository: repositoryFullName,
              createdAt: issue.created_at,
              labels: issue.labels?.map((label: any) => 
                typeof label === 'string' ? label : label.name
              ) || []
            }

            // Analyze issue completeness with template context
            const analysis = await completenessAnalyzer.analyzeIssue(issueData, repositoryTemplates)

            // Determine if issue is complete (score >= 80)
            const isComplete = analysis.overallScore >= 80
            
            if (isComplete) completeCount++
            if (analysis.overallScore >= 80) highQualityCount++
            if (analysis.overallScore < 40) lowQualityCount++
            
            totalQualityScore += analysis.overallScore

            return {
              issueNumber: issue.number,
              title: issue.title,
              url: issue.html_url,
              author: issue.user?.login || 'unknown',
              createdAt: issue.created_at,
              updatedAt: issue.updated_at,
              labels: issue.labels?.map((label: any) => 
                typeof label === 'string' ? label : label.name
              ) || [],
              completeness: analysis,
              qualityScore: analysis.overallScore,
              isComplete,
              missingElements: analysis.missingElements,
              suggestions: analysis.suggestions
            }

          } catch (error) {
            console.error(`Failed to analyze issue ${issue.number}:`, error)
            return null
          }
        })
      )

      // Add successful results to analysis
      batchResults.forEach((result) => {
        if (result.status === 'fulfilled' && result.value) {
          analysisResults.push(result.value)
        }
      })

      // Add delay between batches to respect rate limits
      if (i + batchSize < allIssues.length) {
        await new Promise(resolve => setTimeout(resolve, 1000))
      }
    }

    // Calculate repository metrics
    const averageQualityScore = analysisResults.length > 0 
      ? Math.round(totalQualityScore / analysisResults.length) 
      : 0

    const metrics = {
      totalIssues: allIssues.length,
      analyzedIssues: analysisResults.length,
      completeIssues: completeCount,
      incompleteIssues: allIssues.length - completeCount,
      averageQualityScore,
      completenessRate: allIssues.length > 0 
        ? Math.round((completeCount / allIssues.length) * 100) 
        : 0,
      highQualityCount,
      lowQualityCount,
      analysisSuccessRate: allIssues.length > 0 
        ? Math.round((analysisResults.length / allIssues.length) * 100) 
        : 0
    }

    // Store metrics in database
    await storeRepositoryMetrics(repositoryFullName, metrics)

    // Sort results by quality score (highest first)
    analysisResults.sort((a, b) => b.qualityScore - a.qualityScore)

    return NextResponse.json({
      repository: { owner, repo, fullName: repositoryFullName },
      metrics,
      issues: analysisResults,
      message: `Successfully analyzed ${analysisResults.length} out of ${allIssues.length} issues`
    })

  } catch (error) {
    console.error('Repository analysis error:', error)
    
    // Handle specific error types
    if (error instanceof Error) {
      if (error.message.includes('Not Found')) {
        return NextResponse.json(
          { error: 'Repository not found or access denied' },
          { status: 404 }
        )
      }
      if (error.message.includes('rate limit')) {
        return NextResponse.json(
          { error: 'GitHub API rate limit exceeded. Please try again later.' },
          { status: 429 }
        )
      }
    }

    return NextResponse.json(
      { error: 'Failed to analyze repository' },
      { status: 500 }
    )
  }
}

/**
 * Fetch all open issues from a repository with pagination
 */
async function fetchAllIssues(
  githubClient: GitHubClient, 
  owner: string, 
  repo: string
): Promise<any[]> {
  const allIssues = []
  let page = 1
  const perPage = 100

  while (true) {
    try {
      const { data: issues } = await githubClient.octokit.rest.issues.listForRepo({
        owner,
        repo,
        state: 'open',
        per_page: perPage,
        page,
        sort: 'created',
        direction: 'desc'
      })

      if (issues.length === 0) break

      allIssues.push(...issues)
      page++

      // Safety check to prevent infinite loops
      if (page > 100) {
        console.warn(`Reached page limit (100) for repository ${owner}/${repo}`)
        break
      }

    } catch (error) {
      console.error(`Failed to fetch issues page ${page}:`, error)
      break
    }
  }

  return allIssues
}

/**
 * Store repository metrics in database
 */
async function storeRepositoryMetrics(
  repositoryFullName: string, 
  metrics: any
): Promise<void> {
  try {
    const repository = await prisma.repository.findFirst({
      where: { fullName: repositoryFullName }
    })

    if (!repository) {
      console.warn(`Repository ${repositoryFullName} not found in database`)
      return
    }

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    await prisma.completenessMetrics.upsert({
      where: {
        repositoryId_date: {
          repositoryId: repository.id,
          date: today
        }
      },
      update: {
        totalIssues: metrics.totalIssues,
        analyzedIssues: metrics.analyzedIssues,
        completeIssues: metrics.completeIssues,
        incompleteIssues: metrics.incompleteIssues,
        averageScore: metrics.averageQualityScore,
        highQualityCount: metrics.highQualityCount,
        lowQualityCount: metrics.lowQualityCount
      },
      create: {
        repositoryId: repository.id,
        date: today,
        totalIssues: metrics.totalIssues,
        analyzedIssues: metrics.analyzedIssues,
        completeIssues: metrics.completeIssues,
        incompleteIssues: metrics.incompleteIssues,
        averageScore: metrics.averageQualityScore,
        highQualityCount: metrics.highQualityCount,
        lowQualityCount: metrics.lowQualityCount
      }
    })

  } catch (error) {
    console.error('Failed to store repository metrics:', error)
    // Don't throw error to avoid breaking the main flow
  }
}

/**
 * GET endpoint to retrieve cached analysis results
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const owner = searchParams.get('owner')
    const repo = searchParams.get('repo')

    if (!owner || !repo) {
      return NextResponse.json({ 
        error: 'Repository owner and name are required' 
      }, { status: 400 })
    }

    const repositoryFullName = `${owner}/${repo}`

    // Get repository
    const repository = await prisma.repository.findFirst({
      where: { fullName: repositoryFullName }
    })

    if (!repository) {
      return NextResponse.json({ 
        error: 'Repository not found' 
      }, { status: 404 })
    }

    // Get recent metrics
    const metrics = await prisma.completenessMetrics.findFirst({
      where: { repositoryId: repository.id },
      orderBy: { date: 'desc' }
    })

    // Get recent analyses
    const analyses = await prisma.completenessAnalysis.findMany({
      where: { repositoryId: repository.id },
      orderBy: { updatedAt: 'desc' },
      take: 50
    })

    return NextResponse.json({
      repository: { owner, repo, fullName: repositoryFullName },
      metrics: metrics ? {
        totalIssues: metrics.totalIssues,
        analyzedIssues: metrics.analyzedIssues,
        completeIssues: metrics.completeIssues,
        incompleteIssues: metrics.incompleteIssues,
        averageQualityScore: metrics.averageScore,
        completenessRate: metrics.totalIssues > 0 
          ? Math.round((metrics.completeIssues / metrics.totalIssues) * 100) 
          : 0,
        highQualityCount: metrics.highQualityCount,
        lowQualityCount: metrics.lowQualityCount
      } : null,
      issues: analyses.map(analysis => ({
        issueNumber: analysis.issueNumber,
        qualityScore: analysis.overallScore,
        isComplete: analysis.overallScore >= 80,
        analysisDate: analysis.updatedAt
      }))
    })

  } catch (error) {
    console.error('Failed to get cached analysis:', error)
    return NextResponse.json(
      { error: 'Failed to retrieve analysis data' },
      { status: 500 }
    )
  }
}
