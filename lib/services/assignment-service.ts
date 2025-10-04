import { prisma } from '@/lib/prisma'
import { AssignmentStatus, AssignmentActivityType, ActivitySource } from '@prisma/client'

export class AssignmentService {
  async recordAssignment(data: {
    repositoryId: string
    repositoryName: string
    issueNumber: number
    assigneeId: string
    assigneeLogin: string
  }) {
    try {
      // Check if assignment already exists
      const existingAssignment = await prisma.assignment.findFirst({
        where: {
          repositoryId: data.repositoryId,
          issueNumber: data.issueNumber,
          assigneeId: data.assigneeId
        }
      })

      if (existingAssignment) {
        console.log(`Assignment already exists for issue #${data.issueNumber}`)
        return existingAssignment
      }

      const assignment = await prisma.assignment.create({
        data: {
          repositoryId: data.repositoryId,
          repositoryName: data.repositoryName,
          issueNumber: data.issueNumber,
          assigneeId: data.assigneeId,
          assigneeLogin: data.assigneeLogin,
          assignedAt: new Date(),
          lastActivityAt: new Date(),
          status: AssignmentStatus.ACTIVE
        }
      })

      // Log the assignment activity
      await this.logActivity(assignment.id, AssignmentActivityType.ISSUE_COMMENT, ActivitySource.MAIN_REPO, {
        action: 'assigned',
        timestamp: new Date()
      })

      console.log(`Recorded assignment: ${data.repositoryName}#${data.issueNumber} -> ${data.assigneeLogin}`)
      return assignment
    } catch (error: any) {
      console.error('Error recording assignment:', error)
      if (error.message?.includes('does not exist')) {
        console.log('⚠️ Assignment table not found, skipping assignment recording')
        return null
      }
      throw error
    }
  }

  async updateActivity(
    assignmentId: string, 
    activityType: AssignmentActivityType, 
    source: ActivitySource,
    metadata?: any
  ) {
    try {
      // Update last activity timestamp
      await prisma.assignment.update({
        where: { id: assignmentId },
        data: { 
          lastActivityAt: new Date(),
          status: AssignmentStatus.ACTIVE // Reset to active on any activity
        }
      })

      // Log the activity
      await this.logActivity(assignmentId, activityType, source, metadata)

      console.log(`Updated activity for assignment ${assignmentId}: ${activityType} from ${source}`)
    } catch (error) {
      console.error('Error updating activity:', error)
      throw error
    }
  }

  async updateAIAnalysis(assignmentId: string, aiAnalysis: any) {
    try {
      await prisma.assignment.update({
        where: { id: assignmentId },
        data: { 
          aiAnalysis: aiAnalysis,
          updatedAt: new Date()
        }
      })

      // Log AI analysis activity
      await this.logActivity(assignmentId, AssignmentActivityType.AI_ANALYSIS, ActivitySource.AI, {
        analysis: aiAnalysis,
        timestamp: new Date()
      })

      console.log(`Updated AI analysis for assignment ${assignmentId}`)
    } catch (error) {
      console.error('Error updating AI analysis:', error)
      throw error
    }
  }

  async unassignUser(data: {
    repositoryId: string
    issueNumber: number
    assigneeId: string
  }) {
    try {
      const assignment = await prisma.assignment.findFirst({
        where: {
          repositoryId: data.repositoryId,
          issueNumber: data.issueNumber,
          assigneeId: data.assigneeId
        }
      })

      if (assignment) {
        await prisma.assignment.update({
          where: { id: assignment.id },
          data: { 
            status: AssignmentStatus.AUTO_UNASSIGNED,
            updatedAt: new Date()
          }
        })

        // Log the unassignment
        await this.logActivity(assignment.id, AssignmentActivityType.ISSUE_COMMENT, ActivitySource.MAIN_REPO, {
          action: 'unassigned',
          timestamp: new Date()
        })

        console.log(`Unassigned user from issue #${data.issueNumber}`)
      }
    } catch (error) {
      console.error('Error unassigning user:', error)
      throw error
    }
  }

  async getActiveAssignments() {
    return await prisma.assignment.findMany({
      where: {
        status: {
          in: [AssignmentStatus.ACTIVE, AssignmentStatus.WARNING, AssignmentStatus.ALERT]
        }
      },
      include: {
        repository: true,
        assignee: true,
        activities: {
          orderBy: { timestamp: 'desc' },
          take: 10
        }
      }
    })
  }

  async getAssignmentById(assignmentId: string) {
    return await prisma.assignment.findUnique({
      where: { id: assignmentId },
      include: {
        repository: true,
        assignee: true,
        activities: {
          orderBy: { timestamp: 'desc' }
        },
        notifications: {
          orderBy: { createdAt: 'desc' }
        }
      }
    })
  }

  async markAsActive(assignmentId: string) {
    try {
      return await prisma.assignment.update({
        where: { id: assignmentId },
        data: {
          status: AssignmentStatus.ACTIVE,
          lastActivityAt: new Date(),
          manualOverride: true,
          updatedAt: new Date()
        }
      })
    } catch (error: any) {
      if (error.message?.includes('does not exist')) {
        console.log('⚠️ Assignment table not found, simulating mark as active')
        return { id: assignmentId, status: 'ACTIVE', lastActivityAt: new Date() }
      }
      throw error
    }
  }

  async extendDeadline(assignmentId: string, days: number) {
    try {
      const assignment = await prisma.assignment.findUnique({
        where: { id: assignmentId }
      })

      if (!assignment) {
        throw new Error('Assignment not found')
      }

      const newDeadline = new Date(assignment.lastActivityAt)
      newDeadline.setDate(newDeadline.getDate() + days)

      return await prisma.assignment.update({
        where: { id: assignmentId },
        data: {
          lastActivityAt: newDeadline,
          manualOverride: true,
          updatedAt: new Date()
        }
      })
    } catch (error: any) {
      if (error.message?.includes('does not exist')) {
        console.log('⚠️ Assignment table not found, simulating extend deadline')
        const newDeadline = new Date()
        newDeadline.setDate(newDeadline.getDate() + days)
        return { id: assignmentId, lastActivityAt: newDeadline, manualOverride: true }
      }
      throw error
    }
  }

  async whitelistUser(assignmentId: string) {
    try {
      return await prisma.assignment.update({
        where: { id: assignmentId },
        data: {
          isWhitelisted: true,
          updatedAt: new Date()
        }
      })
    } catch (error: any) {
      if (error.message?.includes('does not exist')) {
        console.log('⚠️ Assignment table not found, simulating whitelist user')
        return { id: assignmentId, isWhitelisted: true }
      }
      throw error
    }
  }

  async updateStatus(assignmentId: string, status: AssignmentStatus) {
    return await prisma.assignment.update({
      where: { id: assignmentId },
      data: {
        status,
        updatedAt: new Date()
      }
    })
  }

  private async logActivity(
    assignmentId: string,
    activityType: AssignmentActivityType,
    source: ActivitySource,
    metadata?: any
  ) {
    await prisma.assignmentActivity.create({
      data: {
        assignmentId,
        activityType,
        source,
        timestamp: new Date(),
        metadata: metadata || {}
      }
    })
  }
}
