import { prisma } from '@/lib/prisma';

interface RedditScraperConfig {
  subreddits: string[];
  searchTerms: string[];
  maxPostsPerSubreddit: number;
}

export class RedditScraper {
  private config: RedditScraperConfig;
  
  constructor(config: RedditScraperConfig) {
    this.config = config;
  }
  
  async scrape() {
    const runRecord = await this.createRunRecord();
    const runId = runRecord.id;
    
    try {
      // Use headless browser for reliable scraping
      const result = await this.scrapeWithBrowser();
      await this.completeRunRecord(runId, 'success', null, result.totalNew);
      console.log(`Reddit scraping completed. Found ${result.totalNew} new posts.`);
      
      return { totalFound: result.totalNew, totalNew: result.totalNew, failedItems: 0 };
      
    } catch (error) {
      await this.completeRunRecord(runId, 'failed', error);
      console.error('Reddit scraping failed:', error);
      return { totalFound: 0, totalNew: 0, failedItems: 1 };
    }
  }

  private async scrapeWithBrowser(): Promise<{ totalNew: number }> {
    const { chromium } = await import('playwright');
    
    const browser = await chromium.launch({ 
      headless: true,
      args: [
        '--disable-blink-features=AutomationControlled',
        '--disable-web-security',
        '--disable-features=VizDisplayCompositor',
        '--no-sandbox',
        '--disable-dev-shm-usage'
      ]
    });
    
    const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      viewport: { width: 1920, height: 1080 },
      extraHTTPHeaders: {
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'DNT': '1',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1'
      }
    });
    
    const page = await context.newPage();
    
    // Add stealth measures
    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
      Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3, 4, 5] });
      Object.defineProperty(navigator, 'languages', { get: () => ['en-US', 'en'] });
    });
    
    let totalNew = 0;
    
    for (const subreddit of this.config.subreddits) {
      console.log(`Scraping r/${subreddit}...`);
      
      try {
        // Navigate to subreddit
        await page.goto(`https://old.reddit.com/r/${subreddit}/new/`, { 
          waitUntil: 'networkidle',
          timeout: 30000 
        });
        
        // Wait for posts to load
        await page.waitForSelector('.thing', { timeout: 10000 });
        
        // Extract posts
        const posts = await page.evaluate((searchTerms) => {
          const postElements = document.querySelectorAll('.thing');
          const results = [];
          
          for (const element of postElements) {
            const titleElement = element.querySelector('.title a');
            const contentElement = element.querySelector('.usertext-body .md');
            const authorElement = element.querySelector('.author');
            const scoreElement = element.querySelector('.score');
            const commentsElement = element.querySelector('.comments');
            const timestampElement = element.querySelector('.live-timestamp');
            const linkElement = element.querySelector('.title a');
            
            if (!titleElement) continue;
            
            const title = titleElement.textContent?.trim() || '';
            const content = contentElement?.textContent?.trim() || '';
            const fullContent = `${title} ${content}`.toLowerCase();
            
            // Check if post matches our search terms
            const matchesKeywords = searchTerms.some((term: string) => 
              fullContent.includes(term.toLowerCase())
            );
            
            if (!matchesKeywords) continue;
            
            const post = {
              title,
              content,
              author: authorElement?.textContent?.trim() || 'Unknown',
              score: scoreElement?.textContent?.trim() || '0',
              comments: commentsElement?.textContent?.trim() || '0',
              timestamp: timestampElement?.getAttribute('datetime') || new Date().toISOString(),
              url: linkElement?.href || '',
              permalink: linkElement?.pathname || ''
            };
            
            results.push(post);
          }
          
          return results;
        }, this.config.searchTerms);
        
        let newCount = 0;
        
        for (const post of posts) {
          // Check if already scraped
          const exists = await prisma.scrapedPost.findUnique({
            where: { sourceUrl: `https://reddit.com${post.permalink}` }
          });
          
          if (exists) continue;
          
          // Save to database
          await prisma.scrapedPost.create({
            data: {
              source: 'reddit',
              sourceUrl: `https://reddit.com${post.permalink}`,
              sourceId: post.permalink,
              title: post.title,
              content: post.content,
              author: post.author,
              authorUrl: `https://reddit.com/u/${post.author}`,
              upvotes: parseInt(post.score.replace(/[^\d]/g, '')) || 0,
              commentCount: parseInt(post.comments.replace(/[^\d]/g, '')) || 0,
              postedAt: new Date(post.timestamp),
              scrapedAt: new Date(),
              processed: false
            }
          });
          
          newCount++;
        }
        
        console.log(`Found ${newCount} new posts in r/${subreddit}`);
        totalNew += newCount;
        
        // Add delay between subreddits
        await this.delay(3000);
        
      } catch (error) {
        console.error(`Error scraping r/${subreddit}:`, error);
        // Continue with other subreddits
      }
    }
    
    await browser.close();
    return { totalNew };
  }
  
  private async createRunRecord() {
    return await prisma.scraperRun.create({
      data: {
        source: 'reddit',
        status: 'running',
        startedAt: new Date()
      }
    });
  }
  
  private async completeRunRecord(runId: string, status: string, error: any, itemsNew: number) {
    await prisma.scraperRun.update({
      where: { id: runId },
      data: {
        status,
        itemsNew,
        completedAt: new Date(),
        error: error?.message
      }
    });
  }
  
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}