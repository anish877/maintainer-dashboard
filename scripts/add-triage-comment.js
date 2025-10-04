#!/usr/bin/env node

/**
 * Add Triage Comment Script
 * 
 * This script adds a comment to triaged issues with analysis details
 */

const { Octokit } = require('@octokit/rest');

// Configuration from environment variables
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const REPO_OWNER = process.env.REPO_OWNER;
const REPO_NAME = process.env.REPO_NAME;

if (!GITHUB_TOKEN || !REPO_OWNER || !REPO_NAME) {
  console.error('Missing required environment variables');
  process.exit(1);
}

const octokit = new Octokit({ auth: GITHUB_TOKEN });

/**
 * Add a comment to an issue with triage details
 */
async function addTriageComment(issueNumber, analysis) {
  try {
    const comment = `## 🤖 AI Issue Triage Analysis

**Analysis Summary:**
- **Type:** ${analysis.type} 
- **Priority:** ${analysis.priority}
- **Component:** ${analysis.component}
- **Difficulty:** ${analysis.difficulty}
- **Confidence:** ${Math.round(analysis.confidence * 100)}%
- **Good First Issue:** ${analysis.isGoodFirstIssue ? '✅ Yes' : '❌ No'}

**Applied Labels:**
${analysis.suggestedLabels.map(label => `- \`${label}\``).join('\n')}

**AI Reasoning:**
- **Type Classification:** ${analysis.reasoning.type}
- **Priority Assessment:** ${analysis.reasoning.priority}
- **Component Identification:** ${analysis.reasoning.component}
- **Difficulty Estimation:** ${analysis.reasoning.difficulty}

---
*This analysis was performed by our AI-powered issue triage system. If you believe any labels or classifications are incorrect, please feel free to adjust them or let us know!*`;

    await octokit.rest.issues.createComment({
      owner: REPO_OWNER,
      repo: REPO_NAME,
      issue_number: issueNumber,
      body: comment,
    });

    console.log(`✅ Added triage comment to issue #${issueNumber}`);
  } catch (error) {
    console.error(`❌ Error adding comment to issue #${issueNumber}:`, error.message);
  }
}

/**
 * Main execution
 */
async function main() {
  const issueNumbersInput = process.argv[2];
  
  if (!issueNumbersInput) {
    console.error('Usage: node add-triage-comment.js "1,2,3"');
    process.exit(1);
  }
  
  const issueNumbers = issueNumbersInput.split(',').map(num => parseInt(num.trim())).filter(num => !isNaN(num));
  
  if (issueNumbers.length === 0) {
    console.log('No valid issue numbers provided');
    return;
  }
  
  console.log(`💬 Adding triage comments to ${issueNumbers.length} issue(s)...`);
  
  for (const issueNumber of issueNumbers) {
    // For demo purposes, we'll create a mock analysis
    // In a real implementation, this would come from the triage results
    const mockAnalysis = {
      type: 'bug',
      priority: 'medium',
      component: 'general',
      difficulty: 'intermediate',
      confidence: 0.85,
      reasoning: {
        type: 'Issue describes unexpected behavior with clear reproduction steps',
        priority: 'Moderate impact affecting some users but not critical',
        component: 'General system issue not specific to one component',
        difficulty: 'Requires some debugging skills and system knowledge'
      },
      suggestedLabels: ['bug', 'priority: medium', 'difficulty: intermediate', 'area: general'],
      isGoodFirstIssue: false
    };
    
    await addTriageComment(issueNumber, mockAnalysis);
    
    // Add delay to respect rate limits
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  console.log(`✅ Completed adding comments to ${issueNumbers.length} issue(s)`);
}

// Run if called directly
if (require.main === module) {
  main().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

module.exports = { addTriageComment };
