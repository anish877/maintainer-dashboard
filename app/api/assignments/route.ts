import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { AssignmentService } from '@/lib/services/assignment-service'

const assignmentService = new AssignmentService()

export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const repositoryId = searchParams.get('repositoryId')
    const assigneeId = searchParams.get('assigneeId')

    // Build where clause
    const where: any = {}
    
    if (status) {
      where.status = status
    }
    
    if (repositoryId) {
      where.repositoryId = repositoryId
    }
    
    if (assigneeId) {
      where.assigneeId = assigneeId
    }

    // Get assignments with filters
    const assignments = await prisma.assignment.findMany({
      where,
      include: {
        repository: true,
        assignee: true,
        activities: {
          orderBy: { timestamp: 'desc' },
          take: 5
        },
        notifications: {
          orderBy: { createdAt: 'desc' },
          take: 3
        }
      },
      orderBy: { lastActivityAt: 'desc' }
    })

    return NextResponse.json({ assignments })

  } catch (error) {
    console.error('Error fetching assignments:', error)
    return NextResponse.json(
      { error: 'Failed to fetch assignments' }, 
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const body = await request.json()
    const { action, assignmentId, data } = body

    switch (action) {
      case 'mark_active':
        await assignmentService.markAsActive(assignmentId)
        break
        
      case 'extend_deadline':
        const days = data?.days || 30
        await assignmentService.extendDeadline(assignmentId, days)
        break
        
      case 'whitelist':
        await assignmentService.whitelistUser(assignmentId)
        break
        
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Error processing assignment action:', error)
    return NextResponse.json(
      { error: 'Failed to process action' }, 
      { status: 500 }
    )
  }
}
