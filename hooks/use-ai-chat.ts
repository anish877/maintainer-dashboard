'use client'

import { useState, useCallback, useRef } from 'react'
import { AIMessage } from '@/lib/ai-client'

interface UseAIChatOptions {
  systemPrompt?: string
  streaming?: boolean
  onMessage?: (message: AIMessage) => void
  onResponse?: (response: string) => void
  onError?: (error: Error) => void
}

interface UseAIChatReturn {
  messages: AIMessage[]
  isLoading: boolean
  currentResponse: string
  sendMessage: (message: string) => Promise<void>
  clearMessages: () => void
  setMessages: (messages: AIMessage[]) => void
}

export function useAIChat({
  systemPrompt,
  streaming = true,
  onMessage,
  onResponse,
  onError
}: UseAIChatOptions = {}): UseAIChatReturn {
  const [messages, setMessages] = useState<AIMessage[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [currentResponse, setCurrentResponse] = useState('')
  const abortControllerRef = useRef<AbortController | null>(null)

  const sendMessage = useCallback(async (message: string) => {
    if (!message.trim() || isLoading) return

    const userMessage: AIMessage = {
      role: 'user',
      content: message.trim()
    }

    // Add user message
    const newMessages = [...messages, userMessage]
    setMessages(newMessages)
    setIsLoading(true)
    setCurrentResponse('')

    // Call onMessage callback
    onMessage?.(userMessage)

    // Create abort controller for cancellation
    abortControllerRef.current = new AbortController()

    try {
      if (streaming) {
        // Handle streaming response
        const response = await fetch('/api/ai-chat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            message: userMessage.content,
            messages: messages,
            systemPrompt,
            stream: true
          }),
          signal: abortControllerRef.current.signal
        })

        if (!response.ok) {
          throw new Error('Failed to get response')
        }

        // Check if response is restricted
        const contentType = response.headers.get('content-type')
        if (contentType?.includes('application/json')) {
          const data = await response.json()
          if (data.restricted) {
            const assistantMessage: AIMessage = {
              role: 'assistant',
              content: data.error
            }
            setMessages([...newMessages, assistantMessage])
            setIsLoading(false)
            return
          }
        }

        const reader = response.body?.getReader()
        const decoder = new TextDecoder()
        let fullResponse = ''

        if (reader) {
          while (true) {
            const { done, value } = await reader.read()
            if (done) break

            const chunk = decoder.decode(value)
            const lines = chunk.split('\n')

            for (const line of lines) {
              if (line.startsWith('data: ')) {
                try {
                  const data = JSON.parse(line.slice(6))
                  if (data.content) {
                    fullResponse += data.content
                    setCurrentResponse(fullResponse)
                  }
                  if (data.done) {
                    break
                  }
                } catch (e) {
                  // Ignore parsing errors for malformed chunks
                }
              }
            }
          }
        }

        // Add assistant response to messages
        const assistantMessage: AIMessage = {
          role: 'assistant',
          content: fullResponse
        }

        setMessages([...newMessages, assistantMessage])
        setCurrentResponse('')
        onResponse?.(fullResponse)
      } else {
        // Handle non-streaming response
        const response = await fetch('/api/ai-chat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            message: userMessage.content,
            messages: messages,
            systemPrompt,
            stream: false
          }),
          signal: abortControllerRef.current.signal
        })

        if (!response.ok) {
          throw new Error('Failed to get response')
        }

        const data = await response.json()
        
        // Handle restricted responses
        if (data.restricted) {
          const assistantMessage: AIMessage = {
            role: 'assistant',
            content: data.error
          }
          setMessages([...newMessages, assistantMessage])
          setIsLoading(false)
          return
        }

        const assistantMessage: AIMessage = {
          role: 'assistant',
          content: data.response
        }

        setMessages([...newMessages, assistantMessage])
        onResponse?.(data.response)
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        // Request was cancelled, don't show error
        return
      }
      
      console.error('Error sending message:', error)
      const errorMessage: AIMessage = {
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.'
      }
      setMessages([...newMessages, errorMessage])
      onError?.(error instanceof Error ? error : new Error('Unknown error'))
    } finally {
      setIsLoading(false)
      abortControllerRef.current = null
    }
  }, [messages, isLoading, systemPrompt, streaming, onMessage, onResponse, onError])

  const clearMessages = useCallback(() => {
    setMessages([])
    setCurrentResponse('')
  }, [])

  const setMessagesCallback = useCallback((newMessages: AIMessage[]) => {
    setMessages(newMessages)
  }, [])

  return {
    messages,
    isLoading,
    currentResponse,
    sendMessage,
    clearMessages,
    setMessages: setMessagesCallback
  }
}
