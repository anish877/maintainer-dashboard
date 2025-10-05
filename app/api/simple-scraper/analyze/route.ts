import { NextRequest, NextResponse } from 'next/server';
import { RedditScraper } from '@/lib/scrapers/reddit-scraper';
import { StackOverflowScraper } from '@/lib/scrapers/stackoverflow-scraper';
import { generateRepositoryKeywords } from '@/lib/ai/repository-keyword-generator';
import { classifyPost } from '@/lib/ai/classifier';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const { repository, sources } = await request.json();
    
    if (!repository) {
      return NextResponse.json({ error: 'Repository is required' }, { status: 400 });
    }

    console.log(`Starting analysis for repository: ${repository}`);

    // Step 1: Generate AI keywords for the repository
    // Try to fetch repository details from GitHub API for better keyword generation
    let repositoryDescription = '';
    let repositoryLanguage = '';
    let repositoryTopics: string[] = [];

    try {
      const [owner, repo] = repository.split('/');
      if (owner && repo) {
        // Fetch repository details from GitHub API
        const githubResponse = await fetch(`https://api.github.com/repos/${owner}/${repo}`, {
          headers: {
            'Accept': 'application/vnd.github.v3+json',
            'User-Agent': 'MaintainerDashboard/1.0'
          }
        });

        if (githubResponse.ok) {
          const repoData = await githubResponse.json();
          repositoryDescription = repoData.description || '';
          repositoryLanguage = repoData.language || '';
          repositoryTopics = repoData.topics || [];
        }
      }
    } catch (error) {
      console.log('Could not fetch GitHub repository details, using basic info');
    }

    const keywordResult = await generateRepositoryKeywords(
      repository,
      repositoryDescription,
      repositoryLanguage,
      repositoryTopics
    );
    console.log(`Generated ${keywordResult.keywords.length} keywords for ${repository}`);

    // Step 2: Configure scrapers with AI-generated keywords
    // Use more targeted subreddits based on repository type
    const redditConfig = {
      subreddits: ['javascript', 'reactjs', 'nodejs', 'webdev', 'programming', 'learnprogramming', 'nextjs', 'typescript', 'frontend', 'backend'],
      searchTerms: keywordResult.keywords.slice(0, 15), // Use top 15 keywords for better coverage
      maxPostsPerSubreddit: 8
    };

    // Use more comprehensive Stack Overflow tags
    const stackoverflowConfig = {
      tags: ['javascript', 'reactjs', 'nodejs', 'html', 'css', 'nextjs', 'typescript', 'react', 'node.js'],
      keywords: keywordResult.keywords.slice(0, 15), // Use top 15 keywords for better coverage
      maxQuestionsPerTag: 8
    };

    const results = [];
    let totalPosts = 0;
    let bugs = 0;
    let complaints = 0;

    // Step 3: Run scrapers
    if (sources.includes('reddit')) {
      try {
        console.log('Scraping Reddit...');
        const redditScraper = new RedditScraper(redditConfig);
        await redditScraper.scrape();
        console.log('Reddit scraping completed');
      } catch (error) {
        console.error('Reddit scraping failed:', error);
      }
    }

    if (sources.includes('stackoverflow')) {
      try {
        console.log('Scraping Stack Overflow...');
        const soScraper = new StackOverflowScraper(stackoverflowConfig);
        await soScraper.scrape();
        console.log('Stack Overflow scraping completed');
      } catch (error) {
        console.error('Stack Overflow scraping failed:', error);
      }
    }

    // Step 4: Get recent scraped posts and classify them
    const recentPosts = await prisma.scrapedPost.findMany({
      where: {
        processed: false,
        scrapedAt: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
        }
      },
      orderBy: { scrapedAt: 'desc' },
      take: 50
    });

    console.log(`Found ${recentPosts.length} recent posts to analyze`);

    // Step 5: Classify posts with AI
    for (const post of recentPosts) {
      try {
        const classification = await classifyPost(post.id);
        if (classification && classification.is_bug) {
          results.push({
            id: post.id,
            title: post.title,
            content: post.content,
            source: post.source,
            sourceUrl: post.sourceUrl,
            author: post.author,
            upvotes: post.upvotes,
            commentCount: post.commentCount,
            postedAt: post.postedAt.toISOString(),
            isBug: classification.is_bug,
            confidence: classification.confidence,
            severity: classification.severity,
            summary: classification.summary,
            technicalDetails: classification.technical_details,
            suggestedLabels: classification.labels,
            affectedArea: classification.affected_area,
            userImpact: classification.user_impact,
            sentiment: classification.sentiment
          });

          totalPosts++;
          if (classification.is_bug) bugs++;
          if (classification.sentiment < -0.3) complaints++;
        }
      } catch (error) {
        console.error(`Error classifying post ${post.id}:`, error);
      }
    }

    console.log(`Analysis complete: ${totalPosts} total, ${bugs} bugs, ${complaints} complaints`);

    return NextResponse.json({
      success: true,
      results,
      stats: {
        total: totalPosts,
        bugs,
        complaints
      },
      keywords: keywordResult.keywords,
      reasoning: keywordResult.reasoning,
      confidence: keywordResult.confidence
    });

  } catch (error) {
    console.error('Error analyzing repository:', error);
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}
