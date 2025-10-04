import { prisma } from '@/lib/prisma'
import { AssignmentStatus } from '@prisma/client'
import { AssignmentService } from './assignment-service'
import { AIAnalysisService } from './ai-analysis-service'

export class ThresholdService {
  private assignmentService: AssignmentService
  private aiService: AIAnalysisService

  constructor() {
    this.assignmentService = new AssignmentService()
    this.aiService = new AIAnalysisService()
  }

  async evaluateAssignment(assignment: any) {
    try {
      const daysSinceActivity = this.calculateDaysSince(assignment.lastActivityAt)
      const aiAnalysis = assignment.aiAnalysis as any
      
      console.log(`Evaluating assignment ${assignment.id}: ${daysSinceActivity} days since activity`)
      
      // Skip evaluation for whitelisted/overridden assignments
      if (assignment.isWhitelisted || assignment.manualOverride) {
        console.log(`Skipping evaluation for whitelisted/overridden assignment ${assignment.id}`)
        return
      }
      
      // Get context-aware thresholds
      const thresholds = this.getContextAwareThresholds(aiAnalysis)
      
      console.log(`Thresholds for assignment ${assignment.id}:`, thresholds)
      
      if (daysSinceActivity >= thresholds.autoUnassign) {
        await this.handleAutoUnassign(assignment)
      } else if (daysSinceActivity >= thresholds.alert) {
        await this.handleAlert(assignment)
      } else if (daysSinceActivity >= thresholds.warning) {
        await this.handleWarning(assignment)
      }
    } catch (error) {
      console.error(`Error evaluating assignment ${assignment.id}:`, error)
    }
  }

  async evaluateAllAssignments() {
    try {
      const assignments = await this.assignmentService.getActiveAssignments()
      console.log(`Evaluating ${assignments.length} active assignments`)
      
      for (const assignment of assignments) {
        try {
          await this.evaluateAssignment(assignment)
        } catch (error) {
          console.error(`Error evaluating assignment ${assignment.id}:`, error)
        }
      }
    } catch (error) {
      console.error('Error evaluating all assignments:', error)
    }
  }

  private getContextAwareThresholds(aiAnalysis: any) {
    const baseThresholds = {
      warning: 14,    // 14 days
      alert: 30,      // 30 days  
      autoUnassign: 60 // 60 days
    }
    
    // Adjust based on AI analysis
    if (aiAnalysis?.isBlocked) {
      return {
        warning: 30,    // More time for blocked issues
        alert: 60,
        autoUnassign: 90
      }
    }
    
    if (aiAnalysis?.workType === 'research' || aiAnalysis?.workType === 'planning') {
      return {
        warning: 21,    // More time for research/planning
        alert: 45,
        autoUnassign: 75
      }
    }
    
    if (aiAnalysis?.workType === 'testing' || aiAnalysis?.workType === 'documentation') {
      return {
        warning: 10,    // Less time for testing/docs
        alert: 21,
        autoUnassign: 45
      }
    }
    
    return baseThresholds
  }

  private async handleWarning(assignment: any) {
    console.log(`Handling warning for assignment ${assignment.id}`)
    
    // Update status
    await this.assignmentService.updateStatus(assignment.id, AssignmentStatus.WARNING)
    
    // Create notification
    await this.createNotification(assignment, 'WARNING_REMINDER', {
      title: 'Assignment Warning',
      message: `Issue #${assignment.issueNumber} has been inactive for ${this.calculateDaysSince(assignment.lastActivityAt)} days. Please provide an update.`,
      priority: 'NORMAL'
    })
    
    // Post gentle reminder comment (if GitHub integration is available)
    await this.postWarningComment(assignment)
  }

  private async handleAlert(assignment: any) {
    console.log(`Handling alert for assignment ${assignment.id}`)
    
    // Update status
    await this.assignmentService.updateStatus(assignment.id, AssignmentStatus.ALERT)
    
    // Create notification
    await this.createNotification(assignment, 'ALERT_NOTIFICATION', {
      title: 'Assignment Alert',
      message: `Issue #${assignment.issueNumber} has been inactive for ${this.calculateDaysSince(assignment.lastActivityAt)} days. Immediate attention required.`,
      priority: 'HIGH'
    })
    
    // Post alert comment
    await this.postAlertComment(assignment)
  }

  private async handleAutoUnassign(assignment: any) {
    console.log(`Handling auto-unassign for assignment ${assignment.id}`)
    
    try {
      // Unassign via GitHub API (if token available)
      await this.unassignViaGitHub(assignment)
      
      // Update status
      await this.assignmentService.updateStatus(assignment.id, AssignmentStatus.AUTO_UNASSIGNED)
      
      // Create high-priority notification
      await this.createNotification(assignment, 'AUTO_UNASSIGNED', {
        title: 'Auto-Unassigned',
        message: `Issue #${assignment.issueNumber} has been automatically unassigned after ${this.calculateDaysSince(assignment.lastActivityAt)} days of inactivity.`,
        priority: 'URGENT'
      })
      
      // Post auto-unassign comment
      await this.postAutoUnassignComment(assignment)
      
    } catch (error) {
      console.error(`Error auto-unassigning assignment ${assignment.id}:`, error)
    }
  }

  private async postWarningComment(assignment: any) {
    const comment = `⚠️ **Gentle Reminder**\n\nThis issue has been inactive for ${this.calculateDaysSince(assignment.lastActivityAt)} days. Please provide an update on your progress.`
    
    // TODO: Post comment via GitHub API
    console.log(`Would post warning comment: ${comment}`)
  }

  private async postAlertComment(assignment: any) {
    const comment = `🚨 **Alert: Extended Inactivity**\n\nThis issue has been inactive for ${this.calculateDaysSince(assignment.lastActivityAt)} days. Please provide an immediate update or consider unassigning yourself.`
    
    // TODO: Post comment via GitHub API
    console.log(`Would post alert comment: ${comment}`)
  }

  private async postAutoUnassignComment(assignment: any) {
    const comment = `🚨 **Auto-unassigned due to inactivity**\n\nThis issue has been automatically unassigned after ${this.calculateDaysSince(assignment.lastActivityAt)} days of inactivity. If you're still working on this, please re-assign yourself.`
    
    // TODO: Post comment via GitHub API
    console.log(`Would post auto-unassign comment: ${comment}`)
  }

  private async unassignViaGitHub(assignment: any) {
    // TODO: Implement GitHub API unassignment
    console.log(`Would unassign ${assignment.assigneeLogin} from issue #${assignment.issueNumber}`)
  }

  private async createNotification(assignment: any, type: string, data: any) {
    try {
      await prisma.assignmentNotification.create({
        data: {
          assignmentId: assignment.id,
          type: type as any,
          title: data.title,
          message: data.message,
          priority: data.priority as any,
          metadata: {
            daysSinceActivity: this.calculateDaysSince(assignment.lastActivityAt),
            timestamp: new Date()
          }
        }
      })
    } catch (error) {
      console.error('Error creating notification:', error)
    }
  }

  private calculateDaysSince(lastActivityAt: Date): number {
    const now = new Date()
    const diffTime = Math.abs(now.getTime() - lastActivityAt.getTime())
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  }
}
