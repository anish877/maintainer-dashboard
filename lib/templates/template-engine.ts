/**
 * Professional Template Engine for Issue Completeness Checker
 * 
 * This module handles template management, variable substitution, and styling
 * for automated comments on incomplete GitHub issues.
 */

import { prisma } from '@/lib/prisma'
import { CompletenessAnalysis } from '@/lib/ai/completeness-analyzer'

// Template structure types
export interface TemplateVariable {
  name: string
  description: string
  type: 'text' | 'number' | 'date' | 'list' | 'url' | 'boolean'
  required: boolean
  defaultValue?: string
  options?: string[] // For list type
}

export interface TemplateStyle {
  primaryColor: string
  secondaryColor: string
  accentColor: string
  fontFamily: string
  fontSize: 'sm' | 'base' | 'lg' | 'xl'
  spacing: 'compact' | 'normal' | 'spacious'
  includeLogo: boolean
  includeFooter: boolean
  headerStyle: 'minimal' | 'detailed' | 'professional'
  footerStyle: 'minimal' | 'detailed' | 'professional'
}

export interface TemplateContent {
  header: string
  body: string
  footer: string
}

export interface CompletenessTemplate {
  id: string
  name: string
  description?: string
  category: 'BUG_REPORT' | 'FEATURE_REQUEST' | 'QUESTION' | 'DOCUMENTATION' | 'PERFORMANCE_ISSUE' | 'SECURITY_ISSUE' | 'CUSTOM'
  template: TemplateContent
  variables: TemplateVariable[]
  styling: TemplateStyle
  conditions: {
    minQualityScore?: number
    maxQualityScore?: number
    requiredMissingElements?: string[]
    issueTypes?: string[]
    repositories?: string[]
  }
  isActive: boolean
  requiresApproval: boolean
  autoApply: boolean
}

export interface IssueData {
  title: string
  body: string
  number: number
  url: string
  author: string
  repository: string
  createdAt?: string
  labels?: string[]
}

export interface GeneratedComment {
  content: string
  templateId: string
  templateName: string
  variables: Record<string, any>
  styling: TemplateStyle
}

export class TemplateEngine {
  private defaultVariables: TemplateVariable[] = [
    {
      name: 'issue_title',
      description: 'The title of the issue',
      type: 'text',
      required: true
    },
    {
      name: 'issue_number',
      description: 'The issue number',
      type: 'number',
      required: true
    },
    {
      name: 'issue_author',
      description: 'The username of the issue author',
      type: 'text',
      required: true
    },
    {
      name: 'issue_url',
      description: 'The URL to the issue',
      type: 'url',
      required: true
    },
    {
      name: 'repository_name',
      description: 'The repository name (owner/repo)',
      type: 'text',
      required: true
    },
    {
      name: 'missing_elements',
      description: 'List of missing elements',
      type: 'list',
      required: false,
      defaultValue: ''
    },
    {
      name: 'quality_score',
      description: 'The quality score of the issue',
      type: 'number',
      required: false,
      defaultValue: '0'
    },
    {
      name: 'current_date',
      description: 'Current date',
      type: 'date',
      required: false
    },
    {
      name: 'maintainer_name',
      description: 'Name of the maintainer team',
      type: 'text',
      required: false,
      defaultValue: 'Maintainer Team'
    },
    {
      name: 'completeness_percentage',
      description: 'Percentage of completeness',
      type: 'number',
      required: false,
      defaultValue: '0'
    }
  ]

  /**
   * Generate a comment using a template
   */
  async generateComment(
    templateId: string,
    issueData: IssueData,
    analysis: CompletenessAnalysis,
    customVariables: Record<string, any> = {}
  ): Promise<GeneratedComment> {
    const template = await this.getTemplate(templateId)
    if (!template) {
      throw new Error(`Template ${templateId} not found`)
    }

    // Check if template conditions are met
    if (!this.matchesConditions(template, issueData, analysis)) {
      throw new Error(`Template ${templateId} conditions not met`)
    }

    // Prepare variables
    const variables = this.prepareVariables(template, issueData, analysis, customVariables)

    // Generate content
    const content = this.processTemplate(template.template, variables, template.styling)

    return {
      content,
      templateId,
      templateName: template.name,
      variables,
      styling: template.styling
    }
  }

  /**
   * Get template by ID
   */
  async getTemplate(templateId: string): Promise<CompletenessTemplate | null> {
    try {
      const template = await prisma.completenessTemplate.findUnique({
        where: { id: templateId }
      })

      if (!template) return null

      return this.mapPrismaToTemplate(template)
    } catch (error) {
      console.error('Failed to get template:', error)
      return null
    }
  }

  /**
   * Get templates for repository
   */
  async getTemplatesForRepository(repositoryId: string): Promise<CompletenessTemplate[]> {
    try {
      const templates = await prisma.completenessTemplate.findMany({
        where: {
          OR: [
            { repositoryId: repositoryId },
            { repositoryId: null } // Global templates
          ],
          isActive: true
        },
        orderBy: [
          { isDefault: 'desc' },
          { usageCount: 'desc' },
          { createdAt: 'desc' }
        ]
      })

      return templates.map(template => this.mapPrismaToTemplate(template))
    } catch (error) {
      console.error('Failed to get templates for repository:', error)
      return []
    }
  }

  /**
   * Create a new template
   */
  async createTemplate(
    templateData: Omit<CompletenessTemplate, 'id'>,
    createdById: string,
    repositoryId?: string
  ): Promise<CompletenessTemplate> {
    try {
      const template = await prisma.completenessTemplate.create({
        data: {
          name: templateData.name,
          description: templateData.description,
          category: templateData.category,
          template: templateData.template,
          variables: templateData.variables,
          styling: templateData.styling,
          conditions: templateData.conditions,
          isActive: templateData.isActive,
          requiresApproval: templateData.requiresApproval,
          autoApply: templateData.autoApply,
          createdById,
          repositoryId
        }
      })

      return this.mapPrismaToTemplate(template)
    } catch (error) {
      console.error('Failed to create template:', error)
      throw new Error(`Failed to create template: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Update an existing template
   */
  async updateTemplate(
    templateId: string,
    updates: Partial<CompletenessTemplate>
  ): Promise<CompletenessTemplate> {
    try {
      const template = await prisma.completenessTemplate.update({
        where: { id: templateId },
        data: {
          name: updates.name,
          description: updates.description,
          category: updates.category,
          template: updates.content,
          variables: updates.variables,
          styling: updates.styling,
          conditions: updates.conditions,
          isActive: updates.isActive,
          requiresApproval: updates.requiresApproval,
          autoApply: updates.autoApply
        }
      })

      return this.mapPrismaToTemplate(template)
    } catch (error) {
      console.error('Failed to update template:', error)
      throw new Error(`Failed to update template: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Delete a template
   */
  async deleteTemplate(templateId: string): Promise<void> {
    try {
      await prisma.completenessTemplate.delete({
        where: { id: templateId }
      })
    } catch (error) {
      console.error('Failed to delete template:', error)
      throw new Error(`Failed to delete template: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Get default templates
   */
  getDefaultTemplates(): CompletenessTemplate[] {
    return [
      {
        id: 'default-bug-report',
        name: 'Bug Report Template',
        description: 'Standard template for incomplete bug reports',
        category: 'BUG_REPORT',
        content: {
          header: '## 📋 Issue Completeness Check',
          body: `Thanks for reporting this issue! To help maintainers understand and resolve it more effectively, could you please add the following information:

**Current Quality Score: {{quality_score}}/100**

### Missing Information:
{{missing_elements}}

### Suggested Improvements:
- 💡 Add step-by-step reproduction instructions
- 💡 Describe expected vs actual behavior
- 💡 Include version information and environment details
- 💡 Add error logs or screenshots if applicable

### Template for This Issue:
\`\`\`markdown
## Bug Report: {{issue_title}}

### Steps to Reproduce
1. 
2. 
3. 

### Expected Behavior
<!-- What did you expect to happen? -->

### Actual Behavior  
<!-- What actually happened? -->

### Environment
- **Version:** 
- **Browser:** 
- **OS:** 

### Additional Information
<!-- Error logs, screenshots, etc. -->
\`\`\``,
          footer: `*This analysis was performed by the Issue Completeness Checker. Once you add the missing information, we can re-analyze the issue.*`
        },
        variables: this.defaultVariables,
        styling: this.getDefaultStyling(),
        conditions: {
          minQualityScore: 0,
          maxQualityScore: 80,
          requiredMissingElements: ['reproduction steps']
        },
        isActive: true,
        requiresApproval: true,
        autoApply: false
      },
      {
        id: 'default-feature-request',
        name: 'Feature Request Template',
        description: 'Standard template for incomplete feature requests',
        category: 'FEATURE_REQUEST',
        content: {
          header: '## 🚀 Feature Request Completeness Check',
          body: `Thanks for suggesting this feature! To help maintainers evaluate and implement it effectively, could you please provide more details:

**Current Quality Score: {{quality_score}}/100**

### Missing Information:
{{missing_elements}}

### Suggested Improvements:
- 💡 Describe the problem this feature would solve
- 💡 Provide use cases and examples
- 💡 Explain the expected behavior
- 💡 Consider alternative solutions`,
          footer: `*This analysis was performed by the Issue Completeness Checker.*`
        },
        variables: this.defaultVariables,
        styling: this.getDefaultStyling(),
        conditions: {
          minQualityScore: 0,
          maxQualityScore: 70
        },
        isActive: true,
        requiresApproval: true,
        autoApply: false
      }
    ]
  }

  /**
   * Check if template conditions are met
   */
  public matchesConditions(
    template: CompletenessTemplate,
    issueData: IssueData,
    analysis: CompletenessAnalysis
  ): boolean {
    const conditions = template.conditions

    // Check quality score range
    if (conditions.minQualityScore !== undefined && analysis.overallScore < conditions.minQualityScore) {
      return false
    }
    if (conditions.maxQualityScore !== undefined && analysis.overallScore > conditions.maxQualityScore) {
      return false
    }

    // Check required missing elements
    if (conditions.requiredMissingElements && conditions.requiredMissingElements.length > 0) {
      const hasRequiredElements = conditions.requiredMissingElements.some(
        element => analysis.missingElements.includes(element)
      )
      if (!hasRequiredElements) return false
    }

    // Check issue types (based on labels or content analysis)
    if (conditions.issueTypes && conditions.issueTypes.length > 0) {
      const hasMatchingType = conditions.issueTypes.some(
        type => issueData.labels.includes(type.toLowerCase())
      )
      if (!hasMatchingType) return false
    }

    return true
  }

  /**
   * Prepare variables for template substitution
   */
  private prepareVariables(
    template: CompletenessTemplate,
    issueData: IssueData,
    analysis: CompletenessAnalysis,
    customVariables: Record<string, any>
  ): Record<string, any> {
    const variables: Record<string, any> = {
      issue_title: issueData.title,
      issue_number: issueData.number,
      issue_author: issueData.author,
      issue_url: issueData.url,
      repository_name: issueData.repository,
      missing_elements: analysis.missingElements.map(el => `- ❌ ${el}`).join('\n'),
      quality_score: analysis.overallScore,
      completeness_percentage: analysis.overallScore,
      current_date: new Date().toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      }),
      maintainer_name: 'Maintainer Team',
      ...customVariables
    }

    return variables
  }

  /**
   * Process template with variable substitution and styling
   */
  private processTemplate(
    content: TemplateContent,
    variables: Record<string, any>,
    styling: TemplateStyle
  ): string {
    let processedContent = ''

    // Process header
    if (content.header) {
      processedContent += this.substituteVariables(content.header, variables) + '\n\n'
    }

    // Process body
    if (content.body) {
      processedContent += this.substituteVariables(content.body, variables) + '\n\n'
    }

    // Process footer
    if (content.footer) {
      processedContent += this.substituteVariables(content.footer, variables)
    }

    // Apply styling
    return this.applyStyling(processedContent, styling)
  }

  /**
   * Substitute variables in template content
   */
  private substituteVariables(content: string, variables: Record<string, any>): string {
    let processed = content

    Object.entries(variables).forEach(([key, value]) => {
      const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g')
      processed = processed.replace(regex, String(value))
    })

    return processed
  }

  /**
   * Apply styling to the content
   */
  private applyStyling(content: string, styling: TemplateStyle): string {
    let styled = content

    // Apply font size adjustments
    if (styling.fontSize === 'lg') {
      styled = styled.replace(/^### /gm, '#### ')
    } else if (styling.fontSize === 'xl') {
      styled = styled.replace(/^### /gm, '##### ')
    }

    // Apply spacing adjustments
    if (styling.spacing === 'spacious') {
      styled = styled.replace(/\n\n/g, '\n\n\n')
    } else if (styling.spacing === 'compact') {
      styled = styled.replace(/\n\n\n/g, '\n\n')
    }

    // Add professional formatting
    if (styling.headerStyle === 'professional') {
      styled = styled.replace(/^## /gm, '## 🎯 ')
    }

    return styled.trim()
  }

  /**
   * Get default styling configuration
   */
  public getDefaultStyling(): TemplateStyle {
    return {
      primaryColor: '#8B5CF6',
      secondaryColor: '#6B7280',
      accentColor: '#10B981',
      fontFamily: 'Inter, system-ui, sans-serif',
      fontSize: 'base',
      spacing: 'normal',
      includeLogo: false,
      includeFooter: true,
      headerStyle: 'professional',
      footerStyle: 'minimal'
    }
  }

  /**
   * Map Prisma model to Template interface
   */
  private mapPrismaToTemplate(template: any): CompletenessTemplate {
    return {
      id: template.id,
      name: template.name,
      description: template.description,
      category: template.category,
      template: template.template,
      variables: template.variables || [],
      styling: template.styling || this.getDefaultStyling(),
      conditions: template.conditions || {},
      isActive: template.isActive,
      requiresApproval: template.requiresApproval,
      autoApply: template.autoApply
    }
  }
}

// Export singleton instance
export const templateEngine = new TemplateEngine()
