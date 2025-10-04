import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { Octokit } from '@octokit/rest'
import { OpenAI } from 'openai'

interface SpamAnalysis {
  issueNumber: number;
  title: string;
  body: string;
  analysis: {
    isSpam: boolean;
    isLowQuality: boolean;
    isSlop: boolean;
    confidence: number;
    reasoning: string;
    suggestedLabels: string[];
    suggestedAction: 'block' | 'flag' | 'review' | 'approve';
    riskFactors: string[];
  };
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { owner, repo } = await request.json()

    if (!owner || !repo) {
      return NextResponse.json({ error: 'Owner and repo are required' }, { status: 400 })
    }

    // Get user's GitHub access token
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { accessToken: true }
    })

    if (!user?.accessToken) {
      return NextResponse.json({ error: 'GitHub access token not found' }, { status: 400 })
    }

    // Initialize OpenAI
    const openaiApiKey = process.env.OPEN_AI_KEY
    if (!openaiApiKey) {
      return NextResponse.json({ error: 'OpenAI API key not configured' }, { status: 500 })
    }

    const openai = new OpenAI({ apiKey: openaiApiKey })
    const octokit = new Octokit({ auth: user.accessToken })

    // Fetch open issues and PRs
    const [issuesResponse, prsResponse] = await Promise.all([
      octokit.rest.issues.listForRepo({
        owner,
        repo,
        state: 'open',
        per_page: 50,
      }),
      octokit.rest.pulls.list({
        owner,
        repo,
        state: 'open',
        per_page: 50,
      })
    ])

    const allItems = [
      ...issuesResponse.data.map(item => ({ ...item, type: 'issue' as const })),
      ...prsResponse.data.map(item => ({ ...item, type: 'pull_request' as const }))
    ]

    const results: SpamAnalysis[] = []

    // Analyze each item for spam/low-quality content
    for (const item of allItems) {
      try {
        const content = `${item.title}\n\n${item.body || ''}`
        
        // AI analysis for spam detection
        const analysis = await analyzeForSpam(openai, content, item.type)
        
        results.push({
          issueNumber: item.number,
          title: item.title,
          body: item.body || '',
          analysis
        })

        // Add delay to respect rate limits
        await new Promise(resolve => setTimeout(resolve, 1000))
      } catch (error) {
        console.error(`Failed to analyze ${item.type} #${item.number}:`, error)
      }
    }

    // Filter to only return items that are flagged as spam, low-quality, or slop
    const flaggedItems = results.filter(result => 
      result.analysis.isSpam || result.analysis.isLowQuality || result.analysis.isSlop
    )

    return NextResponse.json({
      success: true,
      message: `Analysis complete! Found ${flaggedItems.length} items that may need review.`,
      results: flaggedItems,
      summary: {
        totalAnalyzed: results.length,
        flagged: flaggedItems.length,
        spamCount: flaggedItems.filter(r => r.analysis.isSpam).length,
        lowQualityCount: flaggedItems.filter(r => r.analysis.isLowQuality).length,
        slopCount: flaggedItems.filter(r => r.analysis.isSlop).length,
      }
    })

  } catch (error) {
    console.error('Error in spam analysis:', error)
    return NextResponse.json(
      { error: 'Failed to analyze for spam and low-quality content' }, 
      { status: 500 }
    )
  }
}

async function analyzeForSpam(openai: OpenAI, content: string, type: 'issue' | 'pull_request') {
  const prompt = `
Analyze the following GitHub ${type} for spam, low-quality content, or AI-generated "slop":

Content:
"${content}"

Evaluate for:
1. SPAM: Promotional content, irrelevant links, copy-paste templates, generic messages
2. LOW QUALITY: Trivial changes, single typo fixes, meaningless contributions, poor descriptions
3. AI SLOP: Generic AI-generated content, repetitive patterns, lack of specific context, boilerplate text

Consider these risk factors:
- Generic or template-like language
- Promotional or marketing content
- Very short, low-effort contributions
- Lack of specific technical details
- Repetitive patterns across multiple items
- Missing context or unclear purpose
- Copy-paste from other sources

Respond in JSON format:
{
  "isSpam": boolean,
  "isLowQuality": boolean,
  "isSlop": boolean,
  "confidence": 0.0-1.0,
  "reasoning": "Detailed explanation of the analysis",
  "suggestedLabels": ["label1", "label2"],
  "suggestedAction": "block|flag|review|approve",
  "riskFactors": ["factor1", "factor2"]
}`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.1,
    })

    const result = JSON.parse(response.choices[0].message.content || '{}')
    
    return {
      isSpam: result.isSpam || false,
      isLowQuality: result.isLowQuality || false,
      isSlop: result.isSlop || false,
      confidence: result.confidence || 0.5,
      reasoning: result.reasoning || 'No reasoning provided',
      suggestedLabels: result.suggestedLabels || [],
      suggestedAction: result.suggestedAction || 'review',
      riskFactors: result.riskFactors || []
    }
  } catch (error) {
    console.error('Error in AI spam analysis:', error)
    return {
      isSpam: false,
      isLowQuality: false,
      isSlop: false,
      confidence: 0.3,
      reasoning: 'AI analysis failed, manual review recommended',
      suggestedLabels: ['needs-review'],
      suggestedAction: 'review' as const,
      riskFactors: ['Analysis failed']
    }
  }
}
