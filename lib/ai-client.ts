import { streamText, generateText } from 'ai'
import { createOpenAI } from '@ai-sdk/openai'

export interface AIMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface AIStreamConfig {
  model?: string
  temperature?: number
  maxTokens?: number
  systemPrompt?: string
  tools?: Array<{
    type: 'function'
    function: {
      name: string
      description: string
      parameters: Record<string, any>
    }
  }>
  toolChoice?: 'auto' | 'none' | { type: 'function'; function: { name: string } }
}

export interface AIStreamResponse {
  textStream: AsyncIterable<string>
  toolCalls?: AsyncIterable<any>
}

export interface AIGenerateResponse {
  text: string
  toolCalls?: any[]
}

export class AIClient {
  private openai: any

  constructor(apiKey?: string) {
    const key = apiKey || process.env.OPEN_AI_KEY
    if (!key) {
      throw new Error('OpenAI API key is required. Set OPEN_AI_KEY environment variable or pass it to constructor.')
    }
    this.openai = createOpenAI({ apiKey: key })
  }

  /**
   * Stream text generation with optional tool calls
   */
  async streamText(
    messages: AIMessage[],
    config: AIStreamConfig = {}
  ): Promise<AIStreamResponse> {
    const {
      model = process.env.OPENAI_MODEL || 'gpt-4o-mini',
      temperature = 0.7,
      maxTokens = 1024,
      systemPrompt,
      tools = [], // Empty tools array by default
      toolChoice = 'auto'
    } = config

    // Add system prompt if provided
    const finalMessages = systemPrompt 
      ? [{ role: 'system' as const, content: systemPrompt }, ...messages]
      : messages

    const result = await streamText({
      model: this.openai(model),
      messages: finalMessages,
      temperature,
      maxTokens,
      tools,
      toolChoice
    })

    return {
      textStream: result.textStream,
      toolCalls: result.toolCalls
    }
  }

  /**
   * Generate text without streaming with optional tool calls
   */
  async generateText(
    messages: AIMessage[],
    config: AIStreamConfig = {}
  ): Promise<AIGenerateResponse> {
    const {
      model = process.env.OPENAI_MODEL || 'gpt-4o-mini',
      temperature = 0.7,
      maxTokens = 1024,
      systemPrompt,
      tools = [], // Empty tools array by default
      toolChoice = 'auto'
    } = config

    // Add system prompt if provided
    const finalMessages = systemPrompt 
      ? [{ role: 'system' as const, content: systemPrompt }, ...messages]
      : messages

    const result = await generateText({
      model: this.openai(model),
      messages: finalMessages,
      temperature,
      maxTokens,
      tools,
      toolChoice
    })

    return {
      text: result.text,
      toolCalls: result.toolCalls
    }
  }

  /**
   * Simple chat function for basic conversations
   */
  async chat(
    message: string,
    systemPrompt?: string,
    config: Omit<AIStreamConfig, 'systemPrompt'> = {}
  ): Promise<AIGenerateResponse> {
    const messages: AIMessage[] = [
      { role: 'user', content: message }
    ]

    return this.generateText(messages, {
      ...config,
      systemPrompt
    })
  }

  /**
   * Stream chat for real-time responses
   */
  async streamChat(
    message: string,
    systemPrompt?: string,
    config: Omit<AIStreamConfig, 'systemPrompt'> = {}
  ): Promise<AIStreamResponse> {
    const messages: AIMessage[] = [
      { role: 'user', content: message }
    ]

    return this.streamText(messages, {
      ...config,
      systemPrompt
    })
  }

  /**
   * Multi-turn conversation with history
   */
  async conversation(
    message: string,
    history: AIMessage[] = [],
    systemPrompt?: string,
    config: Omit<AIStreamConfig, 'systemPrompt'> = {}
  ): Promise<AIGenerateResponse> {
    const messages: AIMessage[] = [
      ...history,
      { role: 'user', content: message }
    ]

    return this.generateText(messages, {
      ...config,
      systemPrompt
    })
  }

  /**
   * Stream multi-turn conversation with history
   */
  async streamConversation(
    message: string,
    history: AIMessage[] = [],
    systemPrompt?: string,
    config: Omit<AIStreamConfig, 'systemPrompt'> = {}
  ): Promise<AIStreamResponse> {
    const messages: AIMessage[] = [
      ...history,
      { role: 'user', content: message }
    ]

    return this.streamText(messages, {
      ...config,
      systemPrompt
    })
  }
}

// Export a default instance
export const aiClient = new AIClient()

// Export utility functions for direct use
export async function streamAIResponse(
  messages: AIMessage[],
  config: AIStreamConfig = {}
): Promise<AIStreamResponse> {
  return aiClient.streamText(messages, config)
}

export async function generateAIResponse(
  messages: AIMessage[],
  config: AIStreamConfig = {}
): Promise<AIGenerateResponse> {
  return aiClient.generateText(messages, config)
}

export async function simpleChat(
  message: string,
  systemPrompt?: string,
  config: Omit<AIStreamConfig, 'systemPrompt'> = {}
): Promise<AIGenerateResponse> {
  return aiClient.chat(message, systemPrompt, config)
}

export async function streamSimpleChat(
  message: string,
  systemPrompt?: string,
  config: Omit<AIStreamConfig, 'systemPrompt'> = {}
): Promise<AIStreamResponse> {
  return aiClient.streamChat(message, systemPrompt, config)
}
