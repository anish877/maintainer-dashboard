import { RedditScraper, RedditScraperConfig } from './reddit-scraper';
import { StackOverflowScraper, StackOverflowScraperConfig } from './stackoverflow-scraper';
import { prisma } from '@/lib/prisma';
import { AIKeywordGenerator } from '@/lib/ai/keyword-generator';

export interface RepoScrapingConfig {
  repository: string; // "owner/repo"
  sources: ('reddit' | 'stackoverflow')[];
  customKeywords?: string[];
  maxPostsPerSource?: number;
}

export class RepoSpecificScraper {
  private config: RepoScrapingConfig;

  constructor(config: RepoScrapingConfig) {
    this.config = config;
  }

  async scrapeForRepository(): Promise<{ total: number; new: number; errors: number }> {
    const [owner, repoName] = this.config.repository.split('/');
    let totalPosts = 0;
    let newPosts = 0;
    let errors = 0;

    // Generate repository-specific keywords using AI
    const repoKeywords = await this.generateRepoKeywords(owner, repoName);

    console.log(`🔍 Starting repository-specific scraping for ${this.config.repository}`);
    console.log(`📝 Keywords: ${repoKeywords.join(', ')}`);

    for (const source of this.config.sources) {
      try {
        const result = await this.scrapeSource(source, repoKeywords);
        totalPosts += result.total;
        newPosts += result.new;
      } catch (error) {
        console.error(`❌ Error scraping ${source}:`, error);
        errors++;
      }
    }

    return { total: totalPosts, new: newPosts, errors };
  }

  private async generateRepoKeywords(owner: string, repoName: string): Promise<string[]> {
    try {
      console.log(`🤖 Generating AI-powered keywords for ${owner}/${repoName}...`);
      
      // Use AI to generate repository-specific keywords
      const aiResult = await AIKeywordGenerator.getCachedKeywords(
        `${owner}/${repoName}`,
        undefined, // TODO: Pass repo description if available
        undefined  // TODO: Pass repo topics if available
      );

      console.log(`✅ AI generated ${aiResult.keywords.length} keywords for ${owner}/${repoName}`);
      console.log(`📊 Confidence: ${Math.round(aiResult.confidence * 100)}%`);
      console.log(`🧠 Reasoning: ${aiResult.reasoning}`);
      
      // Add custom keywords if provided
      const customKeywords = this.config.customKeywords?.map(k => k.toLowerCase()) || [];
      
      // Combine AI keywords with custom ones
      const allKeywords = [...aiResult.keywords, ...customKeywords];
      
      // Remove duplicates and return
      return [...new Set(allKeywords.map(k => k.toLowerCase()))];
      
    } catch (error) {
      console.error(`❌ AI keyword generation failed for ${owner}/${repoName}:`, error);
      console.log(`🔄 Falling back to rule-based keywords...`);
      
      // Fallback to rule-based keywords
      return this.getFallbackKeywords(owner, repoName);
    }
  }

  private getFallbackKeywords(owner: string, repoName: string): string[] {
    const repoSpecificKeywords = this.getRepoSpecificKeywords(repoName);
    
    const baseKeywords = [
      'error', 'bug', 'crash', 'not working', 'broken', 'issue', 'problem',
      'exception', 'failing', 'trouble', 'help', 'fix', 'support'
    ];

    const repoKeywords = [
      repoName.toLowerCase(),
      `${owner}/${repoName}`.toLowerCase(),
      `${owner}-${repoName}`.toLowerCase()
    ];

    // Add custom keywords if provided
    if (this.config.customKeywords) {
      repoKeywords.push(...this.config.customKeywords.map(k => k.toLowerCase()));
    }

    return [...repoSpecificKeywords, ...repoKeywords, ...baseKeywords];
  }

  private getRepoSpecificKeywords(repoName: string): string[] {
    const repo = repoName.toLowerCase();
    
    // Next.js specific keywords
    if (repo.includes('next') || repo.includes('nextjs')) {
      return [
        'nextjs error', 'next.js bug', 'next.js not working', 'nextjs crash',
        'next.js build error', 'nextjs deployment issue', 'next.js routing problem',
        'nextjs api error', 'next.js hydration error', 'nextjs ssr issue'
      ];
    }
    
    // React specific keywords
    if (repo.includes('react')) {
      return [
        'react error', 'reactjs bug', 'react not working', 'react crash',
        'react component error', 'reactjs state issue', 'react hook error',
        'react rendering problem', 'react performance issue'
      ];
    }
    
    // Node.js specific keywords
    if (repo.includes('node') || repo.includes('nodejs')) {
      return [
        'nodejs error', 'node.js bug', 'node not working', 'nodejs crash',
        'node.js server error', 'nodejs memory issue', 'node.js performance problem'
      ];
    }
    
    // TypeScript specific keywords
    if (repo.includes('typescript') || repo.includes('ts-')) {
      return [
        'typescript error', 'ts bug', 'typescript not working', 'ts crash',
        'typescript compilation error', 'ts type error', 'typescript build issue'
      ];
    }
    
    // Vue.js specific keywords
    if (repo.includes('vue')) {
      return [
        'vue error', 'vuejs bug', 'vue not working', 'vue crash',
        'vue component error', 'vuejs reactivity issue', 'vue build problem'
      ];
    }
    
    // Python specific keywords
    if (repo.includes('python') || repo.includes('django') || repo.includes('flask')) {
      return [
        'python error', 'django bug', 'flask error', 'python not working',
        'python exception', 'django crash', 'python import error'
      ];
    }
    
    // Generic fallback for unknown repos
    return [
      `${repoName} error`, `${repoName} bug`, `${repoName} not working`,
      `${repoName} crash`, `${repoName} issue`, `${repoName} problem`
    ];
  }

  private async scrapeSource(source: string, keywords: string[]): Promise<{ total: number; new: number }> {
    const maxPosts = this.config.maxPostsPerSource || 50;
    
    switch (source) {
      case 'reddit':
        return await this.scrapeReddit(keywords, maxPosts);
      case 'stackoverflow':
        return await this.scrapeStackOverflow(keywords, maxPosts);
      default:
        throw new Error(`Unknown source: ${source}`);
    }
  }

  private async scrapeReddit(keywords: string[], maxPosts: number): Promise<{ total: number; new: number }> {
    const config: RedditScraperConfig = {
      subreddits: [
        'bugs', 'programming', 'webdev', 'javascript', 'reactjs', 'nextjs',
        'python', 'nodejs', 'typescript', 'github'
      ],
      searchTerms: keywords,
      maxPostsPerSubreddit: Math.ceil(maxPosts / 6) // Distribute across subreddits
    };

    const scraper = new RedditScraper(config);
    const result = await scraper.scrape();
    
    // Update scraped posts with repository info
    await this.updateScrapedPostsWithRepoInfo('reddit', keywords);
    
    return { total: result.totalFound, new: result.totalNew };
  }


  private async scrapeStackOverflow(keywords: string[], maxPosts: number): Promise<{ total: number; new: number }> {
    const config: StackOverflowScraperConfig = {
      tags: [
        'javascript', 'reactjs', 'nextjs', 'node.js', 'typescript',
        'python', 'java', 'c#', 'php', 'html', 'css'
      ],
      keywords: keywords,
      maxQuestionsPerTag: Math.ceil(maxPosts / 11) // Distribute across tags
    };

    const scraper = new StackOverflowScraper(config);
    const result = await scraper.scrape();
    
    // Update scraped posts with repository info
    await this.updateScrapedPostsWithRepoInfo('stackoverflow', keywords);
    
    return { total: result.totalFound, new: result.totalNew };
  }

  private async updateScrapedPostsWithRepoInfo(source: string, keywords: string[]): Promise<void> {
    // Find recently scraped posts from this source and update them with repo info
    const recentPosts = await prisma.scrapedPost.findMany({
      where: {
        source: source,
        targetRepository: null, // Only update posts that don't have repo info yet
        scrapedAt: {
          gte: new Date(Date.now() - 10 * 60 * 1000) // Last 10 minutes
        }
      },
      take: 100 // Limit to avoid overwhelming the database
    });

    if (recentPosts.length > 0) {
      await prisma.scrapedPost.updateMany({
        where: {
          id: {
            in: recentPosts.map(p => p.id)
          }
        },
        data: {
          targetRepository: this.config.repository,
          scrapeKeywords: keywords
        }
      });

      console.log(`✅ Updated ${recentPosts.length} ${source} posts with repository info`);
    }
  }

  // Static method to scrape for a specific repository
  static async scrapeForRepo(
    repository: string,
    sources: ('reddit' | 'stackoverflow')[] = ['reddit', 'stackoverflow'],
    customKeywords?: string[]
  ): Promise<{ total: number; new: number; errors: number }> {
    const scraper = new RepoSpecificScraper({
      repository,
      sources,
      customKeywords,
      maxPostsPerSource: 50
    });

    return await scraper.scrapeForRepository();
  }
}
