/**
 * Intelligent Issue Triage & Auto-Labeling System
 * 
 * This module provides comprehensive issue triage capabilities including:
 * - AI-powered issue classification (type, priority, component, difficulty)
 * - Auto-labeling based on content analysis
 * - Team member expertise mapping and assignment suggestions
 * - Issue clustering by topic/feature
 * 
 * Designed for future AI assistant integration via function calls
 */

import { Octokit } from '@octokit/rest';

// Types for issue analysis
export interface IssueAnalysis {
  type: IssueType;
  priority: Priority;
  component: string;
  difficulty: Difficulty;
  confidence: number;
  suggestedLabels: string[];
  suggestedAssignees: string[];
  relatedIssues?: number[];
}

export enum IssueType {
  BUG = 'bug',
  FEATURE = 'feature',
  QUESTION = 'question',
  DOCUMENTATION = 'documentation',
  ENHANCEMENT = 'enhancement',
  TASK = 'task'
}

export enum Priority {
  CRITICAL = 'critical',
  HIGH = 'high',
  MEDIUM = 'medium',
  LOW = 'low'
}

export enum Difficulty {
  BEGINNER = 'good first issue',
  INTERMEDIATE = 'intermediate',
  ADVANCED = 'advanced',
  EXPERT = 'expert'
}

// Team expertise mapping
export interface TeamExpertise {
  username: string;
  components: string[];
  expertise: string[];
  availability: 'available' | 'busy' | 'unavailable';
}

// Configuration for the triage system
export interface TriageConfig {
  githubToken: string;
  owner: string;
  repo: string;
  teamExpertise: TeamExpertise[];
  labelMappings: LabelMappings;
  aiModel?: string;
}

export interface LabelMappings {
  type: Record<IssueType, string>;
  priority: Record<Priority, string>;
  difficulty: Record<Difficulty, string>;
  components: Record<string, string>;
}

export class GitHubIssueTriage {
  private octokit: Octokit;
  private config: TriageConfig;

  constructor(config: TriageConfig) {
    this.config = config;
    this.octokit = new Octokit({
      auth: config.githubToken,
    });
  }

  /**
   * Main entry point for issue triage
   * Analyzes an issue and applies appropriate labels and assignments
   */
  async triageIssue(issueNumber: number): Promise<IssueAnalysis> {
    try {
      // Fetch issue details
      const issue = await this.fetchIssue(issueNumber);
      
      // Analyze issue content
      const analysis = await this.analyzeIssue(issue);
      
      // Apply labels
      await this.applyLabels(issueNumber, analysis.suggestedLabels);
      
      // Suggest assignees (optional - requires write permissions)
      // await this.suggestAssignees(issueNumber, analysis.suggestedAssignees);
      
      return analysis;
    } catch (error) {
      console.error('Error during issue triage:', error);
      throw error;
    }
  }

  /**
   * Fetch issue details from GitHub
   */
  private async fetchIssue(issueNumber: number) {
    const { data: issue } = await this.octokit.rest.issues.get({
      owner: this.config.owner,
      repo: this.config.repo,
      issue_number: issueNumber,
    });

    return {
      title: issue.title,
      body: issue.body || '',
      labels: issue.labels.map(label => typeof label === 'string' ? label : label.name),
      assignees: issue.assignees?.map(a => a.login) || [],
      user: issue.user?.login,
      created_at: issue.created_at,
      updated_at: issue.updated_at,
    };
  }

  /**
   * AI-powered issue analysis
   * This is where the magic happens - analyzing issue content to determine:
   * - Type (bug/feature/question/documentation)
   * - Priority (critical/high/medium/low)
   * - Component affected
   * - Difficulty level (good first issue detection)
   */
  private async analyzeIssue(issue: any): Promise<IssueAnalysis> {
    const content = `${issue.title}\n\n${issue.body}`;
    
    // Type classification
    const type = await this.classifyIssueType(content);
    
    // Priority assessment
    const priority = await this.assessPriority(content);
    
    // Component identification
    const component = await this.identifyComponent(content);
    
    // Difficulty estimation
    const difficulty = await this.estimateDifficulty(content);
    
    // Generate suggested labels
    const suggestedLabels = this.generateLabels(type, priority, component, difficulty);
    
    // Suggest assignees based on expertise
    const suggestedAssignees = this.suggestAssignees(component, type);
    
    // Find related issues (clustering)
    const relatedIssues = await this.findRelatedIssues(issue);
    
    return {
      type,
      priority,
      component,
      difficulty,
      confidence: 0.85, // This would come from AI model confidence
      suggestedLabels,
      suggestedAssignees,
      relatedIssues,
    };
  }

  /**
   * Classify issue type using AI/NLP
   * TODO: Integrate with actual AI model (OpenAI, Hugging Face, etc.)
   */
  private async classifyIssueType(content: string): Promise<IssueType> {
    const lowerContent = content.toLowerCase();
    
    // Bug indicators
    const bugKeywords = ['bug', 'error', 'issue', 'broken', 'not working', 'fails', 'crash', 'exception'];
    const featureKeywords = ['feature', 'enhancement', 'improvement', 'add', 'new', 'request'];
    const questionKeywords = ['question', 'how to', 'help', 'support', 'documentation'];
    const docKeywords = ['docs', 'documentation', 'readme', 'guide', 'tutorial'];
    
    if (bugKeywords.some(keyword => lowerContent.includes(keyword))) {
      return IssueType.BUG;
    }
    
    if (featureKeywords.some(keyword => lowerContent.includes(keyword))) {
      return IssueType.FEATURE;
    }
    
    if (questionKeywords.some(keyword => lowerContent.includes(keyword))) {
      return IssueType.QUESTION;
    }
    
    if (docKeywords.some(keyword => lowerContent.includes(keyword))) {
      return IssueType.DOCUMENTATION;
    }
    
    // Default to task if unclear
    return IssueType.TASK;
  }

  /**
   * Assess issue priority based on content analysis
   * TODO: Integrate with actual AI model for more sophisticated analysis
   */
  private async assessPriority(content: string): Promise<Priority> {
    const lowerContent = content.toLowerCase();
    
    // Critical indicators
    const criticalKeywords = ['critical', 'urgent', 'production down', 'security', 'data loss', 'crash'];
    const highKeywords = ['high priority', 'important', 'blocking', 'performance'];
    const lowKeywords = ['nice to have', 'minor', 'cosmetic', 'enhancement'];
    
    if (criticalKeywords.some(keyword => lowerContent.includes(keyword))) {
      return Priority.CRITICAL;
    }
    
    if (highKeywords.some(keyword => lowerContent.includes(keyword))) {
      return Priority.HIGH;
    }
    
    if (lowKeywords.some(keyword => lowerContent.includes(keyword))) {
      return Priority.LOW;
    }
    
    return Priority.MEDIUM;
  }

  /**
   * Identify affected component/module
   * TODO: Integrate with project structure analysis
   */
  private async identifyComponent(content: string): Promise<string> {
    const lowerContent = content.toLowerCase();
    
    // Component patterns (customize based on your project structure)
    const componentPatterns = {
      'authentication': ['auth', 'login', 'signin', 'jwt', 'token'],
      'database': ['db', 'database', 'sql', 'query', 'migration'],
      'api': ['api', 'endpoint', 'route', 'controller'],
      'frontend': ['ui', 'component', 'react', 'vue', 'angular', 'frontend'],
      'backend': ['server', 'backend', 'service', 'middleware'],
      'testing': ['test', 'spec', 'coverage', 'unit test'],
      'deployment': ['deploy', 'ci/cd', 'docker', 'kubernetes'],
      'documentation': ['docs', 'readme', 'guide', 'tutorial'],
    };
    
    for (const [component, keywords] of Object.entries(componentPatterns)) {
      if (keywords.some(keyword => lowerContent.includes(keyword))) {
        return component;
      }
    }
    
    return 'general';
  }

  /**
   * Estimate issue difficulty for "good first issue" detection
   * TODO: Integrate with actual AI model for more sophisticated analysis
   */
  private async estimateDifficulty(content: string): Promise<Difficulty> {
    const lowerContent = content.toLowerCase();
    
    // Good first issue indicators
    const beginnerKeywords = ['typo', 'documentation', 'simple', 'easy', 'small', 'minor'];
    const expertKeywords = ['complex', 'architecture', 'performance', 'security', 'advanced'];
    
    if (beginnerKeywords.some(keyword => lowerContent.includes(keyword))) {
      return Difficulty.BEGINNER;
    }
    
    if (expertKeywords.some(keyword => lowerContent.includes(keyword))) {
      return Difficulty.EXPERT;
    }
    
    return Difficulty.INTERMEDIATE;
  }

  /**
   * Generate appropriate labels based on analysis
   */
  private generateLabels(type: IssueType, priority: Priority, component: string, difficulty: Difficulty): string[] {
    const labels: string[] = [];
    
    // Add type label
    if (this.config.labelMappings.type[type]) {
      labels.push(this.config.labelMappings.type[type]);
    }
    
    // Add priority label
    if (this.config.labelMappings.priority[priority]) {
      labels.push(this.config.labelMappings.priority[priority]);
    }
    
    // Add difficulty label
    if (this.config.labelMappings.difficulty[difficulty]) {
      labels.push(this.config.labelMappings.difficulty[difficulty]);
    }
    
    // Add component label
    if (this.config.labelMappings.components[component]) {
      labels.push(this.config.labelMappings.components[component]);
    }
    
    return labels;
  }

  /**
   * Suggest assignees based on expertise mapping
   */
  private suggestAssignees(component: string, type: IssueType): string[] {
    const availableExperts = this.config.teamExpertise.filter(
      expert => expert.availability === 'available'
    );
    
    const relevantExperts = availableExperts.filter(expert =>
      expert.components.includes(component) ||
      expert.expertise.includes(type)
    );
    
    return relevantExperts.map(expert => expert.username);
  }

  /**
   * Apply labels to the issue
   */
  private async applyLabels(issueNumber: number, labels: string[]): Promise<void> {
    if (labels.length === 0) return;
    
    await this.octokit.rest.issues.setLabels({
      owner: this.config.owner,
      repo: this.config.repo,
      issue_number: issueNumber,
      labels: labels,
    });
  }

  /**
   * Find related issues for clustering
   * TODO: Implement more sophisticated clustering algorithm
   */
  private async findRelatedIssues(currentIssue: any): Promise<number[]> {
    // Simple implementation - find issues with similar labels
    const { data: issues } = await this.octokit.rest.issues.listForRepo({
      owner: this.config.owner,
      repo: this.config.repo,
      state: 'open',
      labels: currentIssue.labels.join(','),
    });
    
    return issues
      .filter(issue => issue.number !== currentIssue.number)
      .slice(0, 5)
      .map(issue => issue.number);
  }

  /**
   * Batch triage multiple issues
   */
  async triageMultipleIssues(issueNumbers: number[]): Promise<IssueAnalysis[]> {
    const results: IssueAnalysis[] = [];
    
    for (const issueNumber of issueNumbers) {
      try {
        const analysis = await this.triageIssue(issueNumber);
        results.push(analysis);
        
        // Add delay to respect rate limits
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        console.error(`Failed to triage issue ${issueNumber}:`, error);
      }
    }
    
    return results;
  }

  /**
   * Function call wrapper for AI assistant integration
   * This is designed to be called by an AI assistant as a function
   */
  async triageIssuesFunction(issueNumbers: number[]): Promise<{
    success: boolean;
    results: IssueAnalysis[];
    summary: {
      totalIssues: number;
      successfulTriages: number;
      failedTriages: number;
      commonLabels: Record<string, number>;
      suggestedAssignees: string[];
    };
  }> {
    const results = await this.triageMultipleIssues(issueNumbers);
    const successfulTriages = results.length;
    const failedTriages = issueNumbers.length - successfulTriages;
    
    // Analyze common labels
    const labelCounts: Record<string, number> = {};
    const allAssignees: string[] = [];
    
    results.forEach(result => {
      result.suggestedLabels.forEach(label => {
        labelCounts[label] = (labelCounts[label] || 0) + 1;
      });
      allAssignees.push(...result.suggestedAssignees);
    });
    
    return {
      success: successfulTriages > 0,
      results,
      summary: {
        totalIssues: issueNumbers.length,
        successfulTriages,
        failedTriages,
        commonLabels: labelCounts,
        suggestedAssignees: [...new Set(allAssignees)],
      },
    };
  }
}

// Default configuration factory
export function createDefaultTriageConfig(githubToken: string, owner: string, repo: string): TriageConfig {
  return {
    githubToken,
    owner,
    repo,
    teamExpertise: [], // To be configured by user
    labelMappings: {
      type: {
        [IssueType.BUG]: 'bug',
        [IssueType.FEATURE]: 'enhancement',
        [IssueType.QUESTION]: 'question',
        [IssueType.DOCUMENTATION]: 'documentation',
        [IssueType.ENHANCEMENT]: 'enhancement',
        [IssueType.TASK]: 'task',
      },
      priority: {
        [Priority.CRITICAL]: 'priority: critical',
        [Priority.HIGH]: 'priority: high',
        [Priority.MEDIUM]: 'priority: medium',
        [Priority.LOW]: 'priority: low',
      },
      difficulty: {
        [Difficulty.BEGINNER]: 'good first issue',
        [Difficulty.INTERMEDIATE]: 'difficulty: intermediate',
        [Difficulty.ADVANCED]: 'difficulty: advanced',
        [Difficulty.EXPERT]: 'difficulty: expert',
      },
      components: {
        'authentication': 'area: auth',
        'database': 'area: database',
        'api': 'area: api',
        'frontend': 'area: frontend',
        'backend': 'area: backend',
        'testing': 'area: testing',
        'deployment': 'area: deployment',
        'documentation': 'area: docs',
        'general': 'area: general',
      },
    },
  };
}

// Export for easy function call integration
export { GitHubIssueTriage as IssueTriageService };
