declare module 'ai' {
  export interface StreamTextParams<M = any> {
    model: any
    messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>
    temperature?: number
    maxTokens?: number
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
  
  export interface StreamTextResult {
    textStream: AsyncIterable<string>
    toolCalls?: AsyncIterable<any>
  }
  
  export interface GenerateTextParams<M = any> {
    model: any
    messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>
    temperature?: number
    maxTokens?: number
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
  
  export interface GenerateTextResult {
    text: string
    toolCalls?: any[]
  }
  
  export function streamText<M = any>(params: StreamTextParams<M>): Promise<StreamTextResult>
  export function generateText<M = any>(params: GenerateTextParams<M>): Promise<GenerateTextResult>
}

declare module '@ai-sdk/openai' {
  export function createOpenAI(config: { apiKey: string }): (model: string) => any
}
