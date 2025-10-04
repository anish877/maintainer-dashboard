import { NextRequest, NextResponse } from 'next/server'

// Dummy assignment data for testing
const dummyAssignments = [
  {
    id: 'assignment-1',
    repositoryId: 'repo-1',
    repositoryName: 'facebook/react',
    issueNumber: 12345,
    assigneeId: 'user-1',
    assigneeLogin: 'john_developer',
    assignedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
    lastActivityAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
    status: 'ACTIVE',
    aiAnalysis: {
      isActive: true,
      workType: 'coding',
      confidence: 0.85,
      isBlocked: false,
      nextSteps: 'Working on implementation'
    },
    repository: {
      fullName: 'facebook/react'
    },
    assignee: {
      username: 'john_developer',
      image: 'https://github.com/john_developer.png'
    },
    activities: [
      {
        id: 'activity-1',
        activityType: 'ISSUE_COMMENT',
        source: 'MAIN_REPO',
        timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
        commitSha: null,
        commitMessage: null
      }
    ],
    notifications: []
  },
  {
    id: 'assignment-2',
    repositoryId: 'repo-2',
    repositoryName: 'microsoft/vscode',
    issueNumber: 67890,
    assigneeId: 'user-2',
    assigneeLogin: 'jane_contributor',
    assignedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
    lastActivityAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000), // 4 days ago
    status: 'WARNING',
    aiAnalysis: {
      isActive: false,
      workType: 'research',
      confidence: 0.65,
      isBlocked: true,
      nextSteps: 'Need more information'
    },
    repository: {
      fullName: 'microsoft/vscode'
    },
    assignee: {
      username: 'jane_contributor',
      image: 'https://github.com/jane_contributor.png'
    },
    activities: [
      {
        id: 'activity-2',
        activityType: 'FORK_COMMIT',
        source: 'FORK',
        timestamp: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000),
        commitSha: 'abc123def456',
        commitMessage: 'Fix: Resolve issue with component rendering'
      }
    ],
    notifications: []
  },
  {
    id: 'assignment-3',
    repositoryId: 'repo-3',
    repositoryName: 'vercel/next.js',
    issueNumber: 11111,
    assigneeId: 'user-3',
    assigneeLogin: 'alex_maintainer',
    assignedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000), // 10 days ago
    lastActivityAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000), // 8 days ago
    status: 'ALERT',
    aiAnalysis: {
      isActive: false,
      workType: 'planning',
      confidence: 0.45,
      isBlocked: false,
      nextSteps: 'Waiting for review'
    },
    repository: {
      fullName: 'vercel/next.js'
    },
    assignee: {
      username: 'alex_maintainer',
      image: 'https://github.com/alex_maintainer.png'
    },
    activities: [],
    notifications: []
  },
  {
    id: 'assignment-4',
    repositoryId: 'repo-4',
    repositoryName: 'nodejs/node',
    issueNumber: 22222,
    assigneeId: 'user-4',
    assigneeLogin: 'sarah_coder',
    assignedAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000), // 15 days ago
    lastActivityAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000), // 14 days ago
    status: 'AUTO_UNASSIGNED',
    aiAnalysis: {
      isActive: false,
      workType: 'unknown',
      confidence: 0.1,
      isBlocked: false,
      nextSteps: 'Auto-unassigned due to inactivity'
    },
    repository: {
      fullName: 'nodejs/node'
    },
    assignee: {
      username: 'sarah_coder',
      image: 'https://github.com/sarah_coder.png'
    },
    activities: [],
    notifications: []
  }
]

export async function GET(request: NextRequest) {
  try {
    console.log('🌱 Returning dummy assignment data for testing')
    
    return NextResponse.json({ 
      success: true,
      assignments: dummyAssignments,
      message: 'Dummy data loaded successfully',
      stats: {
        total: dummyAssignments.length,
        active: dummyAssignments.filter(a => a.status === 'ACTIVE').length,
        warning: dummyAssignments.filter(a => a.status === 'WARNING').length,
        alert: dummyAssignments.filter(a => a.status === 'ALERT').length,
        autoUnassigned: dummyAssignments.filter(a => a.status === 'AUTO_UNASSIGNED').length
      }
    })
  } catch (error) {
    console.error('❌ Error loading dummy data:', error)
    return NextResponse.json(
      { 
        error: 'Failed to load dummy data',
        details: error instanceof Error ? error.message : 'Unknown error'
      }, 
      { status: 500 }
    )
  }
}
