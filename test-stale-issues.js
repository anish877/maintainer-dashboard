// Test script for Stale Issue Resolver
const fetch = require('node-fetch');

async function testStaleIssues() {
  console.log('🧪 Testing Stale Issue Resolver...\n');
  
  try {
    // Test 1: Scan for stale issues
    console.log('1️⃣ Testing stale issues scan...');
    const scanResponse = await fetch('http://localhost:3003/api/stale-issues?repo=Anugra07/ios_ecom&days=30');
    
    if (scanResponse.ok) {
      const scanData = await scanResponse.json();
      console.log('✅ Scan successful!');
      console.log(`📊 Found ${scanData.staleIssues} stale issues`);
      console.log(`📋 Cleanup queue: ${scanData.cleanupQueue?.length || 0} items`);
      console.log('📈 Summary:', scanData.summary);
    } else {
      console.log('❌ Scan failed:', scanResponse.status);
    }
    
    // Test 2: Test comment action (if issues found)
    console.log('\n2️⃣ Testing comment action...');
    const commentResponse = await fetch('http://localhost:3003/api/stale-issues', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'comment',
        repository: 'Anugra07/ios_ecom',
        issueNumber: 1, // Test with issue #1
        analysis: {
          isStale: true,
          staleReason: 'needs_update',
          confidence: 0.8,
          reasoning: 'Test comment',
          suggestedAction: 'comment',
          cleanupPriority: 'medium'
        }
      })
    });
    
    if (commentResponse.ok) {
      const commentData = await commentResponse.json();
      console.log('✅ Comment action successful!');
      console.log('📝 Message:', commentData.message);
    } else {
      console.log('❌ Comment action failed:', commentResponse.status);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run the test
testStaleIssues();
