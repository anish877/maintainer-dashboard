// Test script to verify real data and AI flow
const fetch = require('node-fetch');

async function testRealDataFlow() {
  console.log('🧪 Testing Real Data and AI Flow...\n');
  
  try {
    // Test 1: Verify API endpoint uses real GitHub data
    console.log('1️⃣ Testing API endpoint with real repository...');
    const response = await fetch('http://localhost:3003/api/stale-issues?repo=Anugra07/ios_ecom&days=30');
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ API Response received');
      console.log(`📊 Repository: ${data.repository}`);
      console.log(`📅 Days Threshold: ${data.daysThreshold}`);
      console.log(`🔍 Stale Issues Found: ${data.staleIssues}`);
      console.log(`📋 Cleanup Queue: ${data.cleanupQueue?.length || 0} items`);
      
      if (data.cleanupQueue && data.cleanupQueue.length > 0) {
        console.log('\n📝 Sample Analysis (Real AI):');
        const sample = data.cleanupQueue[0];
        console.log(`   Issue #${sample.issueNumber}`);
        console.log(`   Stale Reason: ${sample.analysis.staleReason}`);
        console.log(`   Confidence: ${Math.round(sample.analysis.confidence * 100)}%`);
        console.log(`   Reasoning: ${sample.analysis.reasoning}`);
        console.log(`   Suggested Action: ${sample.analysis.suggestedAction}`);
        console.log(`   Priority: ${sample.analysis.cleanupPriority}`);
      }
      
      console.log('\n📈 Summary (Real Data):');
      console.log(`   Total: ${data.summary?.total || 0}`);
      console.log(`   Critical: ${data.summary?.byPriority?.critical || 0}`);
      console.log(`   High: ${data.summary?.byPriority?.high || 0}`);
      console.log(`   Medium: ${data.summary?.byPriority?.medium || 0}`);
      console.log(`   Low: ${data.summary?.byPriority?.low || 0}`);
      
    } else {
      const errorData = await response.json();
      console.log('❌ API Error:', errorData.error);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run the test
testRealDataFlow();
