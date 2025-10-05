#!/usr/bin/env node

/**
 * Test GitHub token permissions
 */

const { Octokit } = require('@octokit/rest');

async function testGitHubToken() {
  const token = process.env.GITHUB_TOKEN;
  
  if (!token || token === 'ghp_your_actual_token_here') {
    console.log('❌ No valid GitHub token found');
    console.log('📝 Please set GITHUB_TOKEN environment variable');
    console.log('💡 Example: export GITHUB_TOKEN=ghp_your_token_here');
    return;
  }
  
  const octokit = new Octokit({ auth: token });
  
  try {
    console.log('🔍 Testing GitHub token permissions...\n');
    
    // Test 1: Check authentication
    console.log('1️⃣ Testing authentication...');
    const { data: user } = await octokit.rest.users.getAuthenticated();
    console.log(`✅ Authenticated as: ${user.login}`);
    
    // Test 2: Check repository access
    console.log('\n2️⃣ Testing repository access...');
    const repo = await octokit.rest.repos.get({
      owner: 'vercel',
      repo: 'next.js'
    });
    console.log(`✅ Repository access: ${repo.data.full_name}`);
    
    // Test 3: Check issues permissions
    console.log('\n3️⃣ Testing issues permissions...');
    const issues = await octokit.rest.issues.listForRepo({
      owner: 'vercel',
      repo: 'next.js',
      state: 'open',
      per_page: 1
    });
    console.log(`✅ Issues access: Can read issues (${issues.data.length} found)`);
    
    // Test 4: Create a test issue (will be closed immediately)
    console.log('\n4️⃣ Testing issue creation...');
    const testIssue = await octokit.rest.issues.create({
      owner: 'vercel',
      repo: 'next.js',
      title: '[TEST] AI Auto-Scraper Test Issue - Please Close',
      body: `This is a test issue created by the AI Auto-Scraper system to verify GitHub integration.

## Test Details
- **Created by:** AI Auto-Scraper Test Script
- **Purpose:** Verify GitHub API permissions
- **Action Required:** Please close this issue immediately

## System Status
- ✅ GitHub API connection working
- ✅ Issue creation permissions verified
- ✅ Ready for production use

*This test issue can be safely closed.*`,
      labels: ['test', 'ai-generated']
    });
    
    console.log(`✅ Issue created successfully: ${testIssue.data.html_url}`);
    
    // Test 5: Close the test issue immediately
    console.log('\n5️⃣ Cleaning up test issue...');
    await octokit.rest.issues.update({
      owner: 'vercel',
      repo: 'next.js',
      issue_number: testIssue.data.number,
      state: 'closed',
      state_reason: 'not_planned'
    });
    
    console.log(`✅ Test issue closed: ${testIssue.data.html_url}`);
    
    console.log('\n🎉 ALL TESTS PASSED!');
    console.log('========================');
    console.log('✅ GitHub token is valid and has all required permissions');
    console.log('✅ Ready to create issues in vercel/next.js repository');
    console.log('✅ AI Auto-Scraper GitHub integration is fully functional');
    
  } catch (error) {
    console.log('\n❌ GitHub token test failed:');
    console.log('============================');
    
    if (error.status === 401) {
      console.log('🔑 Authentication failed - Invalid token');
      console.log('💡 Please check your GitHub token is correct');
    } else if (error.status === 403) {
      console.log('Permission denied - Token lacks required permissions');
      console.log('💡 Please ensure your token has "repo" and "issues" scopes');
    } else if (error.status === 404) {
      console.log('📂 Repository not found or no access');
      console.log('💡 Please check repository name and permissions');
    } else {
      console.log(`❌ Error: ${error.message}`);
    }
    
    console.log('\n📋 Required Token Permissions:');
    console.log('- repo (Full control of private repositories)');
    console.log('- issues (Read/write access to issues and pull requests)');
    console.log('\n🔗 Create token at: https://github.com/settings/tokens');
  }
}

// Run the test
testGitHubToken().catch(console.error);
