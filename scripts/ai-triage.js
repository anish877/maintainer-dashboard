#!/usr/bin/env node

/**
 * AI Issue Triage Script for GitHub Actions
 * 
 * This script runs the AI-enhanced issue triage system
 * and applies labels automatically to GitHub issues.
 */

const { Octokit } = require('@octokit/rest');
const { OpenAI } = require('openai');

// Configuration from environment variables
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const REPO_OWNER = process.env.REPO_OWNER;
const REPO_NAME = process.env.REPO_NAME;

if (!GITHUB_TOKEN || !OPENAI_API_KEY || !REPO_OWNER || !REPO_NAME) {
  console.error('Missing required environment variables');
  process.exit(1);
}

// Initialize clients
const octokit = new Octokit({ auth: GITHUB_TOKEN });
const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

// Label mappings
const LABEL_MAPPINGS = {
  type: {
    bug: 'bug',
    feature: 'enhancement',
    question: 'question',
    documentation: 'documentation',
    enhancement: 'enhancement',
    task: 'task'
  },
  priority: {
    critical: 'priority: critical',
    high: 'priority: high',
    medium: 'priority: medium',
    low: 'priority: low'
  },
  difficulty: {
    'good first issue': 'good first issue',
    intermediate: 'difficulty: intermediate',
    advanced: 'difficulty: advanced',
    expert: 'difficulty: expert'
  },
  components: {
    authentication: 'area: auth',
    database: 'area: database',
    api: 'area: api',
    frontend: 'area: frontend',
    backend: 'area: backend',
    testing: 'area: testing',
    deployment: 'area: deployment',
    documentation: 'area: docs',
    general: 'area: general'
  }
};

/**
 * Fetch issue details from GitHub
 */
async function fetchIssue(issueNumber) {
  try {
    const { data: issue } = await octokit.rest.issues.get({
      owner: REPO_OWNER,
      repo: REPO_NAME,
      issue_number: issueNumber,
    });

    return {
      title: issue.title,
      body: issue.body || '',
      labels: issue.labels.map(label => typeof label === 'string' ? label : label.name),
      number: issue.number,
      user: issue.user?.login,
      created_at: issue.created_at,
      updated_at: issue.updated_at,
    };
  } catch (error) {
    console.error(`Error fetching issue ${issueNumber}:`, error.message);
    throw error;
  }
}

/**
 * AI-powered issue analysis using OpenAI
 */
async function analyzeIssueWithAI(issue) {
  const content = `${issue.title}\n\n${issue.body}`;
  
  try {
    // Get comprehensive analysis from AI
    const prompt = `
Analyze the following GitHub issue and provide a comprehensive assessment.

Issue content:
"${content}"

Please respond with a JSON object containing:
{
  "type": "bug|feature|question|documentation|enhancement|task",
  "priority": "critical|high|medium|low",
  "component": "authentication|database|api|frontend|backend|testing|deployment|documentation|general",
  "difficulty": "good first issue|intermediate|advanced|expert",
  "confidence": 0.0-1.0,
  "reasoning": {
    "type": "explanation for type classification",
    "priority": "explanation for priority assessment", 
    "component": "explanation for component identification",
    "difficulty": "explanation for difficulty estimation"
  },
  "suggestedLabels": ["list", "of", "suggested", "labels"],
  "isGoodFirstIssue": true/false
}

Consider these guidelines:
- Type: bug (something broken), feature (new functionality), question (help needed), documentation (docs related), enhancement (improvement), task (general work)
- Priority: critical (production issues, security), high (important features, major bugs), medium (regular work), low (nice-to-have)
- Component: based on the main area affected (auth, database, api, frontend, backend, testing, deployment, docs, or general)
- Difficulty: good first issue (simple, newcomer-friendly), intermediate (moderate complexity), advanced (complex), expert (very complex)
- Confidence: overall confidence in the analysis (0.0-1.0)
`;

    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.1,
    });

    const analysis = JSON.parse(response.choices[0].message.content || '{}');
    
    // Generate labels based on analysis
    const suggestedLabels = [
      LABEL_MAPPINGS.type[analysis.type],
      LABEL_MAPPINGS.priority[analysis.priority],
      LABEL_MAPPINGS.difficulty[analysis.difficulty],
      LABEL_MAPPINGS.components[analysis.component]
    ].filter(Boolean);

    // Add AI-generated labels if provided
    if (analysis.suggestedLabels) {
      suggestedLabels.push(...analysis.suggestedLabels);
    }

    // Add good first issue label if applicable
    if (analysis.isGoodFirstIssue || analysis.difficulty === 'good first issue') {
      suggestedLabels.push('good first issue');
    }

    return {
      ...analysis,
      suggestedLabels: [...new Set(suggestedLabels)], // Remove duplicates
    };
  } catch (error) {
    console.error(`Error analyzing issue ${issue.number}:`, error.message);
    
    // Fallback analysis
    return {
      type: 'task',
      priority: 'medium',
      component: 'general',
      difficulty: 'intermediate',
      confidence: 0.3,
      reasoning: {
        type: 'AI analysis failed, using fallback',
        priority: 'AI analysis failed, using fallback',
        component: 'AI analysis failed, using fallback',
        difficulty: 'AI analysis failed, using fallback'
      },
      suggestedLabels: ['task', 'priority: medium', 'difficulty: intermediate', 'area: general'],
      isGoodFirstIssue: false
    };
  }
}

/**
 * Apply labels to the issue
 */
async function applyLabels(issueNumber, labels) {
  if (labels.length === 0) return;

  try {
    await octokit.rest.issues.setLabels({
      owner: REPO_OWNER,
      repo: REPO_NAME,
      issue_number: issueNumber,
      labels: labels,
    });
    
    console.log(`✅ Applied labels to issue #${issueNumber}: ${labels.join(', ')}`);
  } catch (error) {
    console.error(`❌ Error applying labels to issue #${issueNumber}:`, error.message);
  }
}

/**
 * Main triage function
 */
async function triageIssue(issueNumber) {
  try {
    console.log(`🔍 Triaging issue #${issueNumber}...`);
    
    // Fetch issue
    const issue = await fetchIssue(issueNumber);
    
    // Skip if already has many labels (likely already triaged)
    if (issue.labels.length > 5) {
      console.log(`⏭️  Skipping issue #${issueNumber} - already has ${issue.labels.length} labels`);
      return;
    }
    
    // Analyze with AI
    const analysis = await analyzeIssueWithAI(issue);
    
    // Only apply labels if confidence is high enough
    if (analysis.confidence >= 0.6) {
      await applyLabels(issueNumber, analysis.suggestedLabels);
      
      console.log(`✅ Successfully triaged issue #${issueNumber}`);
      console.log(`   Type: ${analysis.type} (${Math.round(analysis.confidence * 100)}% confidence)`);
      console.log(`   Priority: ${analysis.priority}`);
      console.log(`   Component: ${analysis.component}`);
      console.log(`   Difficulty: ${analysis.difficulty}`);
      console.log(`   Good first issue: ${analysis.isGoodFirstIssue ? 'Yes' : 'No'}`);
    } else {
      console.log(`⚠️  Low confidence analysis for issue #${issueNumber} (${Math.round(analysis.confidence * 100)}%) - skipping label application`);
    }
    
    return analysis;
  } catch (error) {
    console.error(`❌ Failed to triage issue #${issueNumber}:`, error.message);
    return null;
  }
}

/**
 * Main execution
 */
async function main() {
  const issueNumbersInput = process.argv[2];
  
  if (!issueNumbersInput) {
    console.error('Usage: node ai-triage.js "1,2,3"');
    process.exit(1);
  }
  
  const issueNumbers = issueNumbersInput.split(',').map(num => parseInt(num.trim())).filter(num => !isNaN(num));
  
  if (issueNumbers.length === 0) {
    console.log('No valid issue numbers provided');
    return;
  }
  
  console.log(`🚀 Starting AI triage for ${issueNumbers.length} issue(s): ${issueNumbers.join(', ')}`);
  
  const results = [];
  
  for (const issueNumber of issueNumbers) {
    const result = await triageIssue(issueNumber);
    if (result) {
      results.push({ issueNumber, ...result });
    }
    
    // Add delay to respect rate limits
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  console.log(`\n📊 Triage Summary:`);
  console.log(`   Total issues: ${issueNumbers.length}`);
  console.log(`   Successfully triaged: ${results.length}`);
  console.log(`   Failed: ${issueNumbers.length - results.length}`);
  
  if (results.length > 0) {
    const avgConfidence = results.reduce((sum, r) => sum + r.confidence, 0) / results.length;
    console.log(`   Average confidence: ${Math.round(avgConfidence * 100)}%`);
    
    const goodFirstIssues = results.filter(r => r.isGoodFirstIssue).length;
    console.log(`   Good first issues identified: ${goodFirstIssues}`);
  }
}

// Run if called directly
if (require.main === module) {
  main().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

module.exports = { triageIssue, analyzeIssueWithAI };
