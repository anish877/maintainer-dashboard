import { NextRequest, NextResponse } from 'next/server'
import { AIClient, AIMessage } from '@/lib/ai-client'

// Available pages and their routing information
const AVAILABLE_PAGES = {
  '/dashboard': {
    name: 'Dashboard',
    description: 'Main dashboard with GitHub analytics and overview',
    keywords: ['dashboard', 'overview', 'analytics', 'stats', 'summary', 'home'],
    icon: 'BarChart3'
  },
  '/chat': {
    name: 'AI Chat',
    description: 'Chat with AI assistant for GitHub management help',
    keywords: ['chat', 'ai', 'assistant', 'help', 'support', 'conversation'],
    icon: 'MessageCircle'
  },
  '/repos': {
    name: 'Repositories',
    description: 'View and manage all your GitHub repositories',
    keywords: ['repos', 'repositories', 'repository', 'projects', 'code', 'source'],
    icon: '📁'
  },
  '/assignments': {
    name: 'Assignments',
    description: 'Manage issue and pull request assignments',
    keywords: ['assignments', 'assign', 'tasks', 'work', 'responsibilities'],
    icon: 'ClipboardList'
  },
  '/scraper-dashboard': {
    name: 'AI Scraper',
    description: 'AI-powered web scraping and data collection',
    keywords: ['scraper', 'scraping', 'data collection', 'extract', 'crawl'],
    icon: 'Spider'
  },
  '/completeness': {
    name: 'Completeness Checker',
    description: 'Check and improve issue completeness',
    keywords: ['completeness', 'check', 'validation', 'review', 'quality'],
    icon: '✅'
  },
  '/settings': {
    name: 'Settings',
    description: 'Application settings and configuration',
    keywords: ['settings', 'config', 'configuration', 'preferences', 'options'],
    icon: 'Settings'
  }
}

// Function to parse delimited response and extract routing information
function parseDelimitedResponse(response: string): { content: string, routeTo?: string } {
  // Look for routing delimiters
  const routePattern = /\[ROUTE:([^\]]+)\]/g
  const routeMatch = routePattern.exec(response)
  
  let routeTo: string | undefined
  let content = response
  
  if (routeMatch) {
    routeTo = routeMatch[1]
    // Remove the routing delimiter from the content
    content = response.replace(routePattern, '').trim()
  }
  
  return { content, routeTo }
}

// Function to determine if user query suggests page navigation
function suggestPageNavigation(query: string): { suggestedPage: string | null, confidence: number } {
  const queryLower = query.toLowerCase()
  let bestMatch = { page: '', confidence: 0 }
  
  for (const [path, pageInfo] of Object.entries(AVAILABLE_PAGES)) {
    const keywordMatches = pageInfo.keywords.filter(keyword => 
      queryLower.includes(keyword)
    ).length
    
    const confidence = keywordMatches / pageInfo.keywords.length
    
    if (confidence > bestMatch.confidence) {
      bestMatch = { page: path, confidence }
    }
  }
  
  return {
    suggestedPage: bestMatch.confidence > 0.3 ? bestMatch.page : null,
    confidence: bestMatch.confidence
  }
}

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

    // Check for page navigation suggestions
    const navigationSuggestion = suggestPageNavigation(queryToValidate)
    
    // Create enhanced system prompt with user context and page routing information
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

AVAILABLE PAGES AND ROUTING:
${Object.entries(AVAILABLE_PAGES).map(([path, info]) => 
  `- ${path}: ${info.name} - ${info.description} ${info.icon}`
).join('\n')}

ROUTING INSTRUCTIONS:
- If the user's query suggests they want to navigate to a specific page, include [ROUTE:/page-path] at the end of your response
- Analyze the user's intent and suggest the most relevant page
- Use the available pages listed above to route users appropriately
- Be proactive in suggesting navigation when it would be helpful

Examples of routing:
- "Show me my repositories" → [ROUTE:/repos]
- "I need to check settings" → [ROUTE:/settings]
- "Help me with assignments" → [ROUTE:/assignments]
- "Take me to the dashboard" → [ROUTE:/dashboard]

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
        let fullStreamedResponse = ''
        
        const stream = new ReadableStream({
          async start(controller) {
            try {
              for await (const chunk of result.textStream) {
                fullStreamedResponse += chunk
                const data = encoder.encode(`data: ${JSON.stringify({ content: chunk })}\n\n`)
                controller.enqueue(data)
              }
              
              // Parse final response for routing
              const { content, routeTo } = parseDelimitedResponse(fullStreamedResponse)
              
              // Send completion signal with routing info
              const endData = encoder.encode(`data: ${JSON.stringify({ 
                done: true, 
                routing: {
                  suggested: routeTo || navigationSuggestion.suggestedPage,
                  confidence: routeTo ? 1.0 : navigationSuggestion.confidence
                }
              })}\n\n`)
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
        let fullStreamedResponse = ''
        
        const stream = new ReadableStream({
          async start(controller) {
            try {
              for await (const chunk of result.textStream) {
                fullStreamedResponse += chunk
                const data = encoder.encode(`data: ${JSON.stringify({ content: chunk })}\n\n`)
                controller.enqueue(data)
              }
              
              // Parse final response for routing
              const { content, routeTo } = parseDelimitedResponse(fullStreamedResponse)
              
              // Send completion signal with routing info
              const endData = encoder.encode(`data: ${JSON.stringify({ 
                done: true, 
                routing: {
                  suggested: routeTo || navigationSuggestion.suggestedPage,
                  confidence: routeTo ? 1.0 : navigationSuggestion.confidence
                }
              })}\n\n`)
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

      // Parse delimited response for routing information
      const { content, routeTo } = parseDelimitedResponse(result.text)
      
      return NextResponse.json({
        success: true,
        response: content,
        toolCalls: result.toolCalls || [],
        routing: {
          suggested: routeTo || navigationSuggestion.suggestedPage,
          confidence: routeTo ? 1.0 : navigationSuggestion.confidence
        }
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
