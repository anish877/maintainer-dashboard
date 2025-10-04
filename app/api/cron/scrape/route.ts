import { NextResponse } from 'next/server';
import { RedditScraper, DEFAULT_REDDIT_CONFIG } from '@/lib/scrapers/reddit-scraper';
import { TwitterScraper, DEFAULT_TWITTER_CONFIG } from '@/lib/scrapers/twitter-scraper';
import { StackOverflowScraper, DEFAULT_STACKOVERFLOW_CONFIG } from '@/lib/scrapers/stackoverflow-scraper';
import { processNewPosts } from '@/lib/ai/classifier';

export async function GET(request: Request) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET || 'dev-secret';
  
  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  const startTime = Date.now();
  const results = {
    reddit: { success: false, posts: 0, error: null },
    twitter: { success: false, posts: 0, error: null },
    stackoverflow: { success: false, posts: 0, error: null },
    ai: { success: false, processed: 0, error: null },
    totalDuration: 0
  };
  
  try {
    console.log('🚀 Starting AI Auto-Scraper cron job...');
    
    // Run Reddit scraper
    try {
      console.log('📱 Scraping Reddit...');
      const redditScraper = new RedditScraper(DEFAULT_REDDIT_CONFIG);
      await redditScraper.scrape();
      results.reddit.success = true;
      console.log('✅ Reddit scraping completed');
    } catch (error) {
      results.reddit.error = error instanceof Error ? error.message : 'Unknown error';
      console.error('❌ Reddit scraping failed:', error);
    }
    
    // Run Twitter scraper
    try {
      console.log('🐦 Scraping Twitter...');
      const twitterScraper = new TwitterScraper(DEFAULT_TWITTER_CONFIG);
      await twitterScraper.scrape();
      results.twitter.success = true;
      console.log('✅ Twitter scraping completed');
    } catch (error) {
      results.twitter.error = error instanceof Error ? error.message : 'Unknown error';
      console.error('❌ Twitter scraping failed:', error);
    }
    
    // Run Stack Overflow scraper
    try {
      console.log('📚 Scraping Stack Overflow...');
      const soScraper = new StackOverflowScraper(DEFAULT_STACKOVERFLOW_CONFIG);
      await soScraper.scrape();
      results.stackoverflow.success = true;
      console.log('✅ Stack Overflow scraping completed');
    } catch (error) {
      results.stackoverflow.error = error instanceof Error ? error.message : 'Unknown error';
      console.error('❌ Stack Overflow scraping failed:', error);
    }
    
    // Process new posts with AI
    try {
      console.log('🤖 Processing posts with AI...');
      const aiResults = await processNewPosts(20);
      results.ai.success = true;
      results.ai.processed = aiResults.length;
      console.log(`✅ AI processing completed: ${aiResults.length} posts classified`);
    } catch (error) {
      results.ai.error = error instanceof Error ? error.message : 'Unknown error';
      console.error('❌ AI processing failed:', error);
    }
    
    results.totalDuration = Date.now() - startTime;
    
    const successCount = [results.reddit, results.twitter, results.stackoverflow, results.ai]
      .filter(r => r.success).length;
    
    console.log(`🎉 Cron job completed in ${results.totalDuration}ms (${successCount}/4 tasks successful)`);
    
    return NextResponse.json({ 
      success: true, 
      message: `Scraping completed: ${successCount}/4 tasks successful`,
      results,
      duration: results.totalDuration
    });
    
  } catch (error) {
    console.error('💥 Cron job failed:', error);
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error',
      results,
      duration: Date.now() - startTime
    }, { status: 500 });
  }
}

// Manual trigger endpoint for testing
export async function POST(request: Request) {
  const { source } = await request.json();
  
  if (!source || !['reddit', 'twitter', 'stackoverflow', 'ai'].includes(source)) {
    return NextResponse.json({ error: 'Invalid source' }, { status: 400 });
  }
  
  try {
    let result;
    
    switch (source) {
      case 'reddit':
        const redditScraper = new RedditScraper(DEFAULT_REDDIT_CONFIG);
        await redditScraper.scrape();
        result = { message: 'Reddit scraping completed' };
        break;
        
      case 'twitter':
        const twitterScraper = new TwitterScraper(DEFAULT_TWITTER_CONFIG);
        await twitterScraper.scrape();
        result = { message: 'Twitter scraping completed' };
        break;
        
      case 'stackoverflow':
        const soScraper = new StackOverflowScraper(DEFAULT_STACKOVERFLOW_CONFIG);
        await soScraper.scrape();
        result = { message: 'Stack Overflow scraping completed' };
        break;
        
      case 'ai':
        const aiResults = await processNewPosts(20);
        result = { 
          message: 'AI processing completed',
          processed: aiResults.length
        };
        break;
    }
    
    return NextResponse.json(result);
    
  } catch (error) {
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}
