import OpenAI from 'openai';

// Lazy initialization to prevent build-time errors
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

export interface KeywordGenerationResult {
  keywords: string[];
  reasoning: string;
  confidence: number;
}

export async function generateRepositoryKeywords(
  repositoryName: string,
  repositoryDescription?: string,
  repositoryLanguage?: string,
  repositoryTopics?: string[]
): Promise<KeywordGenerationResult> {
  try {
    console.log(`Generating keywords for repository: ${repositoryName}`);
    
    // Extract repository name without owner for better matching
    const repoName = repositoryName.split('/').pop() || repositoryName;
    
    const prompt = `Analyze this repository and generate smart search keywords for finding bugs, issues, and complaints.

Repository: ${repositoryName}
Description: ${repositoryDescription || 'No description available'}
Language: ${repositoryLanguage || 'Unknown'}
Topics: ${repositoryTopics?.join(', ') || 'None'}

First, identify what this repository is about:
- Is it a framework, library, tool, application, or website?
- What technology stack does it use?
- What is its main purpose or functionality?

Then generate 25-35 specific keywords that would help find:
1. Bug reports mentioning this specific repository/framework
2. User complaints and frustrations about this tool
3. Error messages and stack traces related to this technology
4. Performance problems with this specific tool
5. Installation and setup issues
6. Compatibility problems
7. Documentation issues
8. Feature requests that indicate problems

IMPORTANT: Include the repository name and common variations in your keywords.

Focus on:
- Repository name variations (${repoName}, ${repoName.toLowerCase()}, etc.)
- Technology-specific error terms
- User frustration indicators (hate, terrible, awful, frustrating, annoying)
- Technical problem indicators (crash, freeze, slow, timeout, fail, broken)
- Installation and setup problems
- Version compatibility issues
- Framework/library specific terms

Respond with JSON in this exact format:
{
  "keywords": ["keyword1", "keyword2", "keyword3", ...],
  "reasoning": "Brief explanation of what this repository is and why these keywords were chosen",
  "confidence": 0.85
}`;

    const response = await getOpenAI().chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { 
          role: 'system', 
          content: 'You are an expert at analyzing software repositories and generating search keywords to find bugs, issues, and user complaints. Always respond with valid JSON. Always include the repository name in keywords.' 
        },
        { role: 'user', content: prompt }
      ],
      temperature: 0.3,
      response_format: { type: 'json_object' }
    });
    
    const result = JSON.parse(response.choices[0].message.content!) as KeywordGenerationResult;
    
    // Ensure repository name is included in keywords
    const repoNameLower = repoName.toLowerCase();
    if (!result.keywords.some(keyword => keyword.toLowerCase().includes(repoNameLower))) {
      result.keywords.unshift(repoNameLower);
    }
    
    console.log(`Generated ${result.keywords.length} keywords for ${repositoryName}`);
    return result;
    
  } catch (error) {
    console.error(`Error generating keywords for ${repositoryName}:`, error);
    
    // Fallback keywords if AI fails - include repository name
    const repoName = repositoryName.split('/').pop() || repositoryName;
    return {
      keywords: [
        repoName.toLowerCase(),
        repositoryName.toLowerCase(),
        'bug', 'error', 'issue', 'problem', 'broken', 'not working',
        'crash', 'freeze', 'slow', 'timeout', 'fail', 'failed',
        'hate', 'terrible', 'awful', 'frustrating', 'annoying',
        'installation', 'setup', 'compatibility', 'version'
      ],
      reasoning: 'Fallback keywords generated due to AI service error',
      confidence: 0.5
    };
  }
}

export async function generateIssueFromResult(
  repositoryName: string,
  result: any
): Promise<{
  title: string;
  body: string;
  labels: string[];
  severity: string;
  type: string;
  sourceUrl: string;
  sourcePost: string;
}> {
  try {
    console.log(`Generating issue for repository: ${repositoryName}`);
    
    const prompt = `Generate a GitHub issue from this community post about "${repositoryName}".

Repository: ${repositoryName}
Source: ${result.source}
Title: ${result.title}
Content: ${result.content}
Author: ${result.author}
Upvotes: ${result.upvotes}
Comments: ${result.commentCount}
Posted: ${result.postedAt}
URL: ${result.sourceUrl}

AI Analysis:
- Is Bug: ${result.isBug}
- Confidence: ${result.confidence}
- Severity: ${result.severity}
- Summary: ${result.summary}
- Technical Details: ${result.technicalDetails}
- Affected Area: ${result.affectedArea}
- User Impact: ${result.userImpact}
- Sentiment: ${result.sentiment}
- Suggested Labels: ${result.suggestedLabels?.join(', ') || 'None'}

Generate a professional GitHub issue with:
1. Clear, descriptive title
2. Detailed description with context
3. Steps to reproduce (if applicable)
4. Expected vs actual behavior
5. Environment details
6. Source attribution

Respond with JSON in this exact format:
{
  "title": "Clear, descriptive issue title",
  "body": "Detailed issue description with markdown formatting",
  "labels": ["label1", "label2", "label3"],
  "severity": "critical|high|medium|low",
  "type": "bug|feature_request|question",
  "sourceUrl": "${result.sourceUrl}",
  "sourcePost": "${result.content.substring(0, 500)}"
}`;

    const response = await getOpenAI().chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { 
          role: 'system', 
          content: 'You are an expert at creating professional GitHub issues from community feedback. Always respond with valid JSON and create clear, actionable issues.' 
        },
        { role: 'user', content: prompt }
      ],
      temperature: 0.3,
      response_format: { type: 'json_object' }
    });
    
    const issue = JSON.parse(response.choices[0].message.content!);
    
    console.log(`Generated issue for ${repositoryName}: ${issue.title}`);
    return issue;
    
  } catch (error) {
    console.error(`Error generating issue for ${repositoryName}:`, error);
    
    // Fallback issue generation
    return {
      title: `Community Report: ${result.title}`,
      body: `## Description
${result.summary}

## Source
This issue was reported by the community:
- **Source**: ${result.source}
- **Author**: ${result.author}
- **Original Post**: ${result.sourceUrl}
- **Posted**: ${new Date(result.postedAt).toLocaleDateString()}

## Details
${result.technicalDetails}

## Affected Area
${result.affectedArea}

## User Impact
${result.userImpact}/100

## Original Content
${result.content.substring(0, 1000)}...`,
      labels: result.suggestedLabels || ['community-report', 'bug'],
      severity: result.severity,
      type: result.isBug ? 'bug' : 'question',
      sourceUrl: result.sourceUrl,
      sourcePost: result.content
    };
  }
}
