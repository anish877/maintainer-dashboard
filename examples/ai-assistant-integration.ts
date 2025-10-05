/**
 * AI Assistant Integration Example
 * 
 * This example demonstrates how the issue triage system would integrate
 * with an AI assistant as a function call, enabling users to request
 * issue triage through natural language commands.
 */

import { createAIEnhancedTriage, AIEnhancedConfig } from '../lib/ai-enhanced-triage';

// Mock AI Assistant class to demonstrate integration
class AIAssistant {
  private functions: Map<string, Function> = new Map();
  private triageSystem: any;

  constructor(triageSystem: any) {
    this.triageSystem = triageSystem;
    this.registerFunctions();
  }

  private registerFunctions() {
    // Register the triage function
    this.functions.set('triageIssues', {
      name: 'triageIssues',
      description: 'Analyze and categorize GitHub issues automatically. Can triage single or multiple issues.',
      parameters: {
        type: 'object',
        properties: {
          issueNumbers: {
            type: 'array',
            items: { type: 'number' },
            description: 'Array of GitHub issue numbers to triage'
          },
          includeComments: {
            type: 'boolean',
            description: 'Whether to add detailed analysis comments to the issues',
            default: true
          }
        },
        required: ['issueNumbers']
      },
      handler: this.triageIssuesFunction.bind(this)
    });

    this.functions.set('analyzeRepository', {
      name: 'analyzeRepository',
      description: 'Get a comprehensive analysis of all open issues in the repository',
      parameters: {
        type: 'object',
        properties: {
          limit: {
            type: 'number',
            description: 'Maximum number of issues to analyze',
            default: 20
          },
          includeStats: {
            type: 'boolean',
            description: 'Include statistical analysis',
            default: true
          }
        }
      },
      handler: this.analyzeRepositoryFunction.bind(this)
    });
  }

  /**
   * Main triage function that would be called by the AI assistant
   */
  async triageIssuesFunction(parameters: { issueNumbers: number[], includeComments?: boolean }) {
    try {
      const { issueNumbers, includeComments = true } = parameters;
      
      console.log(`🤖 AI Assistant: Starting triage for issues ${issueNumbers.join(', ')}...`);
      
      const result = await this.triageSystem.aiTriageIssuesFunction(issueNumbers);
      
      // Format response for the user
      const response = {
        success: result.success,
        message: this.formatTriageMessage(result),
        details: {
          totalIssues: result.summary.totalIssues,
          successfulTriages: result.summary.successfulTriages,
          averageConfidence: Math.round(result.summary.averageConfidence * 100),
          goodFirstIssues: result.results.filter(r => r.difficulty === 'good first issue').length,
          criticalIssues: result.results.filter(r => r.priority === 'critical').length,
          highPriorityIssues: result.results.filter(r => r.priority === 'high').length,
          commonLabels: result.summary.commonLabels,
          suggestedAssignees: result.summary.suggestedAssignees,
          similarIssueClusters: result.summary.similarIssueClusters
        }
      };

      if (includeComments) {
        console.log('💬 Adding analysis comments to issues...');
        // In a real implementation, this would add comments to the issues
      }

      return response;
    } catch (error) {
      return {
        success: false,
        message: `❌ Failed to triage issues: ${error.message}`,
        error: error.message
      };
    }
  }

  /**
   * Repository analysis function
   */
  async analyzeRepositoryFunction(parameters: { limit?: number, includeStats?: boolean }) {
    try {
      const { limit = 20, includeStats = true } = parameters;
      
      console.log(`🔍 AI Assistant: Analyzing repository issues (limit: ${limit})...`);
      
      // Get recent open issues
      const issues = await this.getRecentIssues(limit);
      const issueNumbers = issues.map(issue => issue.number);
      
      if (issueNumbers.length === 0) {
        return {
          success: true,
          message: '📭 No open issues found in the repository.',
          details: { totalIssues: 0 }
        };
      }
      
      const result = await this.triageSystem.aiTriageIssuesFunction(issueNumbers);
      
      const analysis = this.generateRepositoryAnalysis(result, includeStats);
      
      return {
        success: true,
        message: this.formatRepositoryAnalysisMessage(analysis),
        details: analysis
      };
    } catch (error) {
      return {
        success: false,
        message: `❌ Failed to analyze repository: ${error.message}`,
        error: error.message
      };
    }
  }

  /**
   * Format triage results into a user-friendly message
   */
  private formatTriageMessage(result: any): string {
    const { summary } = result;
    
    if (!result.success) {
      return '❌ Issue triage failed. Please check the logs for details.';
    }
    
    const goodFirstIssues = result.results.filter(r => r.difficulty === 'good first issue').length;
    const criticalIssues = result.results.filter(r => r.priority === 'critical').length;
    const highPriorityIssues = result.results.filter(r => r.priority === 'high').length;
    
    let message = `✅ Successfully triaged ${summary.successfulTriages} out of ${summary.totalIssues} issues with ${Math.round(summary.averageConfidence * 100)}% average confidence.\n\n`;
    
    if (criticalIssues > 0) {
      message += `🚨 Found ${criticalIssues} critical issue(s) that need immediate attention.\n`;
    }
    
    if (highPriorityIssues > 0) {
      message += `🔥 Identified ${highPriorityIssues} high priority issue(s).\n`;
    }
    
    if (goodFirstIssues > 0) {
      message += `🌟 Discovered ${goodFirstIssues} good first issue(s) for new contributors.\n`;
    }
    
    // Add top labels
    const topLabels = Object.entries(summary.commonLabels)
      .sort(([,a], [,b]) => (b as number) - (a as number))
      .slice(0, 3);
    
    if (topLabels.length > 0) {
      message += `\n🏷️ Most common labels: ${topLabels.map(([label, count]) => `${label} (${count})`).join(', ')}`;
    }
    
    // Add suggested assignees
    if (summary.suggestedAssignees.length > 0) {
      message += `\n👥 Suggested assignees: ${summary.suggestedAssignees.join(', ')}`;
    }
    
    return message;
  }

  /**
   * Generate comprehensive repository analysis
   */
  private generateRepositoryAnalysis(result: any, includeStats: boolean) {
    const { results, summary } = result;
    
    const analysis = {
      totalIssues: summary.totalIssues,
      successfulTriages: summary.successfulTriages,
      averageConfidence: Math.round(summary.averageConfidence * 100),
      
      // Issue type distribution
      typeDistribution: {
        bugs: results.filter(r => r.type === 'bug').length,
        features: results.filter(r => r.type === 'feature').length,
        questions: results.filter(r => r.type === 'question').length,
        documentation: results.filter(r => r.type === 'documentation').length,
        tasks: results.filter(r => r.type === 'task').length
      },
      
      // Priority distribution
      priorityDistribution: {
        critical: results.filter(r => r.priority === 'critical').length,
        high: results.filter(r => r.priority === 'high').length,
        medium: results.filter(r => r.priority === 'medium').length,
        low: results.filter(r => r.priority === 'low').length
      },
      
      // Component distribution
      componentDistribution: results.reduce((acc: any, r: any) => {
        acc[r.component] = (acc[r.component] || 0) + 1;
        return acc;
      }, {}),
      
      // Difficulty distribution
      difficultyDistribution: {
        'good first issue': results.filter(r => r.difficulty === 'good first issue').length,
        intermediate: results.filter(r => r.difficulty === 'intermediate').length,
        advanced: results.filter(r => r.difficulty === 'advanced').length,
        expert: results.filter(r => r.difficulty === 'expert').length
      },
      
      // Common labels
      commonLabels: summary.commonLabels,
      
      // Suggested assignees
      suggestedAssignees: summary.suggestedAssignees,
      
      // Similar issue clusters
      similarIssueClusters: summary.similarIssueClusters
    };
    
    if (includeStats) {
      analysis['statistics'] = {
        highConfidenceIssues: summary.highConfidenceIssues,
        lowConfidenceIssues: summary.lowConfidenceIssues,
        confidenceRate: Math.round((summary.highConfidenceIssues / summary.successfulTriages) * 100),
        clusteringEfficiency: Object.keys(summary.similarIssueClusters).length
      };
    }
    
    return analysis;
  }

  /**
   * Format repository analysis into a user-friendly message
   */
  private formatRepositoryAnalysisMessage(analysis: any): string {
    let message = `📊 Repository Analysis Complete!\n\n`;
    
    message += `📈 **Overview:**\n`;
    message += `• Total issues analyzed: ${analysis.totalIssues}\n`;
    message += `• Average confidence: ${analysis.averageConfidence}%\n`;
    message += `• Good first issues: ${analysis.difficultyDistribution['good first issue']}\n\n`;
    
    message += `🏷️ **Issue Types:**\n`;
    Object.entries(analysis.typeDistribution).forEach(([type, count]) => {
      if (count > 0) {
        message += `• ${type}: ${count}\n`;
      }
    });
    
    message += `\n⚡ **Priority Levels:**\n`;
    Object.entries(analysis.priorityDistribution).forEach(([priority, count]) => {
      if (count > 0) {
        const emoji = priority === 'critical' ? '🚨' : priority === 'high' ? '🔥' : priority === 'medium' ? '⚡' : '📝';
        message += `${emoji} ${priority}: ${count}\n`;
      }
    });
    
    message += `\n🧩 **Components:**\n`;
    Object.entries(analysis.componentDistribution)
      .sort(([,a], [,b]) => (b as number) - (a as number))
      .slice(0, 5)
      .forEach(([component, count]) => {
        message += `• ${component}: ${count}\n`;
      });
    
    if (analysis.suggestedAssignees.length > 0) {
      message += `\n👥 **Suggested Assignees:** ${analysis.suggestedAssignees.join(', ')}`;
    }
    
    if (analysis.statistics) {
      message += `\n\n📊 **Statistics:**\n`;
      message += `• High confidence analyses: ${analysis.statistics.highConfidenceIssues}\n`;
      message += `• Confidence rate: ${analysis.statistics.confidenceRate}%\n`;
      message += `• Issue clusters found: ${analysis.statistics.clusteringEfficiency}`;
    }
    
    return message;
  }

  /**
   * Mock function to get recent issues
   */
  private async getRecentIssues(limit: number) {
    // In a real implementation, this would fetch from GitHub API
    return Array.from({ length: Math.min(limit, 10) }, (_, i) => ({
      number: 100 + i,
      title: `Sample Issue ${i + 1}`,
      body: `This is a sample issue for demonstration purposes.`
    }));
  }

  /**
   * Process user command
   */
  async processCommand(command: string) {
    console.log(`👤 User: ${command}`);
    
    // Simple command parsing (in a real implementation, this would use NLP)
    if (command.includes('triage') && command.includes('issue')) {
      const issueNumbers = this.extractIssueNumbers(command);
      if (issueNumbers.length > 0) {
        return await this.triageIssuesFunction({ issueNumbers });
      } else {
        return {
          success: false,
          message: '❌ Please specify issue numbers to triage. Example: "triage issues 123, 124, 125"'
        };
      }
    }
    
    if (command.includes('analyze') && command.includes('repository')) {
      const limit = this.extractNumber(command) || 20;
      return await this.analyzeRepositoryFunction({ limit });
    }
    
    return {
      success: false,
      message: '❓ I can help you triage issues or analyze the repository. Try commands like:\n• "Triage issues 123, 124, 125"\n• "Analyze repository (limit 20)"'
    };
  }

  /**
   * Extract issue numbers from command
   */
  private extractIssueNumbers(command: string): number[] {
    const matches = command.match(/\d+/g);
    return matches ? matches.map(Number) : [];
  }

  /**
   * Extract number from command
   */
  private extractNumber(command: string): number | null {
    const match = command.match(/(\d+)/);
    return match ? parseInt(match[1]) : null;
  }
}

/**
 * Example usage demonstrating AI assistant integration
 */
async function demonstrateAIAssistantIntegration() {
  console.log('🤖 AI Assistant Integration Demo\n');
  
  // Initialize the triage system
  const config: AIEnhancedConfig = {
    githubToken: process.env.GITHUB_TOKEN || 'demo-token',
    openaiApiKey: process.env.OPENAI_API_KEY || 'demo-key',
    owner: 'demo-user',
    repo: 'demo-repo',
    teamExpertise: [],
    labelMappings: {
      type: { bug: 'bug', feature: 'enhancement', question: 'question', documentation: 'documentation', enhancement: 'enhancement', task: 'task' },
      priority: { critical: 'priority: critical', high: 'priority: high', medium: 'priority: medium', low: 'priority: low' },
      difficulty: { 'good first issue': 'good first issue', intermediate: 'difficulty: intermediate', advanced: 'difficulty: advanced', expert: 'difficulty: expert' },
      components: { authentication: 'area: auth', database: 'area: database', api: 'area: api', frontend: 'area: frontend', backend: 'area: backend', testing: 'area: testing', deployment: 'area: deployment', documentation: 'area: docs', general: 'area: general' }
    }
  };
  
  const triageSystem = createAIEnhancedTriage(config);
  const assistant = new AIAssistant(triageSystem);
  
  // Example 1: User requests to triage specific issues
  console.log('📋 Example 1: Triage specific issues');
  const response1 = await assistant.processCommand('Please triage issues 123, 124, and 125');
  console.log(`🤖 Assistant: ${response1.message}\n`);
  
  // Example 2: User requests repository analysis
  console.log('📋 Example 2: Analyze repository');
  const response2 = await assistant.processCommand('Can you analyze the repository and show me the statistics?');
  console.log(`🤖 Assistant: ${response2.message}\n`);
  
  // Example 3: User requests help
  console.log('📋 Example 3: Help request');
  const response3 = await assistant.processCommand('What can you help me with?');
  console.log(`🤖 Assistant: ${response3.message}\n`);
  
  // Example 4: Direct function calls (how the AI would call the functions)
  console.log('📋 Example 4: Direct function calls');
  const directResult = await assistant.triageIssuesFunction({ issueNumbers: [126, 127] });
  console.log(`🤖 Direct Result: ${directResult.message}\n`);
}

// Export for use in other modules
export { AIAssistant, demonstrateAIAssistantIntegration };

// Run demo if called directly
if (require.main === module) {
  demonstrateAIAssistantIntegration().catch(error => {
    console.error('Demo failed:', error);
    process.exit(1);
  });
}
