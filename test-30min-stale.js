// Test script for 30-minute stale issue detection
const fetch = require('node-fetch');

async function test30MinStale() {
  console.log('🧪 Testing 30-Minute Stale Issue Detection...\n');
  
  try {
    // Test with 30 minutes threshold
    console.log('1️⃣ Testing with 30 minutes threshold...');
    const response = await fetch('http://localhost:3003/api/stale-issues?repo=Anugra07/ios_ecom&days=30');
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ API Response received');
      console.log(`📊 Repository: ${data.repository}`);
      console.log(`⏰ Minutes Threshold: 30 minutes`);
      console.log(`🔍 Stale Issues Found: ${data.staleIssues}`);
      console.log(`📋 Cleanup Queue: ${data.cleanupQueue?.length || 0} items`);
      
      if (data.cleanupQueue && data.cleanupQueue.length > 0) {
        console.log('\n📝 Sample Analysis (Real AI with 30-min threshold):');
        data.cleanupQueue.forEach((issue, index) => {
          console.log(`\n   Issue #${issue.issueNumber}:`);
          console.log(`   Stale Reason: ${issue.analysis.staleReason}`);
          console.log(`   Confidence: ${Math.round(issue.analysis.confidence * 100)}%`);
          console.log(`   Reasoning: ${issue.analysis.reasoning}`);
          console.log(`   Suggested Action: ${issue.analysis.suggestedAction}`);
          console.log(`   Priority: ${issue.analysis.cleanupPriority}`);
          console.log(`   Minutes Since Activity: ${issue.daysSinceActivity}`);
        });
      } else {
        console.log('\n📝 No stale issues found in the last 30 minutes');
        console.log('💡 Try with a longer threshold or check if there are recent issues');
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
    
    // Test with different thresholds
    console.log('\n2️⃣ Testing with different minute thresholds...');
    const thresholds = [5, 15, 30, 60];
    
    for (const threshold of thresholds) {
      try {
        const testResponse = await fetch(`http://localhost:3003/api/stale-issues?repo=Anugra07/ios_ecom&days=${threshold}`);
        if (testResponse.ok) {
          const testData = await testResponse.json();
          console.log(`   ${threshold} minutes: ${testData.staleIssues} stale issues`);
        }
      } catch (err) {
        console.log(`   ${threshold} minutes: Error`);
      }
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run the test
test30MinStale();
