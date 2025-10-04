import { NextRequest, NextResponse } from 'next/server'
import { AIClient, AIMessage } from '@/lib/ai-client'

export async function POST(request: NextRequest) {
  try {
    const { 
      message, 
      messages = [], 
      systemPrompt,
      config = {},
      stream = false 
    } = await request.json()

    if (!process.env.OPENAI_API_KEY) {
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

    const aiClient = new AIClient()

    if (stream) {
      // Handle streaming response
      if (message) {
        // Single message with optional history
        const history: AIMessage[] = messages || []
        const result = await aiClient.streamConversation(
          message,
          history,
          systemPrompt,
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
          systemPrompt,
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
