import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { Octokit } from '@octokit/rest'

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Parse request body
    const { owner, repo, issueNumber, labels } = await request.json()

    if (!owner || !repo || !issueNumber || !labels || !Array.isArray(labels)) {
      return NextResponse.json(
        { error: 'Missing required fields: owner, repo, issueNumber, labels' },
        { status: 400 }
      )
    }

    // Get user's GitHub access token from database
    const { prisma } = await import('@/lib/prisma')
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { accessToken: true }
    })

    if (!user?.accessToken) {
      return NextResponse.json(
        { error: 'No GitHub access token found. Please re-authenticate with GitHub.' },
        { status: 401 }
      )
    }

    // Initialize GitHub client
    const octokit = new Octokit({
      auth: user.accessToken,
    })

    // First, check if the issue exists
    try {
      await octokit.rest.issues.get({
        owner,
        repo,
        issue_number: issueNumber,
      })
    } catch (error) {
      return NextResponse.json(
        { error: `Issue #${issueNumber} not found in ${owner}/${repo}` },
        { status: 404 }
      )
    }

    // Get existing labels in the repository
    const existingLabels = await octokit.rest.issues.listLabelsForRepo({
      owner,
      repo,
    })

    const existingLabelNames = existingLabels.data.map(label => label.name)
    
    // Filter labels that exist in the repository
    const validLabels = labels.filter(label => existingLabelNames.includes(label))
    const invalidLabels = labels.filter(label => !existingLabelNames.includes(label))

    if (validLabels.length === 0) {
      return NextResponse.json(
        { 
          error: `None of the suggested labels exist in the repository`,
          invalidLabels,
          availableLabels: existingLabelNames.slice(0, 10) // Show first 10 available labels
        },
        { status: 400 }
      )
    }

    // Apply only valid labels
    const response = await octokit.rest.issues.addLabels({
      owner,
      repo,
      issue_number: issueNumber,
      labels: validLabels,
    })

    return NextResponse.json({
      success: true,
      message: `Labels applied successfully to issue #${issueNumber}`,
      appliedLabels: validLabels,
      skippedLabels: invalidLabels,
      labels: response.data,
    })

  } catch (error) {
    console.error('Error applying labels:', error)
    
    if (error instanceof Error) {
      // Handle GitHub API errors
      if (error.message.includes('Not Found')) {
        return NextResponse.json(
          { error: 'Repository or issue not found' },
          { status: 404 }
        )
      }
      
      if (error.message.includes('Forbidden')) {
        return NextResponse.json(
          { error: 'Insufficient permissions to apply labels' },
          { status: 403 }
        )
      }
    }

    return NextResponse.json(
      { error: 'Failed to apply labels' },
      { status: 500 }
    )
  }
}
