import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { Octokit } from '@octokit/rest';
import { OpenAI } from 'openai';
import { prisma } from '@/lib/prisma';

/**
 * API Route for Duplicate Detection Analysis
 * 
 * This endpoint analyzes all open issues in a repository to find potential duplicates
 * using AI-powered similarity analysis and embeddings.
 */

interface Issue {
  number: number;
  title: string;
  body: string;
  created_at: string;
  updated_at: string;
}

interface SimilarIssue {
  issueNumber: number;
  title: string;
  similarity: number;
  reason: string;
  confidence: number;
}

interface DuplicateAnalysis {
  issueNumber: number;
  title: string;
  body: string;
  similarIssues: SimilarIssue[];
  analysis: {
    isDuplicate: boolean;
    confidence: number;
    reasoning: string;
    suggestedAction: 'mark_duplicate' | 'not_duplicate' | 'review_required';
  };
}

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { owner, repo } = body;

    // Validate required fields
    if (!owner || !repo) {
      return NextResponse.json(
        { error: 'Missing required fields: owner, repo' },
        { status: 400 }
      );
    }

    console.log(`🔍 Starting duplicate analysis for user ${session.user.id} on ${owner}/${repo}`);

    // Get user's GitHub access token from database
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { accessToken: true }
    });

    if (!user?.accessToken) {
      return NextResponse.json({ error: 'GitHub access token required' }, { status: 401 });
    }

    // Initialize GitHub client using user's access token
    const octokit = new Octokit({
      auth: user.accessToken,
    });

    // Initialize OpenAI client
    const openai = new OpenAI({
      apiKey: process.env.OPEN_AI_KEY,
    });

    // Fetch all open issues
    const issues = await fetchAllIssues(octokit, owner, repo);
    console.log(`📋 Found ${issues.length} open issues to analyze`);

    if (issues.length === 0) {
      return NextResponse.json({
        success: true,
        results: [],
        message: 'No open issues found to analyze for duplicates.',
      });
    }

    // Generate embeddings for all issues
    console.log('🧠 Generating embeddings for all issues...');
    const issueEmbeddings = await Promise.all(
      issues.map(async (issue) => {
        const content = `${issue.title}\n\n${issue.body}`;
        const embedding = await generateEmbedding(openai, content);
        return {
          issue,
          embedding,
          content,
        };
      })
    );

    // Analyze each issue for duplicates
    console.log('🔍 Analyzing issues for duplicates...');
    const analysisResults: DuplicateAnalysis[] = [];

    for (const { issue, embedding, content } of issueEmbeddings) {
      // Find similar issues using cosine similarity
      const similarIssues = findSimilarIssues(issue, embedding, issueEmbeddings);
      
      if (similarIssues.length > 0) {
        // Use AI to analyze if this is actually a duplicate
        const aiAnalysis = await analyzeDuplicateWithAI(openai, issue, similarIssues, content);
        
        analysisResults.push({
          issueNumber: issue.number,
          title: issue.title,
          body: issue.body,
          similarIssues,
          analysis: aiAnalysis,
        });
      }
    }

    // Sort by confidence (highest first)
    analysisResults.sort((a, b) => b.analysis.confidence - a.analysis.confidence);

    console.log(`✅ Duplicate analysis complete. Found ${analysisResults.length} issues with potential duplicates.`);

    return NextResponse.json({
      success: true,
      results: analysisResults,
      message: `Analysis complete! Found ${analysisResults.length} issues with potential duplicates.`,
    });

  } catch (error) {
    console.error('Error in duplicate analysis:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

async function fetchAllIssues(octokit: Octokit, owner: string, repo: string): Promise<Issue[]> {
  const issues: Issue[] = [];
  let page = 1;
  const perPage = 100;

  while (true) {
    const response = await octokit.rest.issues.listForRepo({
      owner,
      repo,
      state: 'open',
      page,
      per_page: perPage,
    });

    if (response.data.length === 0) break;

    issues.push(...response.data.map(issue => ({
      number: issue.number,
      title: issue.title,
      body: issue.body || '',
      created_at: issue.created_at,
      updated_at: issue.updated_at,
    })));

    page++;
  }

  return issues;
}

async function generateEmbedding(openai: OpenAI, text: string): Promise<number[]> {
  const response = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: text,
  });

  return response.data[0].embedding;
}

function findSimilarIssues(
  currentIssue: Issue,
  currentEmbedding: number[],
  allIssues: { issue: Issue; embedding: number[]; content: string }[]
): SimilarIssue[] {
  const similarities: SimilarIssue[] = [];

  for (const { issue, embedding, content } of allIssues) {
    // Skip the same issue
    if (issue.number === currentIssue.number) continue;

    // Calculate cosine similarity
    const similarity = cosineSimilarity(currentEmbedding, embedding);
    
    // Only include issues with similarity above threshold
    if (similarity > 0.6) {
      similarities.push({
        issueNumber: issue.number,
        title: issue.title,
        similarity: Math.round(similarity * 100),
        reason: generateSimilarityReason(currentIssue, issue, similarity),
        confidence: Math.round(similarity * 100),
      });
    }
  }

  // Sort by similarity (highest first) and take top 5
  return similarities
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, 5);
}

function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0;

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  if (normA === 0 || normB === 0) return 0;

  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

function generateSimilarityReason(currentIssue: Issue, similarIssue: Issue, similarity: number): string {
  const reasons = [];
  
  // Check for similar titles
  const titleSimilarity = calculateTextSimilarity(currentIssue.title, similarIssue.title);
  if (titleSimilarity > 0.7) {
    reasons.push('very similar titles');
  } else if (titleSimilarity > 0.5) {
    reasons.push('similar titles');
  }

  // Check for similar content
  if (currentIssue.body && similarIssue.body) {
    const bodySimilarity = calculateTextSimilarity(currentIssue.body, similarIssue.body);
    if (bodySimilarity > 0.6) {
      reasons.push('similar content');
    }
  }

  // Check creation date proximity
  const currentDate = new Date(currentIssue.created_at);
  const similarDate = new Date(similarIssue.created_at);
  const daysDiff = Math.abs(currentDate.getTime() - similarDate.getTime()) / (1000 * 60 * 60 * 24);
  
  if (daysDiff < 7) {
    reasons.push('created around the same time');
  }

  if (reasons.length === 0) {
    return `General similarity (${Math.round(similarity * 100)}%)`;
  }

  return `${reasons.join(', ')} (${Math.round(similarity * 100)}% similar)`;
}

function calculateTextSimilarity(text1: string, text2: string): number {
  const words1 = text1.toLowerCase().split(/\s+/);
  const words2 = text2.toLowerCase().split(/\s+/);
  
  const set1 = new Set(words1);
  const set2 = new Set(words2);
  
  const intersection = new Set(Array.from(set1).filter(x => set2.has(x)));
  const union = new Set([...Array.from(set1), ...Array.from(set2)]);
  
  return intersection.size / union.size;
}

async function analyzeDuplicateWithAI(
  openai: OpenAI,
  issue: Issue,
  similarIssues: SimilarIssue[],
  content: string
): Promise<{
  isDuplicate: boolean;
  confidence: number;
  reasoning: string;
  suggestedAction: 'mark_duplicate' | 'not_duplicate' | 'review_required';
}> {
  const similarIssuesText = similarIssues
    .slice(0, 3) // Take top 3 similar issues
    .map(similar => `Issue #${similar.issueNumber}: "${similar.title}" (${similar.similarity}% similar)`)
    .join('\n');

  const prompt = `
Analyze if issue #${issue.number} is a duplicate of any of the following similar issues:

CURRENT ISSUE:
Title: "${issue.title}"
Content: "${content.substring(0, 1000)}${content.length > 1000 ? '...' : ''}"

SIMILAR ISSUES:
${similarIssuesText}

Please analyze and respond with a JSON object containing:
{
  "isDuplicate": boolean,
  "confidence": number (0-100),
  "reasoning": "explanation of your analysis",
  "suggestedAction": "mark_duplicate" | "not_duplicate" | "review_required"
}

Consider:
- Are they describing the same problem?
- Are they asking for the same solution?
- Could they be resolved by the same fix?
- Are there subtle differences that make them distinct?

Be conservative - only mark as duplicate if you're confident they're truly the same issue.
`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: 'You are an expert at analyzing GitHub issues for duplicates. Respond only with valid JSON.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.1,
    });

    const analysisText = response.choices[0]?.message?.content;
    if (!analysisText) {
      throw new Error('No response from AI');
    }

    const analysis = JSON.parse(analysisText);
    
    // Validate the response
    if (typeof analysis.isDuplicate !== 'boolean' || 
        typeof analysis.confidence !== 'number' ||
        typeof analysis.reasoning !== 'string' ||
        !['mark_duplicate', 'not_duplicate', 'review_required'].includes(analysis.suggestedAction)) {
      throw new Error('Invalid AI response format');
    }

    return analysis;
  } catch (error) {
    console.error('Error in AI duplicate analysis:', error);
    
    // Fallback analysis based on similarity scores
    const avgSimilarity = similarIssues.reduce((sum, similar) => sum + similar.similarity, 0) / similarIssues.length;
    
    return {
      isDuplicate: avgSimilarity > 80,
      confidence: Math.round(avgSimilarity * 0.8), // Reduce confidence for fallback
      reasoning: `Fallback analysis: Average similarity of ${avgSimilarity.toFixed(1)}% with ${similarIssues.length} similar issues.`,
      suggestedAction: avgSimilarity > 80 ? 'mark_duplicate' : avgSimilarity > 60 ? 'review_required' : 'not_duplicate',
    };
  }
}


