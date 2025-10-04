import { AssignmentService } from './assignment-service'
import { ForkDetectionService } from './fork-detection-service'
import { ThresholdService } from './threshold-service'
import { AIAnalysisService } from './ai-analysis-service'

export class BackgroundMonitorService {
  private assignmentService: AssignmentService
  private forkDetectionService: ForkDetectionService
  private thresholdService: ThresholdService
  private aiService: AIAnalysisService

  constructor() {
    this.assignmentService = new AssignmentService()
    this.forkDetectionService = new ForkDetectionService()
    this.thresholdService = new ThresholdService()
    this.aiService = new AIAnalysisService()
  }

  async runMonitoringCycle() {
    console.log('🔄 Starting assignment monitoring cycle...')
    
    try {
      // Get all active assignments
      const assignments = await this.assignmentService.getActiveAssignments()
      console.log(`📊 Monitoring ${assignments.length} active assignments`)
      
      for (const assignment of assignments) {
        try {
          console.log(`🔍 Processing assignment: ${assignment.repositoryName}#${assignment.issueNumber}`)
          
          // 1. Check fork activity
          await this.checkForkActivity(assignment)
          
          // 2. Perform AI analysis
          await this.performAIAnalysis(assignment)
          
          // 3. Evaluate thresholds
          await this.evaluateThresholds(assignment)
          
          // Add delay to avoid rate limiting
          await this.delay(1000)
          
        } catch (error) {
          console.error(`❌ Error processing assignment ${assignment.id}:`, error)
          await this.handleAssignmentError(assignment, error)
        }
      }
      
      console.log(`✅ Completed monitoring cycle for ${assignments.length} assignments`)
    } catch (error) {
      console.error('❌ Monitoring cycle error:', error)
    }
  }

  private async checkForkActivity(assignment: any) {
    try {
      console.log(`🔍 Checking fork activity for assignment ${assignment.id}`)
      await this.forkDetectionService.checkForkActivity(assignment)
    } catch (error) {
      console.error(`❌ Fork activity check failed for assignment ${assignment.id}:`, error)
    }
  }

  private async performAIAnalysis(assignment: any) {
    try {
      console.log(`🤖 Performing AI analysis for assignment ${assignment.id}`)
      
      // Get recent activity for analysis
      const recentActivities = await this.getRecentActivities(assignment.id)
      
      if (recentActivities.length > 0) {
        // Analyze work progress
        const workProgress = await this.aiService.analyzeWorkProgress(assignment)
        
        // Detect blocked issues
        const blockedAnalysis = await this.aiService.detectBlockedIssues(assignment)
        
        // Combine analysis results
        const combinedAnalysis = {
          ...workProgress,
          ...blockedAnalysis,
          lastAnalyzed: new Date()
        }
        
        // Update assignment with AI analysis
        await this.assignmentService.updateAIAnalysis(assignment.id, combinedAnalysis)
        
        console.log(`✅ AI analysis completed for assignment ${assignment.id}`)
      }
    } catch (error) {
      console.error(`❌ AI analysis failed for assignment ${assignment.id}:`, error)
    }
  }

  private async evaluateThresholds(assignment: any) {
    try {
      console.log(`📊 Evaluating thresholds for assignment ${assignment.id}`)
      await this.thresholdService.evaluateAssignment(assignment)
    } catch (error) {
      console.error(`❌ Threshold evaluation failed for assignment ${assignment.id}:`, error)
    }
  }

  private async getRecentActivities(assignmentId: string) {
    try {
      const activities = await prisma.assignmentActivity.findMany({
        where: {
          assignmentId,
          timestamp: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // Last 7 days
          }
        },
        orderBy: { timestamp: 'desc' },
        take: 10
      })
      
      return activities
    } catch (error) {
      console.error('Error getting recent activities:', error)
      return []
    }
  }

  private async handleAssignmentError(assignment: any, error: any) {
    try {
      // Check if this is a persistent error
      if (this.isPersistentError(error)) {
        console.log(`⚠️ Marking assignment ${assignment.id} as unknown due to persistent error`)
        await this.assignmentService.updateStatus(assignment.id, 'UNKNOWN')
        
        // Create error notification
        await this.createErrorNotification(assignment, error)
      }
    } catch (notificationError) {
      console.error('Error handling assignment error:', notificationError)
    }
  }

  private isPersistentError(error: any): boolean {
    // Check for persistent API errors
    if (error.status === 404) return true // Resource not found
    if (error.status === 403) return true // Access denied
    if (error.status >= 500) return true // Server errors
    if (error.message?.includes('rate limit')) return true // Rate limiting
    
    return false
  }

  private async createErrorNotification(assignment: any, error: any) {
    try {
      await prisma.assignmentNotification.create({
        data: {
          assignmentId: assignment.id,
          type: 'AI_ANALYSIS_UPDATE',
          title: 'Monitoring Error',
          message: `Assignment monitoring encountered an error: ${error.message}`,
          priority: 'NORMAL',
          metadata: {
            error: error.message,
            timestamp: new Date()
          }
        }
      })
    } catch (notificationError) {
      console.error('Error creating error notification:', notificationError)
    }
  }

  private async delay(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}

// Import prisma for the background monitor
import { prisma } from '@/lib/prisma'
