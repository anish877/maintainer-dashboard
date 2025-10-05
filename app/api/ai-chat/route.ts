import { NextRequest, NextResponse } from 'next/server'
import { AIClient, AIMessage } from '@/lib/ai-client'

// Function to validate if query is related to GitHub/repository management
function isGitHubRelatedQuery(query: string): boolean {
  const githubKeywords = [
    'github', 'repository', 'repo', 'issue', 'pull request', 'pr', 'commit', 'branch',
    'merge', 'fork', 'clone', 'push', 'pull', 'stash', 'tag', 'release', 'milestone',
    'label', 'assignee', 'reviewer', 'collaborator', 'contributor', 'maintainer',
    'workflow', 'action', 'ci/cd', 'deployment', 'webhook', 'api', 'token', 'oauth',
    'organization', 'team', 'permission', 'access', 'security', 'vulnerability',
    'dependency', 'package', 'license', 'readme', 'documentation', 'wiki',
    'project board', 'kanban', 'sprint', 'backlog', 'triage', 'duplicate',
    'spam', 'lifecycle', 'analytics', 'metrics', 'dashboard', 'stats',
    'sync', 'import', 'export', 'backup', 'migration', 'integration'
  ]
  
  const queryLower = query.toLowerCase()
  
  // Check if query contains GitHub-related keywords
  const hasGitHubKeyword = githubKeywords.some(keyword => 
    queryLower.includes(keyword)
  )
  
  // Check for common non-GitHub topics to reject
  const nonGitHubTopics = [
    'weather', 'recipe', 'cooking', 'travel', 'movie', 'music', 'sports',
    'news', 'politics', 'health', 'medical', 'finance', 'investment',
    'shopping', 'fashion', 'beauty', 'education', 'school', 'university',
    'job search', 'career advice', 'relationship', 'dating', 'entertainment',
    'game', 'gaming', 'tv show', 'book', 'novel', 'art', 'design',
    'philosophy', 'psychology', 'history', 'science', 'math', 'physics',
    'chemistry', 'biology', 'astronomy', 'geography', 'economics'
  ]
  
  const hasNonGitHubTopic = nonGitHubTopics.some(topic => 
    queryLower.includes(topic)
  )
  
  // Allow if it has GitHub keywords and doesn't have non-GitHub topics
  return hasGitHubKeyword && !hasNonGitHubTopic
}

export async function POST(request: NextRequest) {
  try {
    const { 
      message, 
      messages = [], 
      systemPrompt,
      context,
      chatHistory = [],
      config = {},
      stream = false 
    } = await request.json()

    if (!process.env.OPEN_AI_KEY) {
      return NextResponse.json(
        { error: 'OpenAI API key not configured' },
        { status: 500 }
      )
    }

    if (!message && (!messages || messages.length === 0)) {
      return NextResponse.json(
        { error: 'Message or messages array is required' },
        { status: 400 }
      )
    }

    // Validate that the query is GitHub-related
    const queryToValidate = message || (messages && messages.length > 0 ? messages[messages.length - 1]?.content : '')
    if (queryToValidate && !isGitHubRelatedQuery(queryToValidate)) {
      return NextResponse.json(
        { 
          error: 'I\'m a specialized GitHub repository management assistant. I can only help with GitHub-related topics and this platform\'s features. Please ask me about repository management, issue triage, or other GitHub-related tasks.',
          restricted: true 
        },
        { status: 200 }
      )
    }

    const aiClient = new AIClient()

    // Create enhanced system prompt with user context
    const enhancedSystemPrompt = systemPrompt || `You are a specialized GitHub repository management AI assistant for this application. You can ONLY help with topics directly related to this GitHub management platform:

ALLOWED TOPICS:
- GitHub repository management and analysis
- Issue triage, tracking, and lifecycle management
- Code review assistance and pull request analysis
- GitHub workflow optimization and automation
- Repository statistics, analytics, and insights
- GitHub API usage and integration
- Repository settings and configuration
- Issue labeling, categorization, and prioritization
- Contributor management and assignments
- Repository security and compliance
- GitHub Actions and CI/CD workflows

STRICT RESTRICTIONS:
- Do NOT answer general questions unrelated to GitHub or this platform
- Do NOT provide information about other software, technologies, or platforms
- Do NOT give advice on non-GitHub related topics
- Do NOT answer questions about programming languages, frameworks, or tools outside of GitHub context
- Do NOT provide general knowledge, trivia, or entertainment

If a user asks about topics outside these allowed areas, politely redirect them by saying: "I'm a specialized GitHub repository management assistant. I can only help with GitHub-related topics and this platform's features. Please ask me about repository management, issue triage, or other GitHub-related tasks."

${context ? `
Current user context:
- User ID: ${context.userId}
- Username: ${context.username || 'Not available'}
- Name: ${context.name || 'Not available'}
- Email: ${context.email || 'Not available'}
- Current page: ${context.currentPage || 'Unknown'}
- Repositories: ${context.repositories?.length || 0} repositories
` : ''}

Be helpful, concise, and focus on GitHub-related topics. If the user asks about something outside of GitHub, politely redirect them to GitHub-related topics.`

    if (stream) {
      // Handle streaming response
      if (message) {
        // Single message with optional history
        const history: AIMessage[] = messages || []
        const result = await aiClient.streamConversation(
          message,
          history,
          enhancedSystemPrompt,
          {
            ...config,
            tools: [], // Empty tools array as requested
            toolChoice: 'auto'
          }
        )

        const encoder = new TextEncoder()
        const stream = new ReadableStream({
          async start(controller) {
            try {
              for await (const chunk of result.textStream) {
                const data = encoder.encode(`data: ${JSON.stringify({ content: chunk })}\n\n`)
                controller.enqueue(data)
              }
              
              // Send completion signal
              const endData = encoder.encode(`data: ${JSON.stringify({ done: true })}\n\n`)
              controller.enqueue(endData)
              controller.close()
            } catch (error) {
              console.error('Streaming error:', error)
              const errorData = encoder.encode(`data: ${JSON.stringify({ error: 'Streaming failed' })}\n\n`)
              controller.enqueue(errorData)
              controller.close()
            }
          }
        })

        return new Response(stream, {
          headers: {
            'Content-Type': 'text/plain; charset=utf-8',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
          },
        })
      } else {
        // Multiple messages
        const result = await aiClient.streamText(
          messages,
          {
            ...config,
            systemPrompt,
            tools: [], // Empty tools array as requested
            toolChoice: 'auto'
          }
        )

        const encoder = new TextEncoder()
        const stream = new ReadableStream({
          async start(controller) {
            try {
              for await (const chunk of result.textStream) {
                const data = encoder.encode(`data: ${JSON.stringify({ content: chunk })}\n\n`)
                controller.enqueue(data)
              }
              
              // Send completion signal
              const endData = encoder.encode(`data: ${JSON.stringify({ done: true })}\n\n`)
              controller.enqueue(endData)
              controller.close()
            } catch (error) {
              console.error('Streaming error:', error)
              const errorData = encoder.encode(`data: ${JSON.stringify({ error: 'Streaming failed' })}\n\n`)
              controller.enqueue(errorData)
              controller.close()
            }
          }
        })

        return new Response(stream, {
          headers: {
            'Content-Type': 'text/plain; charset=utf-8',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
          },
        })
      }
    } else {
      // Handle non-streaming response
      let result
      
      if (message) {
        // Single message with optional history
        const history: AIMessage[] = messages || []
        result = await aiClient.conversation(
          message,
          history,
          enhancedSystemPrompt,
          {
            ...config,
            tools: [], // Empty tools array as requested
            toolChoice: 'auto'
          }
        )
      } else {
        // Multiple messages
        result = await aiClient.generateText(
          messages,
          {
            ...config,
            systemPrompt,
            tools: [], // Empty tools array as requested
            toolChoice: 'auto'
          }
        )
      }

      return NextResponse.json({
        success: true,
        response: result.text,
        toolCalls: result.toolCalls || []
      })
    }
  } catch (error) {
    console.error('AI Chat API Error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to process AI request',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

// Handle preflight requests
export async function OPTIONS() {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  })
}
