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
    
    const prompt = `Analyze this repository and generate search keywords for finding bugs, issues, and complaints about the ACTUAL SERVICE/FRAMEWORK that users would mention.

Repository: ${repositoryName}
Description: ${repositoryDescription || 'No description available'}
Language: ${repositoryLanguage || 'Unknown'}
Topics: ${repositoryTopics?.join(', ') || 'None'}

CRITICAL: Extract the REAL SERVICE NAME that users would actually mention when complaining about this tool. Don't use the full repository path.

Examples:
- Repository "anish877/next.js" → Users mention "Next.js" or "NextJS"
- Repository "facebook/react" → Users mention "React" 
- Repository "microsoft/vscode" → Users mention "VS Code" or "Visual Studio Code"
- Repository "vercel/next.js" → Users mention "Next.js" or "NextJS"

First, identify:
1. What is the ACTUAL service/framework name that users would type when complaining?
2. What are common variations and nicknames?
3. What package names or commands are associated with this tool?

Then generate 30-40 keywords that users would actually type when complaining about this service:

1. Service name variations (Next.js, NextJS, nextjs, etc.)
2. Common abbreviations or nicknames
3. Package names (npm packages, pip packages, etc.)
4. Command names or CLI tools
5. Brand names or product names
6. Framework/library name variations

IMPORTANT: 
- Focus on the ACTUAL SERVICE NAME, not the repository path
- Users complain about "Next.js" not "anish877/next.js"
- Include common variations and nicknames
- Think about what users would actually type in search

Examples of good keywords for Next.js:
- "Next.js bug"
- "NextJS error" 
- "nextjs not working"
- "Next.js crash"
- "next.js installation"
- "NextJS setup"

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
    
    // Fallback keywords if AI fails - focus on service name
    const repoName = repositoryName.split('/').pop() || repositoryName;
    const serviceName = repoName.toLowerCase();
    
    return {
      keywords: [
        `${serviceName} bug`,
        `${serviceName} error`,
        `${serviceName} issue`,
        `${serviceName} problem`,
        `${serviceName} not working`,
        `${serviceName} broken`,
        `${serviceName} crash`,
        `${serviceName} fail`,
        `${serviceName} installation`,
        `${serviceName} setup`,
        `${serviceName} hate`,
        `${serviceName} terrible`,
        `${serviceName} frustrating`,
        `${serviceName} slow`,
        `${serviceName} timeout`,
        serviceName,
        // Add common variations
        serviceName.replace(/\./g, ''),
        serviceName.replace(/\./g, ' '),
        serviceName.replace(/\./g, '-')
      ],
      reasoning: 'Fallback keywords generated due to AI service error - focused on service name variations',
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
