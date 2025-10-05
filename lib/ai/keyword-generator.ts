import OpenAI from 'openai';

// Lazy initialization to prevent build-time errors
let _openai: OpenAI | null = null;
const getOpenAI = () => {
  if (!_openai) {
    const apiKey = process.env.OPEN_AI_KEY || process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OpenAI API key is required. Set OPEN_AI_KEY or OPENAI_API_KEY environment variable.');
    }
    _openai = new OpenAI({
      apiKey: apiKey,
    });
  }
  return _openai;
};

export interface KeywordGenerationResult {
  keywords: string[];
  reasoning: string;
  confidence: number;
}

export class AIKeywordGenerator {
  static async generateRepoKeywords(
    repositoryName: string,
    repositoryDescription?: string,
    repositoryTopics?: string[]
  ): Promise<KeywordGenerationResult> {
    try {
      const prompt = this.buildPrompt(repositoryName, repositoryDescription, repositoryTopics);
      
      const response = await getOpenAI().chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: "You are an expert at analyzing software repositories and generating targeted search keywords for finding bug reports, issues, and problems related to specific technologies and projects."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 1000
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error('No response from AI');
      }

      return this.parseAIResponse(content);
    } catch (error) {
      console.error('Error generating keywords with AI:', error);
      // Fallback to rule-based keywords
      return this.getFallbackKeywords(repositoryName);
    }
  }

  private static buildPrompt(
    repoName: string,
    description?: string,
    topics?: string[]
  ): string {
    const descriptionText = description ? `\nRepository Description: ${description}` : '';
    const topicsText = topics && topics.length > 0 ? `\nRepository Topics: ${topics.join(', ')}` : '';
    
    return `
Analyze this software repository and generate targeted search keywords for finding bug reports, issues, and problems in community discussions (Reddit, Stack Overflow).

Repository Name: ${repoName}${descriptionText}${topicsText}

Please generate 15-20 specific keywords/phrases that would help find:
1. Bug reports and error messages related to this technology/project
2. Common problems users face when using this technology
3. Installation, configuration, or deployment issues
4. Performance problems or crashes
5. Compatibility issues

Focus on:
- Technology-specific error terms (e.g., "nextjs build error", "react hydration issue")
- Common user problems (e.g., "next.js not working", "react component not rendering")
- Specific error patterns (e.g., "nextjs deployment failed", "react hooks error")
- Platform-specific issues (e.g., "next.js vercel error", "react netlify build")

Format your response as JSON:
{
  "keywords": ["keyword1", "keyword2", "keyword3", ...],
  "reasoning": "Brief explanation of why these keywords were chosen",
  "confidence": 0.85
}

Make keywords specific to the technology and common user pain points. Avoid overly generic terms like just "error" or "bug".
    `.trim();
  }

  private static parseAIResponse(content: string): KeywordGenerationResult {
    try {
      // Try to extract JSON from the response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          keywords: parsed.keywords || [],
          reasoning: parsed.reasoning || 'AI-generated keywords',
          confidence: parsed.confidence || 0.8
        };
      }
      
      // Fallback parsing if JSON extraction fails
      throw new Error('Could not parse JSON from AI response');
    } catch (error) {
      console.error('Error parsing AI response:', error);
      // Extract keywords manually from text
      const lines = content.split('\n');
      const keywords: string[] = [];
      
      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed && !trimmed.includes(':') && !trimmed.includes('{') && !trimmed.includes('}')) {
          // Remove quotes and clean up
          const keyword = trimmed.replace(/['"]/g, '').replace(/^[-*]\s*/, '').trim();
          if (keyword.length > 2 && keyword.length < 50) {
            keywords.push(keyword);
          }
        }
      }
      
      return {
        keywords: keywords.slice(0, 15),
        reasoning: 'Extracted from AI response text',
        confidence: 0.6
      };
    }
  }

  private static getFallbackKeywords(repoName: string): KeywordGenerationResult {
    const repo = repoName.toLowerCase();
    
    // Technology-specific fallback keywords
    if (repo.includes('next') || repo.includes('nextjs')) {
      return {
        keywords: [
          'nextjs error', 'next.js bug', 'next.js not working', 'nextjs crash',
          'next.js build error', 'nextjs deployment issue', 'next.js routing problem',
          'nextjs api error', 'next.js hydration error', 'nextjs ssr issue',
          'next.js vercel error', 'nextjs static export failed', 'next.js image error'
        ],
        reasoning: 'Fallback keywords for Next.js projects',
        confidence: 0.7
      };
    }
    
    if (repo.includes('react')) {
      return {
        keywords: [
          'react error', 'reactjs bug', 'react not working', 'react crash',
          'react component error', 'reactjs state issue', 'react hook error',
          'react rendering problem', 'react performance issue', 'react hydration error'
        ],
        reasoning: 'Fallback keywords for React projects',
        confidence: 0.7
      };
    }
    
    // Generic fallback
    return {
      keywords: [
        `${repoName} error`, `${repoName} bug`, `${repoName} not working`,
        `${repoName} crash`, `${repoName} issue`, `${repoName} problem`,
        `${repoName} installation failed`, `${repoName} configuration error`
      ],
      reasoning: 'Generic fallback keywords',
      confidence: 0.5
    };
  }

  // Cache keywords to avoid repeated AI calls for the same repo
  private static keywordCache = new Map<string, KeywordGenerationResult>();
  
  static async getCachedKeywords(
    repositoryName: string,
    repositoryDescription?: string,
    repositoryTopics?: string[]
  ): Promise<KeywordGenerationResult> {
    const cacheKey = `${repositoryName}-${repositoryDescription || ''}-${repositoryTopics?.join(',') || ''}`;
    
    if (this.keywordCache.has(cacheKey)) {
      console.log(`📋 Using cached keywords for ${repositoryName}`);
      return this.keywordCache.get(cacheKey)!;
    }
    
    console.log(`🤖 Generating AI keywords for ${repositoryName}`);
    const result = await this.generateRepoKeywords(repositoryName, repositoryDescription, repositoryTopics);
    
    // Cache for 24 hours
    this.keywordCache.set(cacheKey, result);
    setTimeout(() => {
      this.keywordCache.delete(cacheKey);
    }, 24 * 60 * 60 * 1000);
    
    return result;
  }
}
