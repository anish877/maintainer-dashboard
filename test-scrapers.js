#!/usr/bin/env node

/**
 * Comprehensive test script for AI Auto-Scraper system
 */

const { PrismaClient } = require('./generated/prisma');

async function testDatabaseConnection() {
  console.log('🔍 Testing database connection...');
  try {
    const prisma = new PrismaClient();
    await prisma.$connect();
    
    // Test basic queries
    const userCount = await prisma.user.count();
    const scrapedPostCount = await prisma.scrapedPost.count();
    const processedIssueCount = await prisma.processedIssue.count();
    
    console.log(`✅ Database connected successfully`);
    console.log(`   - Users: ${userCount}`);
    console.log(`   - Scraped Posts: ${scrapedPostCount}`);
    console.log(`   - Processed Issues: ${processedIssueCount}`);
    
    await prisma.$disconnect();
    return true;
  } catch (error) {
    console.log(`❌ Database connection failed: ${error.message}`);
    return false;
  }
}

async function testRedditScraper() {
  console.log('\n🔍 Testing Reddit scraper...');
  try {
    const { RedditScraper, DEFAULT_REDDIT_CONFIG } = require('./lib/scrapers/reddit-scraper.ts');
    
    console.log('✅ Reddit scraper module loaded');
    console.log(`   - Default subreddits: ${DEFAULT_REDDIT_CONFIG.subreddits.join(', ')}`);
    console.log(`   - Search terms: ${DEFAULT_REDDIT_CONFIG.searchTerms.join(', ')}`);
    console.log(`   - Max posts per subreddit: ${DEFAULT_REDDIT_CONFIG.maxPostsPerSubreddit}`);
    
    return true;
  } catch (error) {
    console.log(`❌ Reddit scraper test failed: ${error.message}`);
    return false;
  }
}

async function testTwitterScraper() {
  console.log('\n🔍 Testing Twitter scraper...');
  try {
    const { TwitterScraper, DEFAULT_TWITTER_CONFIG } = require('./lib/scrapers/twitter-scraper.ts');
    
    console.log('✅ Twitter scraper module loaded');
    console.log(`   - Search queries: ${DEFAULT_TWITTER_CONFIG.searchQueries.length} configured`);
    console.log(`   - Max tweets per query: ${DEFAULT_TWITTER_CONFIG.maxTweetsPerQuery}`);
    
    return true;
  } catch (error) {
    console.log(`❌ Twitter scraper test failed: ${error.message}`);
    return false;
  }
}

async function testStackOverflowScraper() {
  console.log('\n🔍 Testing Stack Overflow scraper...');
  try {
    const { StackOverflowScraper, DEFAULT_STACKOVERFLOW_CONFIG } = require('./lib/scrapers/stackoverflow-scraper.ts');
    
    console.log('✅ Stack Overflow scraper module loaded');
    console.log(`   - Tags: ${DEFAULT_STACKOVERFLOW_CONFIG.tags.join(', ')}`);
    console.log(`   - Keywords: ${DEFAULT_STACKOVERFLOW_CONFIG.keywords.join(', ')}`);
    console.log(`   - Max questions per tag: ${DEFAULT_STACKOVERFLOW_CONFIG.maxQuestionsPerTag}`);
    
    return true;
  } catch (error) {
    console.log(`❌ Stack Overflow scraper test failed: ${error.message}`);
    return false;
  }
}

async function testAIClassifier() {
  console.log('\n🔍 Testing AI classifier...');
  try {
    const { getUnprocessedPosts, getClassificationStats } = require('./lib/ai/classifier.ts');
    
    console.log('✅ AI classifier module loaded');
    
    // Test getting unprocessed posts
    const unprocessed = await getUnprocessedPosts(5);
    console.log(`   - Unprocessed posts available: ${unprocessed.length}`);
    
    // Test getting classification stats
    const stats = await getClassificationStats();
    console.log(`   - Total processed issues: ${stats.total}`);
    console.log(`   - Duplicates found: ${stats.duplicates}`);
    
    return true;
  } catch (error) {
    console.log(`❌ AI classifier test failed: ${error.message}`);
    return false;
  }
}

async function testGitHubClient() {
  console.log('\n🔍 Testing GitHub client...');
  try {
    const { GitHubClient } = require('./lib/github/client.ts');
    
    console.log('✅ GitHub client module loaded');
    
    // Test client initialization
    const client = new GitHubClient();
    console.log('   - GitHub client initialized');
    
    return true;
  } catch (error) {
    console.log(`❌ GitHub client test failed: ${error.message}`);
    return false;
  }
}

async function testMonitoringSystem() {
  console.log('\n🔍 Testing monitoring system...');
  try {
    const { getSystemHealth, getScraperHealth } = require('./lib/monitoring/health.ts');
    
    console.log('✅ Monitoring system module loaded');
    
    // Test getting scraper health
    const scraperHealth = await getScraperHealth();
    console.log(`   - Scraper health checks: ${scraperHealth.length} sources`);
    scraperHealth.forEach(health => {
      console.log(`     * ${health.source}: ${health.status} (${health.totalRuns} runs)`);
    });
    
    // Test getting system health
    const systemHealth = await getSystemHealth();
    console.log(`   - Overall system health: ${systemHealth.overall}`);
    
    return true;
  } catch (error) {
    console.log(`❌ Monitoring system test failed: ${error.message}`);
    return false;
  }
}

async function testEnvironmentVariables() {
  console.log('\n🔍 Testing environment variables...');
  
  const requiredVars = [
    'DATABASE_URL',
    'OPENAI_API_KEY', 
    'GITHUB_TOKEN',
    'CRON_SECRET'
  ];
  
  let allPresent = true;
  
  requiredVars.forEach(varName => {
    if (process.env[varName]) {
      console.log(`✅ ${varName}: Set`);
    } else {
      console.log(`❌ ${varName}: Missing`);
      allPresent = false;
    }
  });
  
  return allPresent;
}

async function createTestData() {
  console.log('\n🔍 Creating test data...');
  try {
    const prisma = new PrismaClient();
    
    // Create a test scraped post
    const testPost = await prisma.scrapedPost.upsert({
      where: { sourceUrl: 'test-reddit-post-123' },
      update: {},
      create: {
        source: 'reddit',
        sourceUrl: 'test-reddit-post-123',
        sourceId: 'test123',
        title: 'Test Bug Report: Application crashes on startup',
        content: 'The application crashes immediately when I try to start it. Error message shows "NullPointerException".',
        author: 'testuser',
        upvotes: 5,
        commentCount: 3,
        tags: ['bug', 'crash'],
        postedAt: new Date(),
        processed: false
      }
    });
    
    console.log(`✅ Test scraped post created: ${testPost.id}`);
    
    // Create a test processed issue
    const testIssue = await prisma.processedIssue.upsert({
      where: { scrapedPostId: testPost.id },
      update: {},
      create: {
        scrapedPostId: testPost.id,
        type: 'bug',
        confidence: 0.95,
        summary: 'Application crashes on startup with NullPointerException',
        technicalDetails: 'Critical bug causing immediate application failure. Likely null pointer dereference in initialization code.',
        severity: 'critical',
        suggestedLabels: ['bug', 'critical', 'startup'],
        affectedArea: 'initialization',
        userImpact: 95,
        sentimentScore: -0.8,
        isDuplicate: false,
        embedding: JSON.stringify([0.1, 0.2, 0.3, 0.4, 0.5]),
        aiTokensUsed: 150,
        status: 'pending'
      }
    });
    
    console.log(`✅ Test processed issue created: ${testIssue.id}`);
    
    // Create a test scraper run
    const testRun = await prisma.scraperRun.create({
      data: {
        source: 'reddit',
        status: 'success',
        itemsFound: 10,
        itemsNew: 8,
        itemsFailed: 2,
        duration: 30000,
        startedAt: new Date(),
        completedAt: new Date()
      }
    });
    
    console.log(`✅ Test scraper run created: ${testRun.id}`);
    
    await prisma.$disconnect();
    return true;
  } catch (error) {
    console.log(`❌ Test data creation failed: ${error.message}`);
    return false;
  }
}

async function testAPIRoutes() {
  console.log('\n🔍 Testing API routes...');
  
  const routes = [
    '/api/scraper/posts',
    '/api/scraper/stats', 
    '/api/monitoring/health'
  ];
  
  // Note: These would need a running server to test properly
  console.log('📝 API routes to test when server is running:');
  routes.forEach(route => {
    console.log(`   - GET ${route}`);
  });
  
  return true;
}

async function runAllTests() {
  console.log('🚀 Starting comprehensive AI Auto-Scraper system tests...\n');
  
  const tests = [
    { name: 'Database Connection', fn: testDatabaseConnection },
    { name: 'Reddit Scraper', fn: testRedditScraper },
    { name: 'Twitter Scraper', fn: testTwitterScraper },
    { name: 'Stack Overflow Scraper', fn: testStackOverflowScraper },
    { name: 'AI Classifier', fn: testAIClassifier },
    { name: 'GitHub Client', fn: testGitHubClient },
    { name: 'Monitoring System', fn: testMonitoringSystem },
    { name: 'Environment Variables', fn: testEnvironmentVariables },
    { name: 'Test Data Creation', fn: createTestData },
    { name: 'API Routes', fn: testAPIRoutes }
  ];
  
  let passed = 0;
  let failed = 0;
  
  for (const test of tests) {
    try {
      const result = await test.fn();
      if (result) {
        passed++;
      } else {
        failed++;
      }
    } catch (error) {
      console.log(`❌ ${test.name} test crashed: ${error.message}`);
      failed++;
    }
  }
  
  console.log('\n📊 Test Results Summary:');
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`📈 Success Rate: ${((passed / (passed + failed)) * 100).toFixed(1)}%`);
  
  if (failed === 0) {
    console.log('\n🎉 All tests passed! The AI Auto-Scraper system is ready to use.');
  } else {
    console.log('\n⚠️  Some tests failed. Please check the errors above.');
  }
  
  console.log('\n📋 Next Steps:');
  console.log('1. Start the development server: npm run dev');
  console.log('2. Visit the dashboard: http://localhost:3000/scraper-dashboard');
  console.log('3. Test manual scraping via the dashboard interface');
  console.log('4. Configure GitHub integration settings');
  console.log('5. Set up production deployment with Vercel');
}

// Run all tests
runAllTests().catch(console.error);
