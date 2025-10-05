import { NextRequest, NextResponse } from 'next/server';

interface SearchResult {
  title: string;
  url: string;
  snippet: string;
  source: string;
  publishedDate?: string;
}

interface WebSearchConfig {
  query: string;
  maxResults: number;
  sources: string[];
}

export async function POST(request: NextRequest) {
  try {
    const { repository, keywords, maxResults = 20 } = await request.json();
    
    if (!repository || !keywords) {
      return NextResponse.json({ error: 'Repository and keywords are required' }, { status: 400 });
    }

    console.log(`Fast web search for repository: ${repository}`);
    
    // Create targeted search queries
    const searchQueries = keywords.slice(0, 10).map(keyword => 
      `"${keyword}" site:reddit.com OR site:stackoverflow.com OR site:github.com`
    );

    // Process searches in parallel for maximum speed
    const searchPromises = searchQueries.map(async (query, index) => {
      try {
        // Use multiple search strategies in parallel
        const [redditResults, stackoverflowResults, githubResults] = await Promise.all([
          searchReddit(query, repository),
          searchStackOverflow(query, repository),
          searchGitHub(query, repository)
        ]);

        return {
          query,
          results: [...redditResults, ...stackoverflowResults, ...githubResults]
        };
      } catch (error) {
        console.error(`Search ${index} failed:`, error);
        return { query, results: [] };
      }
    });

    // Wait for all searches to complete
    const searchResults = await Promise.all(searchPromises);
    
    // Flatten and deduplicate results
    const allResults = searchResults.flatMap(sr => sr.results);
    const uniqueResults = deduplicateResults(allResults);
    
    // Sort by relevance and limit results
    const sortedResults = uniqueResults
      .sort((a, b) => calculateRelevanceScore(b, repository) - calculateRelevanceScore(a, repository))
      .slice(0, maxResults);

    console.log(`Found ${sortedResults.length} relevant results for ${repository}`);

    return NextResponse.json({
      success: true,
      results: sortedResults,
      total: sortedResults.length,
      repository
    });

  } catch (error) {
    console.error('Web search error:', error);
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}

async function searchReddit(query: string, repository: string): Promise<SearchResult[]> {
  try {
    // Use Reddit's JSON API for fast results
    const redditQuery = query.replace(/site:reddit\.com/g, '').trim();
    const response = await fetch(`https://www.reddit.com/search.json?q=${encodeURIComponent(redditQuery)}&sort=new&limit=10&raw_json=1`, {
      headers: {
        'User-Agent': 'MaintainerDashboard/1.0'
      }
    });

    if (!response.ok) return [];

    const data = await response.json();
    const posts = data.data?.children || [];

    return posts.map((post: any) => ({
      title: post.data.title,
      url: `https://reddit.com${post.data.permalink}`,
      snippet: post.data.selftext?.substring(0, 200) || '',
      source: 'reddit',
      publishedDate: new Date(post.data.created_utc * 1000).toISOString()
    }));

  } catch (error) {
    console.error('Reddit search error:', error);
    return [];
  }
}

async function searchStackOverflow(query: string, repository: string): Promise<SearchResult[]> {
  try {
    // Use Stack Overflow API for fast results
    const soQuery = query.replace(/site:stackoverflow\.com/g, '').trim();
    const response = await fetch(`https://api.stackexchange.com/2.3/search/advanced?q=${encodeURIComponent(soQuery)}&site=stackoverflow&sort=relevance&pagesize=10&order=desc`, {
      headers: {
        'User-Agent': 'MaintainerDashboard/1.0'
      }
    });

    if (!response.ok) return [];

    const data = await response.json();
    const questions = data.items || [];

    return questions.map((question: any) => ({
      title: question.title,
      url: question.link,
      snippet: question.body?.substring(0, 200) || '',
      source: 'stackoverflow',
      publishedDate: new Date(question.creation_date * 1000).toISOString()
    }));

  } catch (error) {
    console.error('Stack Overflow search error:', error);
    return [];
  }
}

async function searchGitHub(query: string, repository: string): Promise<SearchResult[]> {
  try {
    // Use GitHub API for issues and discussions
    const ghQuery = query.replace(/site:github\.com/g, '').trim();
    const response = await fetch(`https://api.github.com/search/issues?q=${encodeURIComponent(ghQuery)}+type:issue&sort=updated&order=desc&per_page=10`, {
      headers: {
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'MaintainerDashboard/1.0'
      }
    });

    if (!response.ok) return [];

    const data = await response.json();
    const issues = data.items || [];

    return issues.map((issue: any) => ({
      title: issue.title,
      url: issue.html_url,
      snippet: issue.body?.substring(0, 200) || '',
      source: 'github',
      publishedDate: issue.updated_at
    }));

  } catch (error) {
    console.error('GitHub search error:', error);
    return [];
  }
}

function deduplicateResults(results: SearchResult[]): SearchResult[] {
  const seen = new Set<string>();
  return results.filter(result => {
    const key = result.url;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function calculateRelevanceScore(result: SearchResult, repository: string): number {
  const repoName = repository.split('/').pop()?.toLowerCase() || '';
  const content = `${result.title} ${result.snippet}`.toLowerCase();
  
  let score = 0;
  
  // Repository name mentions
  if (content.includes(repoName)) score += 10;
  
  // Bug/issue keywords
  const bugKeywords = ['bug', 'error', 'issue', 'problem', 'crash', 'fail', 'broken'];
  bugKeywords.forEach(keyword => {
    if (content.includes(keyword)) score += 2;
  });
  
  // Source preference
  if (result.source === 'github') score += 5;
  if (result.source === 'stackoverflow') score += 3;
  if (result.source === 'reddit') score += 1;
  
  return score;
}
