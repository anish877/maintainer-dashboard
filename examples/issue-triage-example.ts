/**
 * Example usage of the AI-Enhanced Issue Triage System
 * 
 * This example demonstrates how to use the triage system
 * for both individual issues and batch processing.
 */

import { createAIEnhancedTriage, AIEnhancedConfig } from '../lib/ai-enhanced-triage';
import { createDefaultTriageConfig } from '../lib/github-issue-triage';

// Example configuration
const config: AIEnhancedConfig = {
  githubToken: process.env.GITHUB_TOKEN || 'your-github-token',
  openaiApiKey: process.env.OPENAI_API_KEY || 'your-openai-api-key',
  owner: 'your-username',
  repo: 'your-repository',
  aiModel: 'gpt-3.5-turbo',
  confidenceThreshold: 0.6,
  teamExpertise: [
    {
      username: 'alice',
      components: ['frontend', 'ui'],
      expertise: ['react', 'typescript', 'css'],
      availability: 'available'
    },
    {
      username: 'bob',
      components: ['backend', 'api'],
      expertise: ['nodejs', 'python', 'database'],
      availability: 'available'
    },
    {
      username: 'charlie',
      components: ['database', 'infrastructure'],
      expertise: ['postgresql', 'docker', 'kubernetes'],
      availability: 'busy'
    }
  ],
  labelMappings: createDefaultTriageConfig('', '', '').labelMappings
};

async function exampleUsage() {
  // Initialize the triage system
  const triageSystem = createAIEnhancedTriage(config);

  console.log('🤖 AI-Enhanced Issue Triage System Example\n');

  // Example 1: Triage a single issue
  console.log('📋 Example 1: Triaging a single issue');
  try {
    const singleIssueAnalysis = await triageSystem.triageIssueWithAI(123);
    
    console.log('Analysis Results:');
    console.log(`- Type: ${singleIssueAnalysis.type}`);
    console.log(`- Priority: ${singleIssueAnalysis.priority}`);
    console.log(`- Component: ${singleIssueAnalysis.component}`);
    console.log(`- Difficulty: ${singleIssueAnalysis.difficulty}`);
    console.log(`- Overall Confidence: ${Math.round(singleIssueAnalysis.confidence * 100)}%`);
    console.log(`- Suggested Labels: ${singleIssueAnalysis.suggestedLabels.join(', ')}`);
    console.log(`- Suggested Assignees: ${singleIssueAnalysis.suggestedAssignees.join(', ')}`);
    
    if (singleIssueAnalysis.similarIssues && singleIssueAnalysis.similarIssues.length > 0) {
      console.log('Similar Issues:');
      singleIssueAnalysis.similarIssues.forEach(similar => {
        console.log(`  - Issue #${similar.issueNumber} (${Math.round(similar.similarity * 100)}% similar): ${similar.reason}`);
      });
    }
  } catch (error) {
    console.error('Error triaging single issue:', error);
  }

  console.log('\n' + '='.repeat(50) + '\n');

  // Example 2: Batch triage multiple issues
  console.log('📋 Example 2: Batch triaging multiple issues');
  try {
    const issueNumbers = [124, 125, 126];
    const batchResults = await triageSystem.aiTriageIssuesFunction(issueNumbers);
    
    console.log('Batch Triage Summary:');
    console.log(`- Total Issues: ${batchResults.summary.totalIssues}`);
    console.log(`- Successful Triages: ${batchResults.summary.successfulTriages}`);
    console.log(`- Failed Triages: ${batchResults.summary.failedTriages}`);
    console.log(`- Average Confidence: ${Math.round(batchResults.summary.averageConfidence * 100)}%`);
    console.log(`- High Confidence Issues: ${batchResults.summary.highConfidenceIssues}`);
    console.log(`- Low Confidence Issues: ${batchResults.summary.lowConfidenceIssues}`);
    
    console.log('\nCommon Labels Applied:');
    Object.entries(batchResults.summary.commonLabels).forEach(([label, count]) => {
      console.log(`- ${label}: ${count} issues`);
    });
    
    console.log('\nSuggested Assignees:');
    batchResults.summary.suggestedAssignees.forEach(assignee => {
      console.log(`- ${assignee}`);
    });
    
    if (Object.keys(batchResults.summary.similarIssueClusters).length > 0) {
      console.log('\nIssue Clusters Found:');
      Object.entries(batchResults.summary.similarIssueClusters).forEach(([cluster, issues]) => {
        console.log(`- ${cluster}: Issues ${issues.join(', ')}`);
      });
    }
  } catch (error) {
    console.error('Error in batch triage:', error);
  }

  console.log('\n' + '='.repeat(50) + '\n');

  // Example 3: Function call for AI assistant integration
  console.log('📋 Example 3: Function call for AI assistant integration');
  try {
    const functionCallResult = await triageSystem.aiTriageIssuesFunction([127, 128, 129]);
    
    // This is how the AI assistant would receive the results
    const assistantResponse = {
      success: functionCallResult.success,
      message: functionCallResult.success 
        ? `Successfully triaged ${functionCallResult.summary.successfulTriages} out of ${functionCallResult.summary.totalIssues} issues with ${Math.round(functionCallResult.summary.averageConfidence * 100)}% average confidence.`
        : 'Failed to triage any issues.',
      details: {
        totalIssues: functionCallResult.summary.totalIssues,
        successfulTriages: functionCallResult.summary.successfulTriages,
        averageConfidence: functionCallResult.summary.averageConfidence,
        commonLabels: functionCallResult.summary.commonLabels,
        suggestedAssignees: functionCallResult.summary.suggestedAssignees
      }
    };
    
    console.log('AI Assistant Response:');
    console.log(JSON.stringify(assistantResponse, null, 2));
  } catch (error) {
    console.error('Error in function call example:', error);
  }
}

// Example of how this would be called by an AI assistant
async function aiAssistantIntegration() {
  console.log('\n🤖 AI Assistant Integration Example\n');
  
  const triageSystem = createAIEnhancedTriage(config);
  
  // Simulate an AI assistant request
  const assistantRequest = {
    function: 'aiTriageIssuesFunction',
    parameters: {
      issueNumbers: [130, 131, 132]
    }
  };
  
  console.log('AI Assistant Request:', JSON.stringify(assistantRequest, null, 2));
  
  try {
    const result = await triageSystem.aiTriageIssuesFunction(assistantRequest.parameters.issueNumbers);
    
    // Format response for AI assistant
    const response = {
      function: 'aiTriageIssuesFunction',
      result: {
        success: result.success,
        summary: {
          totalIssues: result.summary.totalIssues,
          successfulTriages: result.summary.successfulTriages,
          averageConfidence: Math.round(result.summary.averageConfidence * 100),
          goodFirstIssuesFound: result.results.filter(r => r.difficulty === 'good first issue').length,
          criticalIssuesFound: result.results.filter(r => r.priority === 'critical').length,
          commonLabels: result.summary.commonLabels,
          suggestedAssignees: result.summary.suggestedAssignees
        },
        message: result.success 
          ? `✅ Triage completed! Processed ${result.summary.totalIssues} issues with ${Math.round(result.summary.averageConfidence * 100)}% average confidence. Found ${result.results.filter(r => r.difficulty === 'good first issue').length} good first issues and ${result.results.filter(r => r.priority === 'critical').length} critical issues.`
          : '❌ Triage failed. Please check the logs for details.'
      }
    };
    
    console.log('\nAI Assistant Response:');
    console.log(JSON.stringify(response, null, 2));
  } catch (error) {
    console.error('Error in AI assistant integration:', error);
  }
}

// Run examples if this file is executed directly
if (require.main === module) {
  exampleUsage()
    .then(() => aiAssistantIntegration())
    .catch(error => {
      console.error('Example execution failed:', error);
      process.exit(1);
    });
}

export { exampleUsage, aiAssistantIntegration };
