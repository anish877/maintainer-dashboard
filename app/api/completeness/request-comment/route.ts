/**
 * API Endpoint: Request Auto-Comment for Incomplete Issue
 * 
 * This endpoint creates a pending comment request for an incomplete issue,
 * which will be reviewed by maintainers before being posted.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { GitHubClient } from '@/lib/github/client'
import { completenessAnalyzer, IssueData } from '@/lib/ai/completeness-analyzer'
import { templateEngine } from '@/lib/templates/template-engine'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { 
      owner, 
      repo, 
      issueNumber, 
      templateId,
      forceAnalysis = false 
    } = await request.json()

    if (!owner || !repo || !issueNumber) {
      return NextResponse.json({ 
        error: 'Repository owner, name, and issue number are required' 
      }, { status: 400 })
    }

    const repositoryFullName = `${owner}/${repo}`

    // Get repository
    const repository = await prisma.repository.findFirst({
      where: { fullName: repositoryFullName }
    })

    if (!repository) {
      return NextResponse.json({ 
        error: 'Repository not found in database' 
      }, { status: 404 })
    }

    // Get GitHub client and fetch issue
    const githubClient = await GitHubClient.createWithUserToken(session.user.id)
    
    const { data: issue } = await githubClient.octokit.rest.issues.get({
      owner,
      repo,
      issue_number: issueNumber
    })

    // Check if issue is already closed
    if (issue.state === 'closed') {
      return NextResponse.json({ 
        error: 'Cannot comment on closed issues' 
      }, { status: 400 })
    }

    // Check if there's already a pending comment for this issue
    const existingPendingComment = await prisma.pendingComment.findFirst({
      where: {
        repositoryId: repository.id,
        issueNumber: issueNumber,
        status: 'PENDING'
      }
    })

    if (existingPendingComment && !forceAnalysis) {
      return NextResponse.json({ 
        error: 'A pending comment already exists for this issue',
        existingComment: {
          id: existingPendingComment.id,
          status: existingPendingComment.status,
          createdAt: existingPendingComment.createdAt
        }
      }, { status: 409 })
    }

    // Analyze issue completeness
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

    // Check if any templates exist for this repository
    const repositoryTemplates = await templateEngine.getTemplatesForRepository(repository.id)

    // Analyze issue completeness with template context
    const analysis = await completenessAnalyzer.analyzeIssue(issueData, repositoryTemplates)

    // Check if issue is already complete (score >= 80)
    if (analysis.overallScore >= 80) {
      return NextResponse.json({ 
        error: 'Issue is already complete and does not need additional information',
        analysis: {
          qualityScore: analysis.overallScore,
          isComplete: true,
          missingElements: analysis.missingElements
        }
      }, { status: 400 })
    }
    
    if (repositoryTemplates.length === 0) {
      return NextResponse.json({ 
        error: 'No templates configured for this repository. Please create templates first before requesting comments.',
        code: 'NO_TEMPLATES_AVAILABLE',
        analysis: {
          qualityScore: analysis.overallScore,
          isComplete: analysis.overallScore >= 80,
          missingElements: analysis.missingElements
        }
      }, { status: 400 })
    }

    // Get appropriate template
    let selectedTemplate
    if (templateId) {
      selectedTemplate = await templateEngine.getTemplate(templateId)
      if (!selectedTemplate) {
        return NextResponse.json({ 
          error: 'Specified template not found' 
        }, { status: 404 })
      }
    } else {
      // Auto-select template based on analysis
      selectedTemplate = repositoryTemplates.find(template => 
        templateEngine.matchesConditions(template, issueData, analysis)
      )

      if (!selectedTemplate) {
        // Use first available template as fallback
        selectedTemplate = repositoryTemplates[0]
      }
    }

    if (!selectedTemplate) {
      return NextResponse.json({ 
        error: 'No suitable template found for this issue' 
      }, { status: 404 })
    }

    // Generate comment using template
    const generatedComment = await templateEngine.generateComment(
      selectedTemplate.id,
      issueData,
      analysis
    )

    // Create pending comment
    const pendingComment = await prisma.pendingComment.create({
      data: {
        repositoryId: repository.id,
        issueNumber: issueNumber,
        issueTitle: issue.title,
        issueUrl: issue.html_url,
        issueAuthor: issue.user?.login || 'unknown',
        issueBody: issue.body,
        completenessAnalysis: analysis,
        qualityScore: analysis.overallScore,
        missingElements: analysis.missingElements,
        templateId: selectedTemplate.id,
        generatedComment: generatedComment.content,
        analysisConfidence: analysis.confidence,
        analysisVersion: 'v1.0'
      },
      include: {
        template: true,
        repository: true
      }
    })

    // Log the activity
    await prisma.activityLog.create({
      data: {
        action: 'REQUESTED_COMMENT',
        entityType: 'PendingComment',
        entityId: pendingComment.id,
        metadata: {
          issueNumber: issueNumber,
          templateId: selectedTemplate.id,
          templateName: selectedTemplate.name,
          qualityScore: analysis.overallScore,
          missingElements: analysis.missingElements
        },
        userId: session.user.id
      }
    })

    return NextResponse.json({
      success: true,
      message: 'Comment request created successfully',
      pendingComment: {
        id: pendingComment.id,
        issueNumber: pendingComment.issueNumber,
        issueTitle: pendingComment.issueTitle,
        issueUrl: pendingComment.issueUrl,
        issueAuthor: pendingComment.issueAuthor,
        qualityScore: pendingComment.qualityScore,
        missingElements: pendingComment.missingElements,
        generatedComment: pendingComment.generatedComment,
        templateName: selectedTemplate.name,
        templateId: selectedTemplate.id,
        status: pendingComment.status,
        requiresApproval: selectedTemplate.requiresApproval,
        createdAt: pendingComment.createdAt
      }
    })

  } catch (error) {
    console.error('Comment request failed:', error)
    
    // Handle specific error types
    if (error instanceof Error) {
      if (error.message.includes('Not Found')) {
        return NextResponse.json(
          { error: 'Issue or repository not found' },
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
      { error: 'Failed to create comment request' },
      { status: 500 }
    )
  }
}

/**
 * GET endpoint to check if a comment request exists for an issue
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
    const issueNumber = parseInt(searchParams.get('issueNumber') || '0')

    if (!owner || !repo || !issueNumber) {
      return NextResponse.json({ 
        error: 'Repository owner, name, and issue number are required' 
      }, { status: 400 })
    }

    const repositoryFullName = `${owner}/${repo}`

    // Get repository
    const repository = await prisma.repository.findFirst({
      where: { fullName: repositoryFullName }
    })

    if (!repository) {
      return NextResponse.json({ 
        error: 'Repository not found in database' 
      }, { status: 404 })
    }

    // Check for existing pending comments
    const pendingComment = await prisma.pendingComment.findFirst({
      where: {
        repositoryId: repository.id,
        issueNumber: issueNumber
      },
      include: {
        template: true
      },
      orderBy: { createdAt: 'desc' }
    })

    if (!pendingComment) {
      return NextResponse.json({
        hasPendingComment: false,
        message: 'No pending comment found for this issue'
      })
    }

    return NextResponse.json({
      hasPendingComment: true,
      pendingComment: {
        id: pendingComment.id,
        status: pendingComment.status,
        issueNumber: pendingComment.issueNumber,
        issueTitle: pendingComment.issueTitle,
        qualityScore: pendingComment.qualityScore,
        missingElements: pendingComment.missingElements,
        templateName: pendingComment.template.name,
        createdAt: pendingComment.createdAt,
        approvedBy: pendingComment.approvedBy,
        approvedAt: pendingComment.approvedAt,
        rejectedBy: pendingComment.rejectedBy,
        rejectedAt: pendingComment.rejectedAt,
        githubCommentId: pendingComment.githubCommentId,
        postedAt: pendingComment.postedAt
      }
    })

  } catch (error) {
    console.error('Failed to check comment request:', error)
    return NextResponse.json(
      { error: 'Failed to check comment request' },
      { status: 500 }
    )
  }
}
