import { NextRequest, NextResponse } from 'next/server';
import { generateRepositoryKeywords } from '@/lib/ai/repository-keyword-generator';
import OpenAI from 'openai';

// Lazy initialization
let _openai: OpenAI | null = null;
const getOpenAI = () => {
  if (!_openai) {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OpenAI API key is required. Set OPENAI_API_KEY environment variable.');
    }
    _openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return _openai;
};

interface FastAnalysisResult {
  id: string;
  title: string;
  content: string;
  source: string;
  sourceUrl: string;
  author: string;
  upvotes: number;
  commentCount: number;
  postedAt: string;
  isBug: boolean;
  confidence: number;
  severity: string;
  summary: string;
  technicalDetails: string;
  suggestedLabels: string[];
  affectedArea: string;
  userImpact: number;
  sentiment: number;
}

export async function POST(request: NextRequest) {
  try {
    const { repository, sources = ['reddit', 'stackoverflow', 'github'] } = await request.json();
    
    if (!repository) {
      return NextResponse.json({ error: 'Repository is required' }, { status: 400 });
    }

    console.log(`Fast analysis for repository: ${repository}`);

    // Step 1: Generate targeted keywords quickly
    const keywordResult = await generateRepositoryKeywords(repository);
    console.log(`Generated ${keywordResult.keywords.length} keywords for ${repository}`);

    // Step 2: Ultra-fast web search
    const searchResponse = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/ultra-fast-search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        repository,
        keywords: keywordResult.keywords.slice(0, 10) // Use top 10 keywords for maximum speed
      })
    });

    let allResults = [];
    if (searchResponse.ok) {
      const searchData = await searchResponse.json();
      allResults = searchData.results || [];
    }

    console.log(`Found ${allResults.length} search results`);
    
    // Debug: Log some sample results
    if (allResults.length > 0) {
      console.log('Sample search results:');
      allResults.slice(0, 3).forEach((result, index) => {
        console.log(`${index + 1}. ${result.title} (${result.source})`);
        console.log(`   URL: ${result.url}`);
        console.log(`   Snippet: ${result.snippet.substring(0, 100)}...`);
      });
    }

    // Step 3: Fast AI analysis of results
    const analysisResults = await fastAnalyzeResults(allResults, repository, keywordResult.keywords);

    console.log(`Fast analysis complete: ${analysisResults.length} relevant issues found`);

    return NextResponse.json({
      success: true,
      results: analysisResults,
      stats: {
        total: analysisResults.length,
        bugs: analysisResults.filter(r => r.isBug).length,
        complaints: analysisResults.filter(r => r.sentiment < -0.3).length
      },
      keywords: keywordResult.keywords,
      reasoning: keywordResult.reasoning,
      confidence: keywordResult.confidence
    });

  } catch (error) {
    console.error('Fast analysis error:', error);
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}

async function fastAnalyzeResults(results: any[], repository: string, keywords: string[]): Promise<FastAnalysisResult[]> {
  if (results.length === 0) return [];

  // Batch process results for speed
  const batchSize = 5;
  const batches = [];
  
  for (let i = 0; i < results.length; i += batchSize) {
    batches.push(results.slice(i, i + batchSize));
  }

  const analysisPromises = batches.map(async (batch) => {
    try {
      return await analyzeBatch(batch, repository, keywords);
    } catch (error) {
      console.error('Batch analysis error:', error);
      return [];
    }
  });

  const batchResults = await Promise.all(analysisPromises);
  return batchResults.flat();
}

async function analyzeBatch(batch: any[], repository: string, keywords: string[]): Promise<FastAnalysisResult[]> {
  try {
    const serviceName = repository.split('/').pop() || repository;
    console.log(`Analyzing batch of ${batch.length} posts for service: ${serviceName}`);
    
    const prompt = `Analyze these ${batch.length} posts and identify which ones are about the service "${serviceName}".

Service: ${serviceName}
Repository: ${repository}
Keywords: ${keywords.slice(0, 10).join(', ')}

Posts to analyze:
${batch.map((post, index) => `
${index + 1}. ${post.title}
   URL: ${post.url}
   Source: ${post.source}
   Content: ${post.snippet}
`).join('\n')}

For each post, determine:
1. Is it about the service "${serviceName}" or related technologies?
2. Is it a bug report, issue, or complaint?
3. What's the severity and confidence?

BE MORE INCLUSIVE: Include posts that mention:
- The service name "${serviceName}" or variations
- Related technologies or frameworks
- General web development issues that could be relevant
- Any posts that seem related to the service

Respond with JSON array in this exact format:
[
  {
    "index": 1,
    "isRelevant": true/false,
    "isBug": true/false,
    "confidence": 0.0-1.0,
    "severity": "critical|high|medium|low|info",
    "summary": "one-line summary",
    "technicalDetails": "technical details",
    "suggestedLabels": ["label1", "label2"],
    "affectedArea": "ui|api|database|auth|performance|deployment|other",
    "userImpact": 1-100,
    "sentiment": -1.0 to 1.0
  }
]

Be more inclusive - include posts that could be relevant to the service.`;

    const response = await getOpenAI().chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { 
          role: 'system', 
          content: 'You are a fast bug triage assistant. Analyze posts quickly and accurately. Always respond with valid JSON array.' 
        },
        { role: 'user', content: prompt }
      ],
      temperature: 0.2,
      response_format: { type: 'json_object' }
    });

    const analysis = JSON.parse(response.choices[0].message.content!);
    const results = Array.isArray(analysis) ? analysis : [analysis];
    
    console.log(`AI analysis returned ${results.length} results`);
    console.log('AI analysis results:', JSON.stringify(results, null, 2));

    const filteredResults = results.filter((result: any) => result.isRelevant && result.confidence > 0.1);
    console.log(`Filtered to ${filteredResults.length} relevant results (confidence > 0.1)`);

    return filteredResults.map((result: any) => {
        const originalPost = batch[result.index - 1];
        console.log(`Processing result ${result.index}: ${originalPost.title} (confidence: ${result.confidence})`);
        return {
          id: `fast_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          title: originalPost.title,
          content: originalPost.snippet,
          source: originalPost.source,
          sourceUrl: originalPost.url,
          author: 'Unknown',
          upvotes: 0,
          commentCount: 0,
          postedAt: originalPost.publishedDate || new Date().toISOString(),
          isBug: result.isBug,
          confidence: result.confidence,
          severity: result.severity,
          summary: result.summary,
          technicalDetails: result.technicalDetails,
          suggestedLabels: result.suggestedLabels || [],
          affectedArea: result.affectedArea,
          userImpact: result.userImpact,
          sentiment: result.sentiment
        };
      });

  } catch (error) {
    console.error('Batch analysis error:', error);
    return [];
  }
}
