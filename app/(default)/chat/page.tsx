'use client'

import { useState, useRef, useEffect } from 'react'
import { useAIChat } from '@/hooks/use-ai-chat'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import UserAI from '@/public/images/user-40-01.jpg'

export default function ChatPage() {
  const [input, setInput] = useState('')
  const [suggestedRoute, setSuggestedRoute] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const router = useRouter()
  
  const {
    messages,
    isLoading,
    currentResponse,
    sendMessage,
    clearMessages
  } = useAIChat({
    systemPrompt: `You are a specialized GitHub repository management AI assistant for this platform. You can ONLY help with GitHub-related topics:

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

If asked about non-GitHub topics, politely redirect: "I'm a specialized GitHub repository management assistant. I can only help with GitHub-related topics and this platform's features. Please ask me about repository management, issue triage, or other GitHub-related tasks."`,
    streaming: true,
    onRouting: (routing) => {
      if (routing.suggested && routing.confidence > 0.5) {
        setSuggestedRoute(routing.suggested)
      }
    }
  })

  const handleNavigateToSuggested = () => {
    if (suggestedRoute) {
      router.push(suggestedRoute)
      setSuggestedRoute(null)
    }
  }

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages, currentResponse])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || isLoading) return
    
    await sendMessage(input.trim())
    setInput('')
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e)
    }
  }

  return (
    <div className="grow flex flex-col h-full">
      {/* Chat Header */}
      <div className="sticky top-16">
        <div className="flex items-center justify-between before:absolute before:inset-0 before:backdrop-blur-md before:bg-gray-50/90 dark:before:bg-[#151D2C]/90 before:-z-10 border-b border-gray-200 dark:border-gray-700/60 px-4 sm:px-6 md:px-5 h-16">
          {/* AI Assistant Info */}
          <div className="flex items-center">
            <div className="flex items-center">
              <div className="relative">
                <Image className="rounded-full border-2 border-white dark:border-gray-800 box-content" src={UserAI} width={32} height={32} alt="AI Assistant" />
                <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 border-2 border-white dark:border-gray-800 rounded-full"></div>
              </div>
              <div className="ml-3">
                <div className="text-sm font-medium text-gray-800 dark:text-gray-100">AI Assistant</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">Online</div>
              </div>
            </div>
          </div>
          
          {/* Header Actions */}
          <div className="flex items-center space-x-2">
            <button 
              onClick={clearMessages}
              className="p-1.5 shrink-0 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700/60 hover:border-gray-300 dark:hover:border-gray-600 shadow-sm"
              title="Clear conversation"
            >
              <svg className="fill-current text-gray-400 dark:text-gray-500" width="16" height="16" viewBox="0 0 16 16">
                <path d="M8 0C3.6 0 0 3.6 0 8s3.6 8 8 8 8-3.6 8-8-3.6-8-8-8zm0 12c-.6 0-1-.4-1-1s.4-1 1-1 1 .4 1 1-.4 1-1 1zm1-3H7V4h2v5z" />
              </svg>
            </button>
            <button className="p-1.5 shrink-0 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700/60 hover:border-gray-300 dark:hover:border-gray-600 shadow-sm">
              <svg className="fill-current text-violet-500" width="16" height="16" viewBox="0 0 16 16">
                <path d="M14.3 2.3L5 11.6 1.7 8.3c-.4-.4-1-.4-1.4 0-.4.4-.4 1 0 1.4l4 4c.2.2.4.3.7.3.3 0 .5-.1.7-.3l10-10c.4-.4.4-1 0-1.4-.4-.4-1-.4-1.4 0z" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Chat Messages */}
      <div className="grow px-4 sm:px-6 md:px-5 py-6 overflow-y-auto">
        {messages.length === 0 && !isLoading && (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-violet-100 dark:bg-violet-900/20 rounded-full mb-4">
                <svg className="w-8 h-8 fill-current text-violet-600 dark:text-violet-400" viewBox="0 0 16 16">
                  <path d="M8 0C3.6 0 0 3.6 0 8s3.6 8 8 8 8-3.6 8-8-3.6-8-8-8zm0 12c-.6 0-1-.4-1-1s.4-1 1-1 1 .4 1 1-.4 1-1 1zm1-3H7V4h2v5z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-800 dark:text-gray-100 mb-2">Welcome to AI Chat</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Start a conversation with the AI assistant</p>
            </div>
          </div>
        )}

        {messages.map((message, index) => (
          <div key={index} className="flex items-start mb-4 last:mb-0">
            {message.role === 'user' ? (
              <div className="flex items-start ml-auto max-w-[80%]">
                <div className="flex flex-col items-end">
                  <div className="text-sm bg-violet-500 text-white p-3 rounded-lg rounded-tr-none mb-1">
                    {message.content}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">You</div>
                </div>
                <Image className="rounded-full ml-3 mt-1" src={UserAI} width={32} height={32} alt="You" />
              </div>
            ) : (
              <div className="flex items-start max-w-[80%]">
                <Image className="rounded-full mr-3" src={UserAI} width={32} height={32} alt="AI Assistant" />
                <div>
                  <div className="text-sm bg-gray-200 dark:bg-gray-800 text-gray-800 dark:text-gray-100 p-3 rounded-lg rounded-tl-none mb-1">
                    {message.content}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">AI Assistant</div>
                </div>
              </div>
            )}
          </div>
        ))}

        {/* Current streaming response */}
        {isLoading && currentResponse && (
          <div className="flex items-start mb-4 last:mb-0">
            <Image className="rounded-full mr-3" src={UserAI} width={32} height={32} alt="AI Assistant" />
            <div>
              <div className="text-sm bg-gray-200 dark:bg-gray-800 text-gray-800 dark:text-gray-100 p-3 rounded-lg rounded-tl-none mb-1">
                {currentResponse}
                <span className="animate-pulse">▋</span>
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">AI Assistant</div>
            </div>
          </div>
        )}

        {/* Loading indicator */}
        {isLoading && !currentResponse && (
          <div className="flex items-start mb-4 last:mb-0">
            <Image className="rounded-full mr-3" src={UserAI} width={32} height={32} alt="AI Assistant" />
            <div>
              <div className="text-sm bg-gray-200 dark:bg-gray-800 text-gray-800 dark:text-gray-100 p-3 rounded-lg rounded-tl-none mb-1">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                </div>
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">AI Assistant</div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Navigation Suggestion */}
      {suggestedRoute && (
        <div className="px-4 sm:px-6 md:px-5 py-3 border-t border-gray-200 dark:border-gray-700/60 bg-blue-50 dark:bg-blue-900/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-sm text-blue-800 dark:text-blue-200">
                I can help you navigate to: {suggestedRoute}
              </span>
            </div>
            <button
              onClick={handleNavigateToSuggested}
              className="px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm"
            >
              Go
            </button>
          </div>
        </div>
      )}

      {/* Chat Input */}
      <div className="sticky bottom-0">
        <div className="flex items-center justify-between bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700/60 px-4 sm:px-6 md:px-5 h-16">
          {/* Plus button */}
          <button 
            className="shrink-0 text-gray-400 dark:text-gray-500 hover:text-gray-500 dark:hover:text-gray-400 mr-3"
            title="Add attachment"
          >
            <span className="sr-only">Add</span>
            <svg className="w-6 h-6 fill-current" viewBox="0 0 24 24">
              <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12C23.98 5.38 18.62.02 12 0zm6 13h-5v5h-2v-5H6v-2h5V6h2v5h5v2z" />
            </svg>
          </button>
          
          {/* Message input */}
          <form onSubmit={handleSubmit} className="grow flex">
            <div className="grow mr-3">
              <label htmlFor="message-input" className="sr-only">
                Type a message
              </label>
              <textarea
                id="message-input"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                className="form-input w-full bg-gray-100 dark:bg-gray-800 border-transparent dark:border-transparent focus:bg-white dark:focus:bg-gray-800 placeholder-gray-500 resize-none"
                placeholder="Type your message..."
                rows={1}
                disabled={isLoading}
              />
            </div>
            <button 
              type="submit" 
              disabled={!input.trim() || isLoading}
              className="btn bg-violet-500 text-white hover:bg-violet-600 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
            >
              Send →
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
