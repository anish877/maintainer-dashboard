// Threshold service without database dependency
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
      
      console.log(`📊 Evaluating assignment ${assignment.id}: ${daysSinceActivity} days since activity`)
      
      // Skip evaluation for whitelisted/overridden assignments
      if (assignment.isWhitelisted || assignment.manualOverride) {
        console.log(`⏭️ Skipping evaluation for whitelisted/overridden assignment ${assignment.id}`)
        return
      }
      
      // Get context-aware thresholds
      const thresholds = this.getContextAwareThresholds(aiAnalysis)
      
      console.log(`🎯 Using thresholds: warning=${thresholds.warning} days, alert=${thresholds.alert} days, autoUnassign=${thresholds.autoUnassign} days`)
      
      // Evaluate against thresholds
      if (daysSinceActivity >= thresholds.autoUnassign) {
        await this.handleAutoUnassign(assignment)
      } else if (daysSinceActivity >= thresholds.alert) {
        await this.handleAlert(assignment, daysSinceActivity)
      } else if (daysSinceActivity >= thresholds.warning) {
        await this.handleWarning(assignment, daysSinceActivity)
      } else {
        console.log(`✅ Assignment ${assignment.id} is within acceptable activity range`)
      }
    } catch (error) {
      console.error(`❌ Error evaluating assignment ${assignment.id}:`, error)
    }
  }

  private getContextAwareThresholds(aiAnalysis: any) {
    // Base thresholds (in days)
    let warningThreshold = 3
    let alertThreshold = 7
    let autoUnassignThreshold = 14

    if (!aiAnalysis) {
      return { warning: warningThreshold, alert: alertThreshold, autoUnassign: autoUnassignThreshold }
    }

    // Adjust thresholds based on AI analysis
    if (aiAnalysis.isBlocked) {
      // Extend thresholds for blocked issues
      warningThreshold = 7
      alertThreshold = 14
      autoUnassignThreshold = 21
      console.log(`🔒 Issue appears blocked, extending thresholds`)
    } else if (aiAnalysis.workType === 'research') {
      // Research tasks take longer
      warningThreshold = 5
      alertThreshold = 10
      autoUnassignThreshold = 21
      console.log(`🔬 Research task detected, extending thresholds`)
    } else if (aiAnalysis.workType === 'planning') {
      // Planning tasks are shorter
      warningThreshold = 2
      alertThreshold = 5
      autoUnassignThreshold = 10
      console.log(`📋 Planning task detected, shortening thresholds`)
    }

    return {
      warning: warningThreshold,
      alert: alertThreshold,
      autoUnassign: autoUnassignThreshold
    }
  }

  private async handleWarning(assignment: any, daysSinceActivity: number) {
    try {
      console.log(`⚠️ Handling warning for assignment ${assignment.id} (${daysSinceActivity} days inactive)`)
      
      // Update assignment status
      await this.assignmentService.updateStatus(assignment.id, 'WARNING')
      
      // Post gentle reminder comment (simulated)
      console.log(`💬 Posting gentle reminder comment for issue #${assignment.issueNumber}`)
      
      // Log the warning action
      await this.assignmentService.updateActivity(
        assignment.id,
        'WARNING_POSTED',
        'THRESHOLD_SERVICE',
        { daysSinceActivity, timestamp: new Date() }
      )
      
      console.log(`✅ Warning handled for assignment ${assignment.id}`)
    } catch (error) {
      console.error(`❌ Error handling warning for assignment ${assignment.id}:`, error)
    }
  }

  private async handleAlert(assignment: any, daysSinceActivity: number) {
    try {
      console.log(`🚨 Handling alert for assignment ${assignment.id} (${daysSinceActivity} days inactive)`)
      
      // Update assignment status
      await this.assignmentService.updateStatus(assignment.id, 'ALERT')
      
      // Post alert comment (simulated)
      console.log(`💬 Posting alert comment for issue #${assignment.issueNumber}`)
      
      // Create dashboard alert (simulated)
      console.log(`📢 Creating dashboard alert for assignment ${assignment.id}`)
      
      // Log the alert action
      await this.assignmentService.updateActivity(
        assignment.id,
        'ALERT_POSTED',
        'THRESHOLD_SERVICE',
        { daysSinceActivity, timestamp: new Date() }
      )
      
      console.log(`✅ Alert handled for assignment ${assignment.id}`)
    } catch (error) {
      console.error(`❌ Error handling alert for assignment ${assignment.id}:`, error)
    }
  }

  private async handleAutoUnassign(assignment: any) {
    try {
      console.log(`🚫 Handling auto-unassign for assignment ${assignment.id}`)
      
      // Update assignment status
      await this.assignmentService.updateStatus(assignment.id, 'AUTO_UNASSIGNED')
      
      // Unassign user (simulated)
      await this.assignmentService.unassignUser({
        repositoryId: assignment.repositoryId,
        issueNumber: assignment.issueNumber,
        assigneeId: assignment.assigneeId
      })
      
      // Post auto-unassign comment (simulated)
      console.log(`💬 Posting auto-unassign comment for issue #${assignment.issueNumber}`)
      
      // Emit high-priority notification (simulated)
      console.log(`🔔 Emitting high-priority notification for assignment ${assignment.id}`)
      
      // Log the auto-unassign action
      await this.assignmentService.updateActivity(
        assignment.id,
        'AUTO_UNASSIGNED',
        'THRESHOLD_SERVICE',
        { timestamp: new Date() }
      )
      
      console.log(`✅ Auto-unassign handled for assignment ${assignment.id}`)
    } catch (error) {
      console.error(`❌ Error handling auto-unassign for assignment ${assignment.id}:`, error)
    }
  }

  private calculateDaysSince(lastActivityAt: Date | string): number {
    const lastActivity = new Date(lastActivityAt)
    const now = new Date()
    const diffTime = Math.abs(now.getTime() - lastActivity.getTime())
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  }

  async evaluateAllAssignments(assignments: any[]) {
    console.log(`📊 Evaluating ${assignments.length} assignments`)
    
    for (const assignment of assignments) {
      try {
        await this.evaluateAssignment(assignment)
      } catch (error) {
        console.error(`❌ Error evaluating assignment ${assignment.id}:`, error)
      }
    }
    
    console.log(`✅ Completed evaluation of ${assignments.length} assignments`)
  }
}