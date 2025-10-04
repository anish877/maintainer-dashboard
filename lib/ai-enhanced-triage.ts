/**
 * AI-Enhanced Issue Triage System
 * 
 * This module extends the base GitHub issue triage with AI capabilities:
 * - OpenAI GPT integration for sophisticated content analysis
 * - Advanced issue clustering using embeddings
 * - Smart assignment recommendations
 * - Confidence scoring for all predictions
 */

import { OpenAI } from 'openai';
import { GitHubIssueTriage, IssueAnalysis, IssueType, Priority, Difficulty, TriageConfig } from './github-issue-triage';

export interface AIEnhancedConfig extends TriageConfig {
  openaiApiKey?: string; // Optional - can be retrieved from environment
  aiModel?: string;
  confidenceThreshold?: number;
}

export interface EnhancedIssueAnalysis extends IssueAnalysis {
  aiConfidence: {
    type: number;
    priority: number;
    component: number;
    difficulty: number;
  };
  aiReasoning: {
    type: string;
    priority: string;
    component: string;
    difficulty: string;
  };
  embeddings?: number[];
  similarIssues?: {
    issueNumber: number;
    similarity: number;
    reason: string;
  }[];
}

export class AIEnhancedIssueTriage extends GitHubIssueTriage {
  private openai: OpenAI;
  private aiConfig: AIEnhancedConfig;

  constructor(config: AIEnhancedConfig) {
    super(config);
    this.aiConfig = config;
    
    // Initialize OpenAI with API key from config or environment
    const apiKey = config.openaiApiKey || process.env.OPEN_AI_KEY;
    if (!apiKey) {
      throw new Error('OpenAI API key is required. Set openaiApiKey in config or OPEN_AI_KEY environment variable.');
    }
    
    this.openai = new OpenAI({
      apiKey: apiKey,
    });
  }

  /**
   * AI-enhanced issue analysis using OpenAI GPT
   */
  async analyzeIssueWithAI(issueNumber: number): Promise<EnhancedIssueAnalysis> {
    const issue = await this.fetchIssue(issueNumber);
    const content = `${issue.title}\n\n${issue.body}`;

    // Get AI analysis for all aspects
    const [typeAnalysis, priorityAnalysis, componentAnalysis, difficultyAnalysis] = await Promise.all([
      this.aiClassifyIssueType(content),
      this.aiAssessPriority(content),
      this.aiIdentifyComponent(content),
      this.aiEstimateDifficulty(content),
    ]);

    // Generate embeddings for clustering
    const embeddings = await this.generateEmbeddings(content);

    // Find similar issues using embeddings
    const similarIssues = await this.findSimilarIssues(embeddings, issueNumber);

    const analysis: EnhancedIssueAnalysis = {
      type: typeAnalysis.classification,
      priority: priorityAnalysis.classification,
      component: componentAnalysis.classification,
      difficulty: difficultyAnalysis.classification,
      confidence: (typeAnalysis.confidence + priorityAnalysis.confidence + componentAnalysis.confidence + difficultyAnalysis.confidence) / 4,
      aiConfidence: {
        type: typeAnalysis.confidence,
        priority: priorityAnalysis.confidence,
        component: componentAnalysis.confidence,
        difficulty: difficultyAnalysis.confidence,
      },
      aiReasoning: {
        type: typeAnalysis.reasoning,
        priority: priorityAnalysis.reasoning,
        component: componentAnalysis.reasoning,
        difficulty: difficultyAnalysis.reasoning,
      },
      suggestedLabels: this.generateLabels(
        typeAnalysis.classification,
        priorityAnalysis.classification,
        componentAnalysis.classification,
        difficultyAnalysis.classification
      ),
      suggestedAssignees: this.suggestAssignees(
        componentAnalysis.classification,
        typeAnalysis.classification
      ),
      relatedIssues: similarIssues.map(s => s.issueNumber),
      embeddings,
      similarIssues,
    };

    return analysis;
  }

  /**
   * AI-powered issue type classification using OpenAI
   */
  private async aiClassifyIssueType(content: string): Promise<{
    classification: IssueType;
    confidence: number;
    reasoning: string;
  }> {
    const prompt = `
Analyze the following GitHub issue and classify it into one of these types:
- bug: Something isn't working as expected
- feature: A new feature request or enhancement
- question: Asking for help or clarification
- documentation: Issues related to documentation
- enhancement: Improvements to existing features
- task: General development tasks

Issue content:
"${content}"

Respond in JSON format with:
{
  "classification": "bug|feature|question|documentation|enhancement|task",
  "confidence": 0.0-1.0,
  "reasoning": "Brief explanation of why this classification was chosen"
}`;

    try {
      const response = await this.openai.chat.completions.create({
        model: this.aiConfig.aiModel || 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.1,
      });

      const result = JSON.parse(response.choices[0].message.content || '{}');
      return {
        classification: result.classification as IssueType,
        confidence: result.confidence || 0.5,
        reasoning: result.reasoning || 'No reasoning provided',
      };
    } catch (error) {
      console.error('Error in AI type classification:', error);
      return {
        classification: IssueType.TASK,
        confidence: 0.3,
        reasoning: 'AI classification failed, using fallback',
      };
    }
  }

  /**
   * AI-powered priority assessment using OpenAI
   */
  private async aiAssessPriority(content: string): Promise<{
    classification: Priority;
    confidence: number;
    reasoning: string;
  }> {
    const prompt = `
Analyze the following GitHub issue and assess its priority level:
- critical: Production issues, security vulnerabilities, data loss
- high: Important features, major bugs, performance issues
- medium: Regular features, minor bugs, improvements
- low: Nice-to-have features, cosmetic issues, documentation

Issue content:
"${content}"

Consider factors like:
- Impact on users
- Severity of the problem
- Urgency of resolution
- Business importance

Respond in JSON format with:
{
  "classification": "critical|high|medium|low",
  "confidence": 0.0-1.0,
  "reasoning": "Brief explanation of priority assessment"
}`;

    try {
      const response = await this.openai.chat.completions.create({
        model: this.aiConfig.aiModel || 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.1,
      });

      const result = JSON.parse(response.choices[0].message.content || '{}');
      return {
        classification: result.classification as Priority,
        confidence: result.confidence || 0.5,
        reasoning: result.reasoning || 'No reasoning provided',
      };
    } catch (error) {
      console.error('Error in AI priority assessment:', error);
      return {
        classification: Priority.MEDIUM,
        confidence: 0.3,
        reasoning: 'AI priority assessment failed, using fallback',
      };
    }
  }

  /**
   * AI-powered component identification using OpenAI
   */
  private async aiIdentifyComponent(content: string): Promise<{
    classification: string;
    confidence: number;
    reasoning: string;
  }> {
    const prompt = `
Analyze the following GitHub issue and identify the main component or area it affects.
Common components include:
- authentication (login, auth, security)
- database (data storage, queries, migrations)
- api (endpoints, routes, controllers)
- frontend (UI, components, user interface)
- backend (server logic, services, middleware)
- testing (tests, coverage, quality assurance)
- deployment (CI/CD, infrastructure, DevOps)
- documentation (docs, guides, tutorials)
- general (unclear or multiple components)

Issue content:
"${content}"

Respond in JSON format with:
{
  "classification": "component_name",
  "confidence": 0.0-1.0,
  "reasoning": "Brief explanation of component identification"
}`;

    try {
      const response = await this.openai.chat.completions.create({
        model: this.aiConfig.aiModel || 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.1,
      });

      const result = JSON.parse(response.choices[0].message.content || '{}');
      return {
        classification: result.classification || 'general',
        confidence: result.confidence || 0.5,
        reasoning: result.reasoning || 'No reasoning provided',
      };
    } catch (error) {
      console.error('Error in AI component identification:', error);
      return {
        classification: 'general',
        confidence: 0.3,
        reasoning: 'AI component identification failed, using fallback',
      };
    }
  }

  /**
   * AI-powered difficulty estimation for "good first issue" detection
   */
  private async aiEstimateDifficulty(content: string): Promise<{
    classification: Difficulty;
    confidence: number;
    reasoning: string;
  }> {
    const prompt = `
Analyze the following GitHub issue and estimate its difficulty level:
- good first issue: Simple tasks suitable for newcomers (typos, small docs, simple UI changes)
- intermediate: Moderate complexity requiring some experience
- advanced: Complex tasks requiring deep knowledge
- expert: Very complex tasks requiring domain expertise

Consider factors like:
- Technical complexity
- Domain knowledge required
- Scope of changes
- Risk of breaking things

Issue content:
"${content}"

Respond in JSON format with:
{
  "classification": "good first issue|intermediate|advanced|expert",
  "confidence": 0.0-1.0,
  "reasoning": "Brief explanation of difficulty assessment"
}`;

    try {
      const response = await this.openai.chat.completions.create({
        model: this.aiConfig.aiModel || 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.1,
      });

      const result = JSON.parse(response.choices[0].message.content || '{}');
      return {
        classification: result.classification as Difficulty,
        confidence: result.confidence || 0.5,
        reasoning: result.reasoning || 'No reasoning provided',
      };
    } catch (error) {
      console.error('Error in AI difficulty estimation:', error);
      return {
        classification: Difficulty.INTERMEDIATE,
        confidence: 0.3,
        reasoning: 'AI difficulty estimation failed, using fallback',
      };
    }
  }

  /**
   * Generate embeddings for issue content using OpenAI
   */
  private async generateEmbeddings(content: string): Promise<number[]> {
    try {
      const response = await this.openai.embeddings.create({
        model: 'text-embedding-3-small',
        input: content,
      });

      return response.data[0].embedding;
    } catch (error) {
      console.error('Error generating embeddings:', error);
      return [];
    }
  }

  /**
   * Find similar issues using cosine similarity on embeddings
   */
  private async findSimilarIssues(embeddings: number[], excludeIssueNumber: number): Promise<{
    issueNumber: number;
    similarity: number;
    reason: string;
  }[]> {
    if (embeddings.length === 0) return [];

    try {
      // Get recent issues
      const { data: issues } = await this.octokit.rest.issues.listForRepo({
        owner: this.config.owner,
        repo: this.config.repo,
        state: 'open',
        per_page: 50,
      });

      const similarIssues = [];

      for (const issue of issues) {
        if (issue.number === excludeIssueNumber) continue;

        const issueContent = `${issue.title}\n\n${issue.body || ''}`;
        const issueEmbeddings = await this.generateEmbeddings(issueContent);
        
        if (issueEmbeddings.length === 0) continue;

        const similarity = this.cosineSimilarity(embeddings, issueEmbeddings);
        
        if (similarity > 0.7) { // Threshold for similarity
          similarIssues.push({
            issueNumber: issue.number,
            similarity,
            reason: `Similar content and context (${Math.round(similarity * 100)}% match)`,
          });
        }
      }

      return similarIssues.sort((a, b) => b.similarity - a.similarity).slice(0, 5);
    } catch (error) {
      console.error('Error finding similar issues:', error);
      return [];
    }
  }

  /**
   * Calculate cosine similarity between two vectors
   */
  private cosineSimilarity(vecA: number[], vecB: number[]): number {
    if (vecA.length !== vecB.length) return 0;

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < vecA.length; i++) {
      dotProduct += vecA[i] * vecB[i];
      normA += vecA[i] * vecA[i];
      normB += vecB[i] * vecB[i];
    }

    if (normA === 0 || normB === 0) return 0;

    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  /**
   * Enhanced triage with AI analysis
   */
  async triageIssueWithAI(issueNumber: number): Promise<EnhancedIssueAnalysis> {
    try {
      const analysis = await this.analyzeIssueWithAI(issueNumber);
      
      // Only apply labels if confidence is above threshold
      const threshold = this.aiConfig.confidenceThreshold || 0.6;
      if (analysis.confidence >= threshold) {
        await this.applyLabels(issueNumber, analysis.suggestedLabels);
      }

      return analysis;
    } catch (error) {
      console.error('Error during AI-enhanced issue triage:', error);
      throw error;
    }
  }

  /**
   * Batch AI triage for multiple issues
   */
  async triageMultipleIssuesWithAI(issueNumbers: number[]): Promise<EnhancedIssueAnalysis[]> {
    const results: EnhancedIssueAnalysis[] = [];
    
    for (const issueNumber of issueNumbers) {
      try {
        const analysis = await this.triageIssueWithAI(issueNumber);
        results.push(analysis);
        
        // Add delay to respect rate limits
        await new Promise(resolve => setTimeout(resolve, 2000));
      } catch (error) {
        console.error(`Failed to triage issue ${issueNumber} with AI:`, error);
      }
    }
    
    return results;
  }

  /**
   * Enhanced function call wrapper for AI assistant integration
   */
  async aiTriageIssuesFunction(issueNumbers: number[]): Promise<{
    success: boolean;
    results: EnhancedIssueAnalysis[];
    summary: {
      totalIssues: number;
      successfulTriages: number;
      failedTriages: number;
      averageConfidence: number;
      commonLabels: Record<string, number>;
      suggestedAssignees: string[];
      highConfidenceIssues: number;
      lowConfidenceIssues: number;
      similarIssueClusters: Record<string, number[]>;
    };
  }> {
    const results = await this.triageMultipleIssuesWithAI(issueNumbers);
    const successfulTriages = results.length;
    const failedTriages = issueNumbers.length - successfulTriages;
    
    // Calculate statistics
    const totalConfidence = results.reduce((sum, result) => sum + result.confidence, 0);
    const averageConfidence = successfulTriages > 0 ? totalConfidence / successfulTriages : 0;
    
    const highConfidenceIssues = results.filter(r => r.confidence >= 0.8).length;
    const lowConfidenceIssues = results.filter(r => r.confidence < 0.6).length;
    
    // Analyze common labels
    const labelCounts: Record<string, number> = {};
    const allAssignees: string[] = [];
    const similarClusters: Record<string, number[]> = {};
    
    results.forEach((result, index) => {
      result.suggestedLabels.forEach(label => {
        labelCounts[label] = (labelCounts[label] || 0) + 1;
      });
      allAssignees.push(...result.suggestedAssignees);
      
      // Group similar issues
      if (result.similarIssues && result.similarIssues.length > 0) {
        const clusterKey = `cluster_${index}`;
        similarClusters[clusterKey] = [issueNumbers[index], ...result.similarIssues.map(s => s.issueNumber)];
      }
    });
    
    return {
      success: successfulTriages > 0,
      results,
      summary: {
        totalIssues: issueNumbers.length,
        successfulTriages,
        failedTriages,
        averageConfidence,
        commonLabels: labelCounts,
        suggestedAssignees: [...new Set(allAssignees)],
        highConfidenceIssues,
        lowConfidenceIssues,
        similarIssueClusters: similarClusters,
      },
    };
  }
}

// Factory function for easy setup
export function createAIEnhancedTriage(config: AIEnhancedConfig): AIEnhancedIssueTriage {
  return new AIEnhancedIssueTriage(config);
}

/**
 * Create AI-enhanced triage system from NextAuth session
 * This is the recommended way to use the AI triage system in a Next.js app
 */
export async function createAIEnhancedTriageFromSession(owner: string, repo: string, openaiApiKey?: string): Promise<AIEnhancedIssueTriage> {
  const { createSessionBasedTriageConfig } = await import('./github-issue-triage');
  
  // Get session to extract user ID
  const { getServerSession } = await import('next-auth');
  const { authOptions } = await import('./auth');
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id) {
    throw new Error('User must be authenticated to use the AI triage system');
  }

  const baseConfig = await createSessionBasedTriageConfig(session.user.id, owner, repo);
  const aiConfig: AIEnhancedConfig = {
    ...baseConfig,
    openaiApiKey,
    aiModel: 'gpt-3.5-turbo',
    confidenceThreshold: 0.6,
  };
  
  return new AIEnhancedIssueTriage(aiConfig);
}
