import OpenAI from 'openai';
import { prisma } from '@/lib/prisma';

// Lazy initialization to prevent build-time errors
let _openai: OpenAI | null = null;
const getOpenAI = () => {
  if (!_openai) {
    if (!process.env.OPEN_AI_KEY) {
      throw new Error('OpenAI API key is required. Set OPEN_AI_KEY environment variable.');
    }
    _openai = new OpenAI({ apiKey: process.env.OPEN_AI_KEY });
  }
  return _openai;
};

export interface ClassificationResult {
  is_bug: boolean;
  type: string;
  confidence: number;
  summary: string;
  severity: string;
  technical_details: string;
  labels: string[];
  affected_area: string;
  user_impact: number;
  sentiment: number;
}

export async function classifyPost(postId: string): Promise<ClassificationResult | null> {
  try {
    const post = await prisma.scrapedPost.findUnique({ 
      where: { id: postId },
      include: { processedIssue: true }
    });
    
    if (!post || post.processed || post.processedIssue) {
      return null;
    }
    
    console.log(`Classifying post: ${post.title}`);
    
    // Step 1: AI Classification
    const prompt = `Analyze this ${post.source} post and classify it as a potential bug report, issue, or user complaint.

Title: ${post.title}
Content: ${post.content.substring(0, 1000)}
Source: ${post.source}
Upvotes: ${post.upvotes}
Comments: ${post.commentCount}
Author: ${post.author}
Posted: ${post.postedAt}

CRITICAL: Only classify this as relevant if it's specifically about a particular repository, application, framework, or tool. Do NOT classify generic programming questions or general technology discussions.

Respond ONLY with valid JSON in this exact format:
{
  "is_bug": true/false,
  "type": "bug|feature_request|question|documentation|spam|other",
  "confidence": 0.0-1.0,
  "summary": "one-line technical summary",
  "severity": "critical|high|medium|low|info",
  "technical_details": "detailed technical explanation of the issue",
  "labels": ["label1", "label2"],
  "affected_area": "ui|api|database|auth|performance|deployment|other",
  "user_impact": 1-100,
  "sentiment": -1.0 to 1.0
}

Focus on identifying:
- Issues specifically about a particular application, framework, or tool
- User complaints about a specific software product
- Technical problems with a particular library or framework
- Questions about a specific tool or application
- Feature requests for a particular software product

REJECT if:
- Generic programming questions
- General technology discussions
- Questions about multiple different tools
- Posts that don't mention a specific application/framework

Be strict - only include posts that are clearly about a specific repository/application.`;

    const response = await getOpenAI().chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { 
          role: 'system', 
          content: 'You are a technical bug triage assistant for software development teams. Analyze posts and classify them as potential bugs or issues that need developer attention. Always respond with valid JSON.' 
        },
        { role: 'user', content: prompt }
      ],
      temperature: 0.3,
      response_format: { type: 'json_object' }
    });
    
    const classification = JSON.parse(response.choices[0].message.content!) as ClassificationResult;
    
    // Step 2: Generate embedding for duplicate detection
    const embeddingResponse = await getOpenAI().embeddings.create({
      model: 'text-embedding-3-small',
      input: `${post.title} ${classification.summary}`
    });
    
    const embedding = embeddingResponse.data[0].embedding;
    
    // Step 3: Check for duplicates using cosine similarity
    const existingIssues = await prisma.processedIssue.findMany({
      where: {
        type: classification.type,
        status: { not: 'rejected' }
      },
      select: { id: true, embedding: true, summary: true }
    });
    
    let isDuplicate = false;
    let duplicateOfId = null;
    let duplicateScore = 0;
    
    for (const issue of existingIssues) {
      if (issue.embedding) {
        const existingEmb = JSON.parse(issue.embedding);
        const similarity = cosineSimilarity(embedding, existingEmb);
        
        if (similarity > 0.85) { // 85% similarity threshold
          isDuplicate = true;
          duplicateOfId = issue.id;
          duplicateScore = similarity;
          break;
        }
      }
    }
    
    // Step 4: Save to database
    await prisma.processedIssue.create({
      data: {
        scrapedPostId: post.id,
        type: classification.type,
        confidence: classification.confidence,
        summary: classification.summary,
        technicalDetails: classification.technical_details,
        severity: classification.severity,
        suggestedLabels: classification.labels,
        affectedArea: classification.affected_area,
        userImpact: classification.user_impact,
        sentimentScore: classification.sentiment,
        isDuplicate,
        duplicateOfId,
        duplicateScore,
        embedding: JSON.stringify(embedding),
        aiTokensUsed: response.usage?.total_tokens,
        status: isDuplicate ? 'duplicate' : 'pending'
      }
    });
    
    await prisma.scrapedPost.update({
      where: { id: post.id },
      data: { processed: true }
    });
    
    console.log(`Post classified: ${classification.type} (${classification.confidence}) - ${isDuplicate ? 'DUPLICATE' : 'NEW'}`);
    
    return classification;
    
  } catch (error) {
    console.error(`Error classifying post ${postId}:`, error);
    
    // Mark post as failed processing
    await prisma.scrapedPost.update({
      where: { id: postId },
      data: { 
        processingError: error instanceof Error ? error.message : 'Unknown error',
        retryCount: { increment: 1 }
      }
    });
    
    return null;
  }
}

export async function classifyBatch(postIds: string[]): Promise<ClassificationResult[]> {
  const results: ClassificationResult[] = [];
  
  // Process in parallel but with rate limiting
  const batchSize = 3;
  for (let i = 0; i < postIds.length; i += batchSize) {
    const batch = postIds.slice(i, i + batchSize);
    
    const batchPromises = batch.map(async (postId) => {
      const result = await classifyPost(postId);
      if (result) {
        results.push(result);
      }
      return result;
    });
    
    await Promise.all(batchPromises);
    
    // Add delay between batches to respect rate limits
    if (i + batchSize < postIds.length) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  
  return results;
}

export async function getUnprocessedPosts(limit: number = 20) {
  return await prisma.scrapedPost.findMany({
    where: { 
      processed: false,
      retryCount: { lt: 3 } // Don't retry failed posts more than 3 times
    },
    orderBy: { scrapedAt: 'desc' },
    take: limit
  });
}

export async function processNewPosts(limit: number = 20) {
  const unprocessed = await getUnprocessedPosts(limit);
  const postIds = unprocessed.map(post => post.id);
  
  if (postIds.length === 0) {
    console.log('No unprocessed posts found');
    return [];
  }
  
  console.log(`Processing ${postIds.length} posts...`);
  const results = await classifyBatch(postIds);
  
  console.log(`Classification complete: ${results.length} posts processed`);
  return results;
}

function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0;
  
  const dotProduct = a.reduce((sum, val, i) => sum + val * b[i], 0);
  const magnitudeA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
  const magnitudeB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));
  
  if (magnitudeA === 0 || magnitudeB === 0) return 0;
  
  return dotProduct / (magnitudeA * magnitudeB);
}

// Utility function to get classification statistics
export async function getClassificationStats() {
  const stats = await prisma.processedIssue.groupBy({
    by: ['type', 'status'],
    _count: { id: true },
    _avg: { confidence: true }
  });
  
  const total = await prisma.processedIssue.count();
  const duplicates = await prisma.processedIssue.count({ where: { isDuplicate: true } });
  
  return {
    total,
    duplicates,
    byType: stats.reduce((acc, stat) => {
      if (!acc[stat.type]) acc[stat.type] = {};
      acc[stat.type][stat.status] = {
        count: stat._count.id,
        avgConfidence: stat._avg.confidence
      };
      return acc;
    }, {} as Record<string, Record<string, { count: number; avgConfidence: number | null }>>)
  };
}
