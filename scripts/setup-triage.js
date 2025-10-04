#!/usr/bin/env node

/**
 * Setup Script for AI Issue Triage System
 * 
 * This script helps users set up the issue triage system quickly
 * by creating necessary labels, checking permissions, and validating configuration.
 */

const { Octokit } = require('@octokit/rest');
const fs = require('fs');
const path = require('path');

// Default labels to create
const DEFAULT_LABELS = [
  // Priority labels
  { name: 'priority: critical', color: 'd73a49', description: 'Critical issues requiring immediate attention' },
  { name: 'priority: high', color: 'ff8c00', description: 'High priority issues' },
  { name: 'priority: medium', color: '0075ca', description: 'Medium priority issues' },
  { name: 'priority: low', color: '7057ff', description: 'Low priority issues' },
  
  // Type labels
  { name: 'bug', color: 'd73a49', description: 'Something isn\'t working' },
  { name: 'enhancement', color: 'a2eeef', description: 'New feature or request' },
  { name: 'question', color: 'd876e3', description: 'Further information is requested' },
  { name: 'documentation', color: '0075ca', description: 'Improvements or additions to documentation' },
  { name: 'task', color: '7057ff', description: 'General development task' },
  
  // Difficulty labels
  { name: 'good first issue', color: '7057ff', description: 'Good for newcomers' },
  { name: 'difficulty: intermediate', color: 'ff8c00', description: 'Intermediate difficulty' },
  { name: 'difficulty: advanced', color: 'd73a49', description: 'Advanced difficulty' },
  { name: 'difficulty: expert', color: 'b60205', description: 'Expert level difficulty' },
  
  // Area labels
  { name: 'area: auth', color: 'c5def5', description: 'Authentication and authorization' },
  { name: 'area: database', color: 'c5def5', description: 'Database related' },
  { name: 'area: api', color: 'c5def5', description: 'API endpoints and routes' },
  { name: 'area: frontend', color: 'c5def5', description: 'Frontend components and UI' },
  { name: 'area: backend', color: 'c5def5', description: 'Backend services and logic' },
  { name: 'area: testing', color: 'c5def5', description: 'Testing and quality assurance' },
  { name: 'area: deployment', color: 'c5def5', description: 'Deployment and infrastructure' },
  { name: 'area: docs', color: 'c5def5', description: 'Documentation' },
  { name: 'area: general', color: 'c5def5', description: 'General issues' },
  
  // AI labels
  { name: 'ai: triaged', color: '0e8a16', description: 'Issue has been analyzed by AI' },
  { name: 'ai: high-confidence', color: '0e8a16', description: 'High confidence AI analysis' },
  { name: 'ai: needs-review', color: 'fbca04', description: 'AI analysis needs human review' }
];

async function setupTriageSystem() {
  console.log('🚀 Setting up AI Issue Triage System\n');
  
  // Check environment variables
  const githubToken = process.env.GITHUB_TOKEN;
  const openaiApiKey = process.env.OPENAI_API_KEY;
  
  if (!githubToken) {
    console.error('❌ GITHUB_TOKEN environment variable is required');
    console.log('   Please set it with: export GITHUB_TOKEN=your_token');
    process.exit(1);
  }
  
  if (!openaiApiKey) {
    console.error('❌ OPENAI_API_KEY environment variable is required');
    console.log('   Please set it with: export OPENAI_API_KEY=your_key');
    process.exit(1);
  }
  
  // Get repository info from user or environment
  const repoOwner = process.env.REPO_OWNER || process.argv[2];
  const repoName = process.env.REPO_NAME || process.argv[3];
  
  if (!repoOwner || !repoName) {
    console.error('❌ Repository owner and name are required');
    console.log('   Usage: node setup-triage.js <owner> <repo>');
    console.log('   Or set REPO_OWNER and REPO_NAME environment variables');
    process.exit(1);
  }
  
  console.log(`📁 Repository: ${repoOwner}/${repoName}\n`);
  
  // Initialize GitHub client
  const octokit = new Octokit({ auth: githubToken });
  
  try {
    // Verify repository access
    console.log('🔐 Verifying repository access...');
    await octokit.rest.repos.get({
      owner: repoOwner,
      repo: repoName,
    });
    console.log('✅ Repository access verified\n');
    
    // Check permissions
    console.log('🔑 Checking permissions...');
    const { data: permissions } = await octokit.rest.repos.getCollaboratorPermissionLevel({
      owner: repoOwner,
      repo: repoName,
      username: 'me', // This will use the authenticated user
    });
    
    if (!['write', 'admin'].includes(permissions.permission)) {
      console.error('❌ Insufficient permissions. You need write or admin access to set up labels.');
      process.exit(1);
    }
    console.log(`✅ Permissions verified: ${permissions.permission}\n`);
    
    // Create labels
    console.log('🏷️  Creating labels...');
    let createdCount = 0;
    let existingCount = 0;
    
    for (const label of DEFAULT_LABELS) {
      try {
        await octokit.rest.issues.createLabel({
          owner: repoOwner,
          repo: repoName,
          name: label.name,
          color: label.color,
          description: label.description,
        });
        console.log(`   ✅ Created label: ${label.name}`);
        createdCount++;
      } catch (error) {
        if (error.status === 422) {
          console.log(`   ⏭️  Label already exists: ${label.name}`);
          existingCount++;
        } else {
          console.error(`   ❌ Failed to create label ${label.name}: ${error.message}`);
        }
      }
      
      // Add small delay to respect rate limits
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    console.log(`\n📊 Labels summary:`);
    console.log(`   Created: ${createdCount}`);
    console.log(`   Already existed: ${existingCount}`);
    console.log(`   Total: ${DEFAULT_LABELS.length}\n`);
    
    // Create GitHub Actions workflow
    console.log('⚙️  Setting up GitHub Actions workflow...');
    const workflowContent = `name: AI Issue Triage & Auto-Labeling

on:
  issues:
    types: [opened, edited]
  workflow_dispatch:
    inputs:
      issue_numbers:
        description: 'Comma-separated issue numbers to triage'
        required: false
        type: string

jobs:
  triage-issues:
    runs-on: ubuntu-latest
    permissions:
      issues: write
      contents: read
    
    steps:
      - name: Checkout repository
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'npm'

      - name: Install dependencies
        run: |
          npm install @octokit/rest openai

      - name: Determine issues to triage
        id: issues
        run: |
          if [ "${{ github.event_name }}" = "workflow_dispatch" ] && [ -n "${{ github.event.inputs.issue_numbers }}" ]; then
            ISSUES="${{ github.event.inputs.issue_numbers }}"
          elif [ "${{ github.event_name }}" = "issues" ]; then
            ISSUES="${{ github.event.issue.number }}"
          else
            ISSUES=$(gh issue list --state open --limit 10 --json number --jq '.[].number' | tr '\\n' ',' | sed 's/,$//')
          fi
          echo "issues=$ISSUES" >> $GITHUB_OUTPUT

      - name: Run AI Issue Triage
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}
          REPO_OWNER: ${{ github.repository_owner }}
          REPO_NAME: ${{ github.event.repository.name }}
        run: |
          node scripts/ai-triage.js "${{ steps.issues.outputs.issues }}"

      - name: Comment on triaged issues
        if: success()
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        run: |
          node scripts/add-triage-comment.js "${{ steps.issues.outputs.issues }}"`;

    // Check if .github/workflows directory exists
    const workflowsDir = path.join(process.cwd(), '.github', 'workflows');
    if (!fs.existsSync(workflowsDir)) {
      fs.mkdirSync(workflowsDir, { recursive: true });
    }
    
    const workflowFile = path.join(workflowsDir, 'ai-issue-triage.yml');
    
    if (fs.existsSync(workflowFile)) {
      console.log('   ⏭️  Workflow file already exists: .github/workflows/ai-issue-triage.yml');
    } else {
      fs.writeFileSync(workflowFile, workflowContent);
      console.log('   ✅ Created workflow file: .github/workflows/ai-issue-triage.yml');
    }
    
    // Create environment file template
    console.log('\n📝 Creating environment file template...');
    const envTemplate = `# GitHub Issue Triage Configuration
# Copy this file to .env and fill in your values

# GitHub Personal Access Token (required)
# Create at: https://github.com/settings/tokens
# Needs 'repo' scope for private repos or 'public_repo' for public repos
GITHUB_TOKEN=your_github_token_here

# OpenAI API Key (required)
# Get from: https://platform.openai.com/api-keys
OPENAI_API_KEY=your_openai_api_key_here

# Repository Configuration (optional - can be set via command line)
REPO_OWNER=${repoOwner}
REPO_NAME=${repoName}

# AI Configuration (optional)
AI_MODEL=gpt-3.5-turbo
CONFIDENCE_THRESHOLD=0.6
`;

    const envFile = '.env.triage.template';
    if (fs.existsSync(envFile)) {
      console.log(`   ⏭️  Environment template already exists: ${envFile}`);
    } else {
      fs.writeFileSync(envFile, envTemplate);
      console.log(`   ✅ Created environment template: ${envFile}`);
    }
    
    // Create configuration file
    console.log('\n⚙️  Creating configuration file...');
    const configContent = `# AI Issue Triage Configuration
repository:
  owner: "${repoOwner}"
  name: "${repoName}"

ai:
  model: "gpt-3.5-turbo"
  confidence_threshold: 0.6
  temperature: 0.1

team:
  # Add your team members here
  # - username: "alice"
  #   components: ["frontend", "ui"]
  #   expertise: ["react", "typescript", "css"]
  #   availability: "available"

automation:
  auto_apply_labels: true
  add_triage_comments: true
  suggest_assignees: false
  skip_if_many_labels: true
  max_existing_labels: 5
  delay_between_requests: 2000

features:
  detect_good_first_issues: true
  analyze_complexity: true
  assess_component_impact: true
`;

    const configFile = 'issue-triage-config.yml';
    if (fs.existsSync(configFile)) {
      console.log(`   ⏭️  Configuration file already exists: ${configFile}`);
    } else {
      fs.writeFileSync(configFile, configContent);
      console.log(`   ✅ Created configuration file: ${configFile}`);
    }
    
    // Final instructions
    console.log('\n🎉 Setup completed successfully!\n');
    console.log('📋 Next steps:');
    console.log('1. Copy .env.triage.template to .env and fill in your credentials');
    console.log('2. Add OPENAI_API_KEY to your repository secrets');
    console.log('3. Customize issue-triage-config.yml with your team details');
    console.log('4. Test the system by creating a new issue or running manually');
    console.log('\n🔧 Manual testing:');
    console.log(`   npm run triage:single "123,124,125"`);
    console.log('\n📚 Documentation:');
    console.log('   See README-ISSUE-TRIAGE.md for detailed usage instructions');
    
  } catch (error) {
    console.error(`❌ Setup failed: ${error.message}`);
    if (error.status === 401) {
      console.log('   Check your GitHub token permissions');
    } else if (error.status === 404) {
      console.log('   Repository not found or no access');
    } else if (error.status === 403) {
      console.log('   Rate limit exceeded or insufficient permissions');
    }
    process.exit(1);
  }
}

// Run setup if called directly
if (require.main === module) {
  setupTriageSystem().catch(error => {
    console.error('Setup failed:', error);
    process.exit(1);
  });
}

module.exports = { setupTriageSystem };
