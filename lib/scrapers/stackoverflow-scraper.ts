import { chromium } from 'playwright';
import { prisma } from '@/lib/prisma';

interface StackOverflowScraperConfig {
  tags: string[];
  keywords: string[];
  maxQuestionsPerTag: number;
}

export class StackOverflowScraper {
  private config: StackOverflowScraperConfig;

  constructor(config: StackOverflowScraperConfig) {
    this.config = config;
  }

  async scrape() {
    const runRecord = await this.createRunRecord();
    const runId = runRecord.id;

    try {
      const result = await this.scrapeWithBrowser();
      await this.completeRunRecord(runId, 'success', null, result.totalNew);
      console.log(`Stack Overflow scraping completed. Found ${result.totalNew} new questions.`);

      return { totalFound: result.totalNew, totalNew: result.totalNew, failedItems: 0 };

    } catch (error) {
      await this.completeRunRecord(runId, 'failed', error);
      console.error('Stack Overflow scraping failed:', error);
      return { totalFound: 0, totalNew: 0, failedItems: 1 };
    }
  }

  private async scrapeWithBrowser(): Promise<{ totalNew: number }> {
    const browser = await chromium.launch({
      headless: true,
      args: [
        '--disable-blink-features=AutomationControlled',
        '--disable-web-security',
        '--disable-features=VizDisplayCompositor',
        '--no-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--disable-background-timer-throttling',
        '--disable-backgrounding-occluded-windows',
        '--disable-renderer-backgrounding'
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

    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
      Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3, 4, 5] });
      Object.defineProperty(navigator, 'languages', { get: () => ['en-US', 'en'] });
    });

    let totalNew = 0;

    for (const tag of this.config.tags) {
      console.log(`Scraping Stack Overflow tag: ${tag}`);

      try {
        const searchQuery = this.config.keywords.slice(0, 2).join(' OR ');
        const url = `https://stackoverflow.com/questions/tagged/${encodeURIComponent(tag)}?tab=newest&page=1&pagesize=${this.config.maxQuestionsPerTag}&q=${encodeURIComponent(searchQuery)}`;
        
        await page.goto(url, {
          waitUntil: 'networkidle',
          timeout: 30000
        });

        await page.waitForSelector('.s-post-summary', { timeout: 10000 });

        const questions = await page.evaluate((keywords) => {
          const questionElements = document.querySelectorAll('.s-post-summary');
          const results = [];

          for (const element of questionElements) {
            const titleElement = element.querySelector('.s-post-summary--content-title a');
            const contentElement = element.querySelector('.s-post-summary--content-excerpt');
            const authorElement = element.querySelector('.s-user-card--link .s-user-card--info .s-user-card--name');
            const timestampElement = element.querySelector('.relativetime');
            const linkElement = element.querySelector('.s-post-summary--content-title a');
            const upvotesElement = element.querySelector('.s-post-summary--stats-item__emphasized .s-post-summary--stats-item-number');
            const commentsElement = element.querySelector('.s-post-summary--stats-item:nth-child(3) .s-post-summary--stats-item-number');
            const tagElements = element.querySelectorAll('.s-post-tag');

            if (!titleElement || !linkElement) continue;

            const title = titleElement.textContent?.trim() || '';
            const content = contentElement?.textContent?.trim() || '';
            const fullContent = `${title} ${content}`.toLowerCase();

            const matchesKeywords = keywords.some((keyword: string) =>
              fullContent.includes(keyword.toLowerCase())
            );

            if (!matchesKeywords) continue;

            const question = {
              title,
              content,
              author: authorElement?.textContent?.trim() || 'Anonymous',
              timestamp: timestampElement?.getAttribute('title') || new Date().toISOString(),
              url: 'https://stackoverflow.com' + linkElement.getAttribute('href'),
              questionId: linkElement.getAttribute('href')?.split('/')[2] || '',
              upvotes: parseInt(upvotesElement?.textContent?.trim() || '0'),
              commentCount: parseInt(commentsElement?.textContent?.trim() || '0'),
              tags: Array.from(tagElements).map(tag => tag.textContent?.trim()).filter(Boolean)
            };

            results.push(question);
          }

          return results;
        }, this.config.keywords);

        let newCount = 0;

        for (const question of questions) {
          const exists = await prisma.scrapedPost.findUnique({
            where: { sourceUrl: question.url }
          });

          if (exists) continue;

          await prisma.scrapedPost.create({
            data: {
              source: 'stackoverflow',
              sourceUrl: question.url,
              sourceId: question.questionId,
              title: question.title,
              content: question.content,
              author: question.author,
              authorUrl: `https://stackoverflow.com/users/${question.author}`,
              upvotes: question.upvotes,
              commentCount: question.commentCount,
              tags: question.tags,
              postedAt: new Date(question.timestamp),
              scrapedAt: new Date(),
              processed: false
            }
          });

          newCount++;
        }

        console.log(`Found ${newCount} new questions for tag: ${tag}`);
        totalNew += newCount;

        await this.delay(3000);

      } catch (error) {
        console.error(`Error scraping Stack Overflow tag "${tag}":`, error);
      }
    }

    await browser.close();
    return { totalNew };
  }

  private async createRunRecord() {
    return await prisma.scraperRun.create({
      data: {
        source: 'stackoverflow',
        status: 'running',
        startedAt: new Date()
      }
    });
  }

  private async completeRunRecord(runId: string, status: string, error: any, itemsNew: number = 0) {
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