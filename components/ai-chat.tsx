'use client'

import React, { useState, useRef, useEffect } from 'react'
import { AIMessage } from '@/lib/ai-client'

interface AIChatProps {
  systemPrompt?: string
  className?: string
  placeholder?: string
  onMessage?: (message: AIMessage) => void
  onResponse?: (response: string) => void
  streaming?: boolean
}

export function AIChat({ 
  systemPrompt, 
  className = '', 
  placeholder = 'Ask me anything...',
  onMessage,
  onResponse,
  streaming = true
}: AIChatProps) {
  const [messages, setMessages] = useState<AIMessage[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [currentResponse, setCurrentResponse] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages, currentResponse])

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return

    const userMessage: AIMessage = {
      role: 'user',
      content: input.trim()
    }

    // Add user message
    const newMessages = [...messages, userMessage]
    setMessages(newMessages)
    setInput('')
    setIsLoading(true)
    setCurrentResponse('')

    // Call onMessage callback
    onMessage?.(userMessage)

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
          })
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
          })
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
      console.error('Error sending message:', error)
      const errorMessage: AIMessage = {
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.'
      }
      setMessages([...newMessages, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  return (
    <div className={`flex flex-col h-full ${className}`}>
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message, index) => (
          <div
            key={index}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] rounded-lg px-4 py-2 ${
                message.role === 'user'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-200 text-gray-800'
              }`}
            >
              <p className="whitespace-pre-wrap">{message.content}</p>
            </div>
          </div>
        ))}
        
        {/* Current streaming response */}
        {isLoading && currentResponse && (
          <div className="flex justify-start">
            <div className="max-w-[80%] rounded-lg px-4 py-2 bg-gray-200 text-gray-800">
              <p className="whitespace-pre-wrap">{currentResponse}</p>
              <span className="animate-pulse">▋</span>
            </div>
          </div>
        )}
        
        {/* Loading indicator */}
        {isLoading && !currentResponse && (
          <div className="flex justify-start">
            <div className="max-w-[80%] rounded-lg px-4 py-2 bg-gray-200 text-gray-800">
              <div className="flex space-x-1">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t p-4">
        <div className="flex space-x-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={placeholder}
            disabled={isLoading}
            className="flex-1 resize-none rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none disabled:opacity-50"
            rows={1}
          />
          <button
            onClick={sendMessage}
            disabled={!input.trim() || isLoading}
            className="rounded-lg bg-blue-500 px-4 py-2 text-white hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  )
}
