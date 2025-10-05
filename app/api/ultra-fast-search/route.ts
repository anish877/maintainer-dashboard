import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { repository, keywords } = await request.json();
    
    if (!repository || !keywords) {
      return NextResponse.json({ error: 'Repository and keywords are required' }, { status: 400 });
    }

    console.log(`Ultra-fast search for: ${repository}`);

    // Create search queries optimized for speed
    const searchQueries = keywords.slice(0, 5).map(keyword => 
      `"${keyword}" bug OR error OR issue OR problem OR not working OR broken OR crash`
    );

    // Ultra-fast parallel searches
    const searchPromises = searchQueries.map(async (query) => {
      try {
        // Use multiple search engines in parallel
        const [redditResults, stackoverflowResults] = await Promise.all([
          ultraFastRedditSearch(query),
          ultraFastStackOverflowSearch(query)
        ]);

        return [...redditResults, ...stackoverflowResults];
      } catch (error) {
        console.error('Search error:', error);
        return [];
      }
    });

    // Wait for all searches
    const allResults = await Promise.all(searchPromises);
    const flatResults = allResults.flat();

    // Quick relevance filtering - be more flexible with service name matching
    const relevantResults = flatResults.filter(result => {
      const content = `${result.title} ${result.snippet}`.toLowerCase();
      const repoName = repository.split('/').pop()?.toLowerCase() || '';
      const serviceName = repoName.replace(/\./g, ''); // Remove dots for matching
      
      // Check for service name variations
      const serviceVariations = [
        repoName,
        serviceName,
        serviceName.replace(/\./g, ' '),
        serviceName.replace(/\./g, '-'),
        serviceName.replace(/\./g, '')
      ];
      
      return serviceVariations.some(variation => content.includes(variation)) || 
             keywords.some(keyword => content.includes(keyword.toLowerCase()));
    });

    // Sort by relevance and limit
    const sortedResults = relevantResults
      .sort((a, b) => calculateRelevanceScore(b, repository) - calculateRelevanceScore(a, repository))
      .slice(0, 15);

    console.log(`Ultra-fast search found ${sortedResults.length} results`);
    
    // Debug: Log some sample results
    if (sortedResults.length > 0) {
      console.log('Sample search results:');
      sortedResults.slice(0, 3).forEach((result, index) => {
        console.log(`${index + 1}. ${result.title} (${result.source})`);
        console.log(`   URL: ${result.url}`);
        console.log(`   Snippet: ${result.snippet.substring(0, 100)}...`);
      });
    }

    return NextResponse.json({
      success: true,
      results: sortedResults,
      total: sortedResults.length,
      repository
    });

  } catch (error) {
    console.error('Ultra-fast search error:', error);
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}

async function ultraFastRedditSearch(query: string): Promise<any[]> {
  try {
    // Use Reddit's JSON API with minimal data
    const response = await fetch(`https://www.reddit.com/search.json?q=${encodeURIComponent(query)}&sort=new&limit=5&raw_json=1`, {
      headers: { 'User-Agent': 'MaintainerDashboard/1.0' }
    });

    if (!response.ok) return [];

    const data = await response.json();
    const posts = data.data?.children || [];

    return posts.map((post: any) => ({
      title: post.data.title,
      url: `https://reddit.com${post.data.permalink}`,
      snippet: post.data.selftext?.substring(0, 150) || '',
      source: 'reddit',
      publishedDate: new Date(post.data.created_utc * 1000).toISOString()
    }));

  } catch (error) {
    console.error('Reddit search error:', error);
    return [];
  }
}

async function ultraFastStackOverflowSearch(query: string): Promise<any[]> {
  try {
    // Use Stack Overflow API with minimal data
    const response = await fetch(`https://api.stackexchange.com/2.3/search/advanced?q=${encodeURIComponent(query)}&site=stackoverflow&sort=relevance&pagesize=5&order=desc`, {
      headers: { 'User-Agent': 'MaintainerDashboard/1.0' }
    });

    if (!response.ok) return [];

    const data = await response.json();
    const questions = data.items || [];

    return questions.map((question: any) => ({
      title: question.title,
      url: question.link,
      snippet: question.body?.substring(0, 150) || '',
      source: 'stackoverflow',
      publishedDate: new Date(question.creation_date * 1000).toISOString()
    }));

  } catch (error) {
    console.error('Stack Overflow search error:', error);
    return [];
  }
}

function calculateRelevanceScore(result: any, repository: string): number {
  const repoName = repository.split('/').pop()?.toLowerCase() || '';
  const content = `${result.title} ${result.snippet}`.toLowerCase();
  
  let score = 0;
  
  // Service name variations
  const serviceVariations = [
    repoName,
    repoName.replace(/\./g, ''),
    repoName.replace(/\./g, ' '),
    repoName.replace(/\./g, '-')
  ];
  
  // Check for service name mentions
  serviceVariations.forEach(variation => {
    if (content.includes(variation)) score += 10;
  });
  
  // Bug keywords
  const bugKeywords = ['bug', 'error', 'issue', 'problem', 'crash', 'fail', 'broken', 'not working', 'doesn\'t work'];
  bugKeywords.forEach(keyword => {
    if (content.includes(keyword)) score += 2;
  });
  
  // Frustration indicators
  const frustrationKeywords = ['hate', 'terrible', 'awful', 'frustrating', 'annoying', 'sucks', 'useless'];
  frustrationKeywords.forEach(keyword => {
    if (content.includes(keyword)) score += 3;
  });
  
  return score;
}
