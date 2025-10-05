/**
 * Simplified AI Completeness Analyzer
 * 
 * This module provides a streamlined approach to analyzing GitHub issues for completeness.
 * It focuses on the essential elements and generates natural, helpful comments.
 */

import OpenAI from 'openai';

export interface IssueData {
  title: string;
  body: string;
  number: number;
  url: string;
  author: string;
  repository: string;
  createdAt: string;
  labels: string[];
}

export interface CompletenessAnalysis {
  overallScore: number; // 0-100
  confidence: number; // 0-1
  missingElements: string[];
  suggestions: string[];
  needsImage: boolean;
  isComplete: boolean;
  reasoning: string;
}

export interface GeneratedComment {
  content: string;
  isHelpful: boolean;
  tone: 'friendly' | 'professional' | 'encouraging';
}

class SimpleCompletenessAnalyzer {
  private openai: OpenAI;
  
  constructor() {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OpenAI API key is required');
    }
    
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  /**
   * Analyze issue completeness with smart detection
   */
  async analyzeIssue(issueData: IssueData): Promise<CompletenessAnalysis> {
    const content = `${issueData.title}\n\n${issueData.body}`;
    
    const prompt = `Analyze this GitHub issue for completeness and provide a detailed assessment.

Issue Title: ${issueData.title}
Issue Body: ${issueData.body}
Issue Number: ${issueData.number}
Repository: ${issueData.repository}
Author: ${issueData.author}
Labels: ${issueData.labels.join(', ')}

Please analyze this issue and provide a JSON response with the following structure:

{
  "overallScore": 0-100,
  "confidence": 0.0-1.0,
  "missingElements": ["element1", "element2"],
  "suggestions": ["suggestion1", "suggestion2"],
  "needsImage": true/false,
  "isComplete": true/false,
  "reasoning": "Detailed explanation of the analysis"
}

Analysis Criteria:
1. **Reproduction Steps** - Clear steps to reproduce the issue
2. **Expected vs Actual Behavior** - What should happen vs what actually happens
3. **Environment Information** - OS, browser, version, etc.
4. **Error Messages/Logs** - Any error messages or stack traces
5. **Screenshots/Visual Evidence** - Images, videos, or visual proof (SMART: Only if the issue is visual or UI-related)
6. **Code Examples** - Relevant code snippets or configurations
7. **Additional Context** - Any other helpful information

Smart Detection Rules:
- Only mark "needsImage" as true if the issue is clearly visual/UI-related
- Consider the issue type: bugs, feature requests, questions, documentation
- For text-based issues, images are usually not needed
- For UI/visual bugs, images are essential
- For performance issues, logs/metrics are more important than images

Score Guidelines:
- 90-100: Complete and excellent
- 70-89: Good, minor improvements needed
- 50-69: Moderate, several elements missing
- 30-49: Poor, major elements missing
- 0-29: Very incomplete, needs significant improvement

Focus on being helpful and encouraging in your analysis.`;

    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { 
            role: 'system', 
            content: 'You are an expert GitHub issue reviewer. Analyze issues for completeness and provide helpful, constructive feedback. Always respond with valid JSON.' 
          },
          { role: 'user', content: prompt }
        ],
        temperature: 0.3,
        response_format: { type: 'json_object' }
      });

      const analysis = JSON.parse(response.choices[0].message.content!) as CompletenessAnalysis;
      
      // Validate and clean the response
      return {
        overallScore: Math.max(0, Math.min(100, analysis.overallScore || 0)),
        confidence: Math.max(0, Math.min(1, analysis.confidence || 0.5)),
        missingElements: Array.isArray(analysis.missingElements) ? analysis.missingElements : [],
        suggestions: Array.isArray(analysis.suggestions) ? analysis.suggestions : [],
        needsImage: Boolean(analysis.needsImage),
        isComplete: Boolean(analysis.isComplete),
        reasoning: analysis.reasoning || 'Analysis completed'
      };

    } catch (error) {
      console.error('AI analysis failed:', error);
      
      // Fallback analysis
      return {
        overallScore: 50,
        confidence: 0.3,
        missingElements: ['Unable to analyze - AI service unavailable'],
        suggestions: ['Please ensure the issue has clear reproduction steps and expected behavior'],
        needsImage: false,
        isComplete: false,
        reasoning: 'AI analysis failed, using fallback assessment'
      };
    }
  }

  /**
   * Generate a helpful comment for incomplete issues
   */
  async generateComment(issueData: IssueData, analysis: CompletenessAnalysis): Promise<GeneratedComment> {
    if (analysis.isComplete || analysis.overallScore >= 80) {
      return {
        content: '',
        isHelpful: false,
        tone: 'professional'
      };
    }

    const prompt = `Generate a helpful, encouraging comment for this GitHub issue that needs more information.

Issue Title: ${issueData.title}
Issue Author: ${issueData.author}
Missing Elements: ${analysis.missingElements.join(', ')}
Suggestions: ${analysis.suggestions.join(', ')}
Needs Image: ${analysis.needsImage}
Quality Score: ${analysis.overallScore}/100

Generate a comment that:
1. Is friendly and encouraging (not demanding)
2. Thanks the user for their contribution
3. Politely asks for the missing information
4. Provides specific, actionable requests
5. Offers help if they need assistance
6. Keeps it concise but thorough

The comment should be natural and human-like, not templated. Make it feel like a helpful maintainer is asking for clarification.

Respond with JSON:
{
  "content": "The actual comment text",
  "isHelpful": true/false,
  "tone": "friendly|professional|encouraging"
}`;

    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { 
            role: 'system', 
            content: 'You are a helpful GitHub maintainer. Write encouraging, constructive comments that help users improve their issue reports. Always respond with valid JSON.' 
          },
          { role: 'user', content: prompt }
        ],
        temperature: 0.7,
        response_format: { type: 'json_object' }
      });

      const result = JSON.parse(response.choices[0].message.content!) as GeneratedComment;
      
      return {
        content: result.content || 'Thank you for reporting this issue! Please provide more details.',
        isHelpful: Boolean(result.isHelpful),
        tone: result.tone || 'friendly'
      };

    } catch (error) {
      console.error('Comment generation failed:', error);
      
      // Fallback comment
      const missingElements = analysis.missingElements.slice(0, 3);
      const comment = `Hi @${issueData.author}! 👋 

Thanks for reporting this issue. To help us better understand and resolve it, could you please provide:

${missingElements.map(element => `• ${this.formatMissingElement(element)}`).join('\n')}

This additional information will help us reproduce and fix the issue more quickly. Let us know if you need any help! 🙏`;
      
      return {
        content: comment,
        isHelpful: true,
        tone: 'friendly'
      };
    }
  }

  /**
   * Format missing element names for better readability
   */
  private formatMissingElement(element: string): string {
    const formatted = element.toLowerCase().replace(/[_-]/g, ' ');
    return formatted.charAt(0).toUpperCase() + formatted.slice(1);
  }

  /**
   * Batch analyze multiple issues
   */
  async analyzeMultipleIssues(issues: IssueData[]): Promise<Array<{
    issueData: IssueData;
    analysis: CompletenessAnalysis;
    generatedComment?: GeneratedComment;
  }>> {
    const results = [];
    
    // Process in small batches to respect rate limits
    const batchSize = 3;
    for (let i = 0; i < issues.length; i += batchSize) {
      const batch = issues.slice(i, i + batchSize);
      
      const batchResults = await Promise.allSettled(
        batch.map(async (issueData) => {
          try {
            const analysis = await this.analyzeIssue(issueData);
            const generatedComment = analysis.overallScore < 80 
              ? await this.generateComment(issueData, analysis)
              : undefined;
            
            return {
              issueData,
              analysis,
              generatedComment
            };
          } catch (error) {
            console.error(`Failed to analyze issue ${issueData.number}:`, error);
            return null;
          }
        })
      );
      
      // Add successful results
      batchResults.forEach((result) => {
        if (result.status === 'fulfilled' && result.value) {
          results.push(result.value);
        }
      });
      
      // Add delay between batches
      if (i + batchSize < issues.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    return results;
  }
}

// Export singleton instance with lazy initialization
let _simpleCompletenessAnalyzer: SimpleCompletenessAnalyzer | null = null;

export const simpleCompletenessAnalyzer = {
  get instance() {
    if (!_simpleCompletenessAnalyzer) {
      _simpleCompletenessAnalyzer = new SimpleCompletenessAnalyzer();
    }
    return _simpleCompletenessAnalyzer;
  }
};
