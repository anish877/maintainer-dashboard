/**
 * AI-Powered Issue Completeness Analyzer
 * 
 * This module provides sophisticated AI analysis of GitHub issues to determine
 * their completeness based on predefined criteria. It uses OpenAI GPT models
 * for natural language understanding and provides detailed scoring and suggestions.
 */

import OpenAI from 'openai'
import { prisma } from '@/lib/prisma'

// Types for completeness analysis
export interface CompletenessCheck {
  present: boolean
  confidence: number
  quality: 'excellent' | 'good' | 'fair' | 'poor' | 'missing'
  details: string
  suggestions: string[]
}

export interface CompletenessAnalysis {
  reproductionSteps: CompletenessCheck
  expectedBehavior: CompletenessCheck
  versionInfo: CompletenessCheck
  environmentDetails: CompletenessCheck
  errorLogs: CompletenessCheck
  screenshots: CompletenessCheck
  overallScore: number
  missingElements: string[]
  suggestions: string[]
  confidence: number
  processingTime: number
}

export interface IssueData {
  title: string
  body: string
  number: number
  url: string
  author: string
  repository: string
}

export class CompletenessAnalyzer {
  private openai: OpenAI
  private analysisVersion = 'v1.0'

  constructor() {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OpenAI API key is required for completeness analysis')
    }
    
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    })
  }

  /**
   * Main method to analyze issue completeness with optional template context
   */
  async analyzeIssue(issueData: IssueData, availableTemplates?: any[]): Promise<CompletenessAnalysis> {
    const startTime = Date.now()
    
    try {
      const content = `${issueData.title}\n\n${issueData.body}`
      
      // If templates are provided, use them to guide analysis
      const templateContext = availableTemplates ? this.buildTemplateContext(availableTemplates) : null
      
      // Analyze each completeness aspect in parallel for efficiency
      const [
        reproductionSteps,
        expectedBehavior,
        versionInfo,
        environmentDetails,
        errorLogs,
        screenshots
      ] = await Promise.all([
        this.checkReproductionSteps(content, templateContext),
        this.checkExpectedBehavior(content, templateContext),
        this.checkVersionInfo(content, templateContext),
        this.checkEnvironmentDetails(content, templateContext),
        this.checkErrorLogs(content, templateContext),
        this.checkScreenshots(content, templateContext)
      ])

      // Calculate overall score and missing elements
      const checks = [reproductionSteps, expectedBehavior, versionInfo, environmentDetails, errorLogs, screenshots]
      const overallScore = this.calculateOverallScore(checks)
      const missingElements = this.identifyMissingElements(checks)
      const suggestions = this.generateSuggestions(missingElements, issueData)
      const confidence = this.calculateConfidence(checks)

      const processingTime = Date.now() - startTime

      const analysis: CompletenessAnalysis = {
        reproductionSteps,
        expectedBehavior,
        versionInfo,
        environmentDetails,
        errorLogs,
        screenshots,
        overallScore,
        missingElements,
        suggestions,
        confidence,
        processingTime
      }

      // Store analysis in database for future reference
      await this.storeAnalysis(issueData, analysis)

      return analysis

    } catch (error) {
      console.error('Completeness analysis failed:', error)
      throw new Error(`Failed to analyze issue completeness: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Analyze reproduction steps in the issue
   */
  private async checkReproductionSteps(content: string, templateContext?: string): Promise<CompletenessCheck> {
    const prompt = `
    Analyze if this GitHub issue contains clear, step-by-step reproduction instructions.
    
    Look for:
    - Numbered or bulleted steps (1, 2, 3... or -, *, •)
    - Sequential actions that lead to the issue
    - Clear, actionable instructions
    - Specific commands or actions
    - Expected outcome at each step
    
    Issue content: "${content.substring(0, 3000)}"
    
    Respond with JSON:
    {
      "present": true/false,
      "confidence": 0.0-1.0,
      "quality": "excellent|good|fair|poor|missing",
      "details": "detailed explanation of the assessment",
      "suggestions": ["specific suggestion 1", "specific suggestion 2"]
    }`

    return this.analyzeWithAI(prompt, 'reproduction steps', templateContext)
  }

  /**
   * Analyze expected vs actual behavior description
   */
  private async checkExpectedBehavior(content: string, templateContext?: string): Promise<CompletenessCheck> {
    const prompt = `
    Analyze if this GitHub issue clearly describes expected vs actual behavior.
    
    Look for:
    - "Expected:" or "Should:" statements
    - "Actual:" or "Instead:" statements
    - Clear comparison between expected and actual behavior
    - Specific behavior descriptions
    - "What I expected to happen" vs "What actually happened"
    - Before/after descriptions
    
    Issue content: "${content.substring(0, 3000)}"
    
    Respond with JSON:
    {
      "present": true/false,
      "confidence": 0.0-1.0,
      "quality": "excellent|good|fair|poor|missing",
      "details": "detailed explanation of the assessment",
      "suggestions": ["specific suggestion 1", "specific suggestion 2"]
    }`

    return this.analyzeWithAI(prompt, 'expected vs actual behavior', templateContext)
  }

  /**
   * Analyze version information presence
   */
  private async checkVersionInfo(content: string, templateContext?: string): Promise<CompletenessCheck> {
    const prompt = `
    Analyze if this GitHub issue contains version information.
    
    Look for:
    - Version numbers (v1.2.3, 2.0.1, etc.)
    - Browser versions (Chrome 95, Firefox 91, etc.)
    - Operating system versions (Windows 11, macOS 12, etc.)
    - Software versions (Node.js 16, Python 3.9, etc.)
    - "Version:" or "v" followed by numbers
    - Release information
    
    Issue content: "${content.substring(0, 3000)}"
    
    Respond with JSON:
    {
      "present": true/false,
      "confidence": 0.0-1.0,
      "quality": "excellent|good|fair|poor|missing",
      "details": "detailed explanation of the assessment",
      "suggestions": ["specific suggestion 1", "specific suggestion 2"]
    }`

    return this.analyzeWithAI(prompt, 'version information', templateContext)
  }

  /**
   * Analyze environment details
   */
  private async checkEnvironmentDetails(content: string, templateContext?: string): Promise<CompletenessCheck> {
    const prompt = `
    Analyze if this GitHub issue contains environment details.
    
    Look for:
    - Operating system (Windows, macOS, Linux, Ubuntu, etc.)
    - Browser type and version (Chrome, Firefox, Safari, Edge)
    - Device information (iPhone, Android, Desktop)
    - Hardware specifications (RAM, CPU, etc.)
    - Network conditions (WiFi, mobile data)
    - Environment variables or configuration
    - Runtime environment (Docker, Kubernetes, etc.)
    
    Issue content: "${content.substring(0, 3000)}"
    
    Respond with JSON:
    {
      "present": true/false,
      "confidence": 0.0-1.0,
      "quality": "excellent|good|fair|poor|missing",
      "details": "detailed explanation of the assessment",
      "suggestions": ["specific suggestion 1", "specific suggestion 2"]
    }`

    return this.analyzeWithAI(prompt, 'environment details', templateContext)
  }

  /**
   * Analyze error logs and technical details
   */
  private async checkErrorLogs(content: string, templateContext?: string): Promise<CompletenessCheck> {
    const prompt = `
    Analyze if this GitHub issue contains error logs or technical details.
    
    Look for:
    - Stack traces or error messages
    - Console output or logs
    - Error codes or status codes
    - Code snippets showing errors
    - Screenshots of error messages
    - Log files or debug information
    - Exception details
    - Network request/response details
    
    Issue content: "${content.substring(0, 3000)}"
    
    Respond with JSON:
    {
      "present": true/false,
      "confidence": 0.0-1.0,
      "quality": "excellent|good|fair|poor|missing",
      "details": "detailed explanation of the assessment",
      "suggestions": ["specific suggestion 1", "specific suggestion 2"]
    }`

    return this.analyzeWithAI(prompt, 'error logs and technical details', templateContext)
  }

  /**
   * Analyze visual evidence presence
   */
  private async checkScreenshots(content: string, templateContext?: string): Promise<CompletenessCheck> {
    const prompt = `
    Analyze if this GitHub issue contains visual evidence.
    
    Look for:
    - Image attachments or links
    - Screenshots of the issue
    - Diagrams or flowcharts
    - GIFs or videos
    - Links to visual content
    - Markdown image syntax (![...](url))
    - References to screenshots or images
    
    Issue content: "${content.substring(0, 3000)}"
    
    Respond with JSON:
    {
      "present": true/false,
      "confidence": 0.0-1.0,
      "quality": "excellent|good|fair|poor|missing",
      "details": "detailed explanation of the assessment",
      "suggestions": ["specific suggestion 1", "specific suggestion 2"]
    }`

    return this.analyzeWithAI(prompt, 'screenshots and visual evidence', templateContext)
  }

  /**
   * Build template context for analysis
   */
  private buildTemplateContext(templates: any[]): string {
    if (!templates || templates.length === 0) return ''
    
    const templateInfo = templates.map(template => {
      return `Template: ${template.name} (${template.category})
Description: ${template.description || 'No description'}
Variables: ${JSON.stringify(template.variables || {})}
Conditions: ${JSON.stringify(template.conditions || {})}`
    }).join('\n\n')
    
    return `\n\nAvailable Templates Context:\n${templateInfo}`
  }

  /**
   * Analyze content using OpenAI GPT model
   */
  private async analyzeWithAI(prompt: string, context: string, templateContext?: string): Promise<CompletenessCheck> {
    try {
      const systemPrompt = `You are an expert at analyzing GitHub issue completeness. You specialize in ${context} assessment. Always respond with valid JSON. Be thorough and provide specific, actionable feedback.${templateContext || ''}`
      
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: systemPrompt
          },
          { role: 'user', content: prompt }
        ],
        temperature: 0.1,
        response_format: { type: 'json_object' },
        max_tokens: 1000
      })

      const result = JSON.parse(response.choices[0].message.content || '{}')
      
      // Validate and sanitize the response
      return {
        present: Boolean(result.present),
        confidence: Math.max(0, Math.min(1, Number(result.confidence) || 0)),
        quality: ['excellent', 'good', 'fair', 'poor', 'missing'].includes(result.quality) 
          ? result.quality 
          : 'missing',
        details: String(result.details || 'No details provided'),
        suggestions: Array.isArray(result.suggestions) 
          ? result.suggestions.map(String) 
          : []
      }

    } catch (error) {
      console.error(`AI analysis failed for ${context}:`, error)
      
      // Return fallback result
      return {
        present: false,
        confidence: 0,
        quality: 'missing',
        details: `Analysis failed for ${context}`,
        suggestions: [`Unable to analyze ${context} due to technical error`]
      }
    }
  }

  /**
   * Calculate overall completeness score
   */
  private calculateOverallScore(checks: CompletenessCheck[]): number {
    // Weights for different aspects (reproduction steps most important)
    const weights = [0.25, 0.20, 0.15, 0.15, 0.15, 0.10]
    
    const qualityScores = {
      excellent: 100,
      good: 80,
      fair: 60,
      poor: 40,
      missing: 0
    }

    let totalScore = 0
    let totalWeight = 0

    for (let i = 0; i < checks.length && i < weights.length; i++) {
      const check = checks[i]
      const baseScore = qualityScores[check.quality]
      const weightedScore = baseScore * check.confidence * weights[i]
      totalScore += weightedScore
      totalWeight += weights[i]
    }

    return Math.round(totalScore / totalWeight)
  }

  /**
   * Identify missing elements from analysis
   */
  private identifyMissingElements(checks: CompletenessCheck[]): string[] {
    const elements = [
      'reproduction steps',
      'expected vs actual behavior',
      'version information',
      'environment details',
      'error logs',
      'screenshots'
    ]

    return checks
      .map((check, index) => !check.present ? elements[index] : null)
      .filter(Boolean) as string[]
  }

  /**
   * Generate contextual suggestions based on missing elements
   */
  private generateSuggestions(missingElements: string[], issueData: IssueData): string[] {
    const suggestions: string[] = []
    
    if (missingElements.includes('reproduction steps')) {
      suggestions.push('Add step-by-step instructions to reproduce the issue')
    }
    if (missingElements.includes('expected vs actual behavior')) {
      suggestions.push('Describe what you expected to happen vs what actually happened')
    }
    if (missingElements.includes('version information')) {
      suggestions.push('Include version numbers (software, browser, OS)')
    }
    if (missingElements.includes('environment details')) {
      suggestions.push('Add environment details (OS, browser, device)')
    }
    if (missingElements.includes('error logs')) {
      suggestions.push('Include error messages, stack traces, or console output')
    }
    if (missingElements.includes('screenshots')) {
      suggestions.push('Add screenshots or visual evidence of the issue')
    }

    return suggestions
  }

  /**
   * Calculate overall confidence based on individual check confidences
   */
  private calculateConfidence(checks: CompletenessCheck[]): number {
    const totalConfidence = checks.reduce((sum, check) => sum + check.confidence, 0)
    return totalConfidence / checks.length
  }

  /**
   * Store analysis results in database
   */
  private async storeAnalysis(issueData: IssueData, analysis: CompletenessAnalysis): Promise<void> {
    try {
      // Find repository by full name
      const repository = await prisma.repository.findFirst({
        where: { fullName: issueData.repository }
      })

      if (!repository) {
        console.warn(`Repository ${issueData.repository} not found in database`)
        return
      }

      // Store or update analysis
      await prisma.completenessAnalysis.upsert({
        where: {
          repositoryId_issueNumber: {
            repositoryId: repository.id,
            issueNumber: issueData.number
          }
        },
        update: {
          overallScore: analysis.overallScore,
          reproductionSteps: analysis.reproductionSteps,
          expectedBehavior: analysis.expectedBehavior,
          versionInfo: analysis.versionInfo,
          environmentDetails: analysis.environmentDetails,
          errorLogs: analysis.errorLogs,
          screenshots: analysis.screenshots,
          confidence: analysis.confidence,
          processingTime: analysis.processingTime,
          analysisVersion: this.analysisVersion
        },
        create: {
          repositoryId: repository.id,
          issueNumber: issueData.number,
          overallScore: analysis.overallScore,
          reproductionSteps: analysis.reproductionSteps,
          expectedBehavior: analysis.expectedBehavior,
          versionInfo: analysis.versionInfo,
          environmentDetails: analysis.environmentDetails,
          errorLogs: analysis.errorLogs,
          screenshots: analysis.screenshots,
          confidence: analysis.confidence,
          processingTime: analysis.processingTime,
          analysisVersion: this.analysisVersion
        }
      })

    } catch (error) {
      console.error('Failed to store analysis:', error)
      // Don't throw error to avoid breaking the main analysis flow
    }
  }

  /**
   * Batch analyze multiple issues with progress tracking
   */
  async analyzeMultipleIssues(
    issues: IssueData[], 
    onProgress?: (current: number, total: number) => void
  ): Promise<CompletenessAnalysis[]> {
    const results: CompletenessAnalysis[] = []
    
    // Process issues in batches to respect rate limits
    const batchSize = 5
    for (let i = 0; i < issues.length; i += batchSize) {
      const batch = issues.slice(i, i + batchSize)
      
      const batchResults = await Promise.allSettled(
        batch.map(issue => this.analyzeIssue(issue))
      )
      
      batchResults.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          results.push(result.value)
        } else {
          console.error(`Failed to analyze issue ${batch[index].number}:`, result.reason)
        }
      })
      
      // Update progress
      if (onProgress) {
        onProgress(Math.min(i + batchSize, issues.length), issues.length)
      }
      
      // Add delay between batches to respect rate limits
      if (i + batchSize < issues.length) {
        await new Promise(resolve => setTimeout(resolve, 2000))
      }
    }
    
    return results
  }
}

// Export singleton instance
export const completenessAnalyzer = new CompletenessAnalyzer()
