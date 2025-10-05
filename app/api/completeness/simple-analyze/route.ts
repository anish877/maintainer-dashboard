/**
 * Simplified Completeness Analysis API
 * 
 * This endpoint provides a streamlined way to analyze repository issues
 * for completeness without the complexity of templates and approval workflows.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { GitHubClient } from '@/lib/github/client'
import { simpleCompletenessAnalyzer, IssueData } from '@/lib/ai/simple-completeness-analyzer'
import { prisma } from '@/lib/prisma'

export interface SimpleAnalysisResult {
  issueNumber: number
  title: string
  url: string
  author: string
  createdAt: string
  updatedAt: string
  labels: string[]
  completeness: {
    overallScore: number
    confidence: number
    missingElements: string[]
    suggestions: string[]
    needsImage: boolean
    isComplete: boolean
    reasoning: string
  }
  generatedComment?: {
    content: string
    isHelpful: boolean
    tone: string
  }
}

export interface RepositoryAnalysisResponse {
  repository: {
    owner: string
    repo: string
    fullName: string
  }
  metrics: {
    totalIssues: number
    analyzedIssues: number
    completeIssues: number
    incompleteIssues: number
    averageQualityScore: number
    completenessRate: number
    highQualityCount: number
    lowQualityCount: number
    needsCommentsCount: number
  }
  issues: SimpleAnalysisResult[]
  message: string
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { owner, repo, batchSize = 5 } = await request.json()
    
    if (!owner || !repo) {
      return NextResponse.json({ 
        error: 'Repository owner and name are required' 
      }, { status: 400 })
    }

    const repositoryFullName = `${owner}/${repo}`

    // Initialize GitHub client
    const githubClient = await GitHubClient.createWithUserToken(session.user.id)

    // Fetch all open issues from repository
    const allIssues = await fetchAllIssues(githubClient, owner, repo)
    
    if (allIssues.length === 0) {
      return NextResponse.json({
        repository: { owner, repo, fullName: repositoryFullName },
        metrics: {
          totalIssues: 0,
          analyzedIssues: 0,
          completeIssues: 0,
          incompleteIssues: 0,
          averageQualityScore: 0,
          completenessRate: 0,
          highQualityCount: 0,
          lowQualityCount: 0,
          needsCommentsCount: 0
        },
        issues: [],
        message: 'No open issues found in repository'
      })
    }

    // Prepare issue data for analysis
    const issueDataArray: IssueData[] = allIssues.map(issue => ({
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
    }))

    // Analyze issues in batches
    const analysisResults = await simpleCompletenessAnalyzer.instance.analyzeMultipleIssues(issueDataArray)

    // Calculate metrics
    let completeCount = 0
    let highQualityCount = 0
    let lowQualityCount = 0
    let needsCommentsCount = 0
    let totalQualityScore = 0

    const formattedResults: SimpleAnalysisResult[] = analysisResults.map(result => {
      const { issueData, analysis, generatedComment } = result
      
      if (analysis.overallScore >= 80) completeCount++
      if (analysis.overallScore >= 80) highQualityCount++
      if (analysis.overallScore < 40) lowQualityCount++
      if (generatedComment) needsCommentsCount++
      
      totalQualityScore += analysis.overallScore

      return {
        issueNumber: issueData.number,
        title: issueData.title,
        url: issueData.url,
        author: issueData.author,
        createdAt: issueData.createdAt,
        updatedAt: new Date().toISOString(), // Use current time as placeholder
        labels: issueData.labels,
        completeness: {
          overallScore: analysis.overallScore,
          confidence: analysis.confidence,
          missingElements: analysis.missingElements,
          suggestions: analysis.suggestions,
          needsImage: analysis.needsImage,
          isComplete: analysis.isComplete,
          reasoning: analysis.reasoning
        },
        generatedComment: generatedComment ? {
          content: generatedComment.content,
          isHelpful: generatedComment.isHelpful,
          tone: generatedComment.tone
        } : undefined
      }
    })

    // Calculate repository metrics
    const averageQualityScore = formattedResults.length > 0 
      ? Math.round(totalQualityScore / formattedResults.length) 
      : 0

    const metrics = {
      totalIssues: allIssues.length,
      analyzedIssues: formattedResults.length,
      completeIssues: completeCount,
      incompleteIssues: allIssues.length - completeCount,
      averageQualityScore,
      completenessRate: allIssues.length > 0 
        ? Math.round((completeCount / allIssues.length) * 100) 
        : 0,
      highQualityCount,
      lowQualityCount,
      needsCommentsCount
    }

    // Store analysis results in database for future reference
    await storeAnalysisResults(repositoryFullName, formattedResults)

    // Sort results by quality score (lowest first to prioritize incomplete issues)
    formattedResults.sort((a, b) => a.completeness.overallScore - b.completeness.overallScore)

    return NextResponse.json({
      repository: { owner, repo, fullName: repositoryFullName },
      metrics,
      issues: formattedResults,
      message: `Successfully analyzed ${formattedResults.length} out of ${allIssues.length} issues`
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
      if (error.message.includes('OpenAI')) {
        return NextResponse.json(
          { error: 'AI analysis service unavailable. Please try again later.' },
          { status: 503 }
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
      if (page > 50) { // Reduced from 100 to 50 for faster processing
        console.warn(`Reached page limit (50) for repository ${owner}/${repo}`)
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
 * Store analysis results in database for future reference
 */
async function storeAnalysisResults(
  repositoryFullName: string, 
  results: SimpleAnalysisResult[]
): Promise<void> {
  try {
    // Find or create repository record
    let repository = await prisma.repository.findUnique({
      where: { fullName: repositoryFullName }
    })

    if (!repository) {
      // Create basic repository record if it doesn't exist
      const [owner, repo] = repositoryFullName.split('/')
      repository = await prisma.repository.create({
        data: {
          name: repo,
          fullName: repositoryFullName,
          owner: owner,
          description: 'Repository added via completeness analysis',
          visibility: 'UNKNOWN',
          isPrivate: false,
          openIssues: results.length,
          openPullRequests: 0,
          stars: 0,
          forks: 0,
          language: 'Unknown',
          lastSync: new Date()
        }
      })
    }

    // Store individual analysis results
    for (const result of results) {
      await prisma.completenessAnalysis.upsert({
        where: {
          repositoryId_issueNumber: {
            repositoryId: repository.id,
            issueNumber: result.issueNumber
          }
        },
        update: {
          issueTitle: result.title,
          issueUrl: result.url,
          issueAuthor: result.author,
          overallScore: result.completeness.overallScore,
          confidence: result.completeness.confidence,
          missingElements: result.completeness.missingElements,
          suggestions: result.completeness.suggestions,
          needsImage: result.completeness.needsImage,
          isComplete: result.completeness.isComplete,
          reasoning: result.completeness.reasoning,
          generatedComment: result.generatedComment?.content,
          analysisVersion: 'v2.0-simple'
        },
        create: {
          repositoryId: repository.id,
          issueNumber: result.issueNumber,
          issueTitle: result.title,
          issueUrl: result.url,
          issueAuthor: result.author,
          overallScore: result.completeness.overallScore,
          confidence: result.completeness.confidence,
          missingElements: result.completeness.missingElements,
          suggestions: result.completeness.suggestions,
          needsImage: result.completeness.needsImage,
          isComplete: result.completeness.isComplete,
          reasoning: result.completeness.reasoning,
          generatedComment: result.generatedComment?.content,
          analysisVersion: 'v2.0-simple'
        }
      })
    }

    // Update repository metrics
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const metrics = {
      totalIssues: results.length,
      analyzedIssues: results.length,
      completeIssues: results.filter(r => r.completeness.isComplete).length,
      incompleteIssues: results.filter(r => !r.completeness.isComplete).length,
      averageScore: Math.round(results.reduce((sum, r) => sum + r.completeness.overallScore, 0) / results.length),
      highQualityCount: results.filter(r => r.completeness.overallScore >= 80).length,
      lowQualityCount: results.filter(r => r.completeness.overallScore < 40).length
    }

    await prisma.completenessMetrics.upsert({
      where: {
        repositoryId_date: {
          repositoryId: repository.id,
          date: today
        }
      },
      update: metrics,
      create: {
        repositoryId: repository.id,
        date: today,
        ...metrics
      }
    })

  } catch (error) {
    console.error('Failed to store analysis results:', error)
    // Don't throw error to avoid breaking the main flow
  }
}
