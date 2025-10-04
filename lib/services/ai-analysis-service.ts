import OpenAI from 'openai'

export class AIAnalysisService {
  private openai: OpenAI

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    })
  }

  async analyzeComment(commentBody: string) {
    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4',
        messages: [{
          role: 'system',
          content: `Analyze this GitHub issue comment for work progress indicators. 
          Return JSON with:
          {
            "hasWork": boolean,
            "workType": "coding" | "research" | "planning" | "blocked" | "waiting" | "testing" | "documentation",
            "confidence": number (0-1),
            "isBlocked": boolean,
            "nextSteps": string,
            "sentiment": "positive" | "neutral" | "negative",
            "urgency": "low" | "medium" | "high"
          }`
        }, {
          role: 'user',
          content: commentBody
        }],
        temperature: 0.3
      })

      const analysis = JSON.parse(response.choices[0].message.content || '{}')
      
      // Validate the response
      return {
        hasWork: analysis.hasWork || false,
        workType: analysis.workType || 'unknown',
        confidence: Math.max(0, Math.min(1, analysis.confidence || 0)),
        isBlocked: analysis.isBlocked || false,
        nextSteps: analysis.nextSteps || '',
        sentiment: analysis.sentiment || 'neutral',
        urgency: analysis.urgency || 'medium',
        analyzedAt: new Date()
      }
    } catch (error) {
      console.error('AI analysis error:', error)
      return {
        hasWork: false,
        workType: 'unknown',
        confidence: 0,
        isBlocked: false,
        nextSteps: '',
        sentiment: 'neutral',
        urgency: 'medium',
        analyzedAt: new Date(),
        error: 'Analysis failed'
      }
    }
  }

  async analyzeWorkProgress(assignment: any) {
    try {
      // Get recent comments for this assignment
      const recentComments = await this.getRecentComments(assignment)
      
      if (recentComments.length === 0) {
        return { 
          isActive: false, 
          confidence: 0,
          workType: 'unknown',
          isBlocked: false
        }
      }

      // Combine all comments for analysis
      const combinedText = recentComments
        .map(comment => comment.body)
        .join('\n\n---\n\n')

      const response = await this.openai.chat.completions.create({
        model: 'gpt-4',
        messages: [{
          role: 'system',
          content: `Analyze this GitHub issue discussion for overall work progress. 
          Consider multiple comments and their context.
          Return JSON with:
          {
            "isActive": boolean,
            "workType": string,
            "confidence": number (0-1),
            "isBlocked": boolean,
            "progress": string,
            "recommendations": string[]
          }`
        }, {
          role: 'user',
          content: combinedText
        }],
        temperature: 0.3
      })

      const analysis = JSON.parse(response.choices[0].message.content || '{}')
      
      return {
        isActive: analysis.isActive || false,
        workType: analysis.workType || 'unknown',
        confidence: Math.max(0, Math.min(1, analysis.confidence || 0)),
        isBlocked: analysis.isBlocked || false,
        progress: analysis.progress || '',
        recommendations: analysis.recommendations || [],
        analyzedAt: new Date()
      }
    } catch (error) {
      console.error('Work progress analysis error:', error)
      return {
        isActive: false,
        workType: 'unknown',
        confidence: 0,
        isBlocked: false,
        progress: '',
        recommendations: [],
        analyzedAt: new Date(),
        error: 'Analysis failed'
      }
    }
  }

  async detectBlockedIssues(assignment: any) {
    try {
      const recentComments = await this.getRecentComments(assignment)
      
      if (recentComments.length === 0) {
        return { isBlocked: false, confidence: 0, reason: '' }
      }

      const combinedText = recentComments
        .map(comment => comment.body)
        .join('\n\n')

      const response = await this.openai.chat.completions.create({
        model: 'gpt-4',
        messages: [{
          role: 'system',
          content: `Analyze if this GitHub issue is blocked or waiting for something.
          Look for keywords like: "waiting", "blocked", "need help", "stuck", "can't proceed", "depends on", "pending".
          Return JSON with:
          {
            "isBlocked": boolean,
            "confidence": number (0-1),
            "reason": string,
            "blockingFactors": string[]
          }`
        }, {
          role: 'user',
          content: combinedText
        }],
        temperature: 0.3
      })

      const analysis = JSON.parse(response.choices[0].message.content || '{}')
      
      return {
        isBlocked: analysis.isBlocked || false,
        confidence: Math.max(0, Math.min(1, analysis.confidence || 0)),
        reason: analysis.reason || '',
        blockingFactors: analysis.blockingFactors || [],
        analyzedAt: new Date()
      }
    } catch (error) {
      console.error('Blocked issue detection error:', error)
      return {
        isBlocked: false,
        confidence: 0,
        reason: '',
        blockingFactors: [],
        analyzedAt: new Date(),
        error: 'Analysis failed'
      }
    }
  }

  private async getRecentComments(assignment: any) {
    // This would typically fetch from GitHub API
    // For now, return empty array - will be implemented with GitHub API integration
    return []
  }
}
