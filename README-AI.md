# AI Integration for Mosaic Lib

This document describes the AI integration implemented in the `mosaic-lib` folder, replicating the OpenAI SDK flow from `mosaic-next`.

## Overview

The AI integration provides:
- OpenAI SDK integration using `@ai-sdk/openai` and `ai` packages
- Streaming text generation
- Tool call support (currently with empty tools array)
- React components and hooks for easy integration
- API routes for server-side AI processing

## Files Structure

```
mosaic-lib/
├── lib/
│   ├── ai-client.ts          # Main AI client class and utilities
│   └── ai-context-manager.ts # Context management (simplified)
├── app/
│   ├── api/
│   │   └── ai-chat/
│   │       └── route.ts      # AI chat API endpoint
│   └── (default)/
│       └── ai-demo/
│           └── page.tsx      # Demo page for testing
├── components/
│   └── ai-chat.tsx           # React chat component
├── hooks/
│   └── use-ai-chat.ts        # React hook for AI chat
├── types/
│   └── vercel-ai.d.ts        # TypeScript definitions
└── package.json              # Updated with AI dependencies
```

## Key Components

### 1. AIClient (`lib/ai-client.ts`)

Main class for interacting with OpenAI:

```typescript
import { AIClient } from '@/lib/ai-client'

const aiClient = new AIClient()

// Stream text generation
const result = await aiClient.streamText(messages, {
  systemPrompt: "You are a helpful assistant",
  tools: [], // Empty array as requested
  toolChoice: 'auto'
})

// Generate text without streaming
const result = await aiClient.generateText(messages, config)

// Simple chat
const response = await aiClient.chat("Hello!", "You are helpful")
```

### 2. API Route (`app/api/ai-chat/route.ts`)

Handles both streaming and non-streaming requests:

```typescript
// Streaming request
const response = await fetch('/api/ai-chat', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    message: "Hello!",
    systemPrompt: "You are helpful",
    stream: true
  })
})

// Non-streaming request
const response = await fetch('/api/ai-chat', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    message: "Hello!",
    systemPrompt: "You are helpful",
    stream: false
  })
})
```

### 3. React Component (`components/ai-chat.tsx`)

Ready-to-use chat component:

```tsx
import { AIChat } from '@/components/ai-chat'

<AIChat
  systemPrompt="You are a helpful assistant"
  streaming={true}
  onMessage={(message) => console.log(message)}
  onResponse={(response) => console.log(response)}
/>
```

### 4. React Hook (`hooks/use-ai-chat.ts`)

Custom hook for AI chat functionality:

```tsx
import { useAIChat } from '@/hooks/use-ai-chat'

const { messages, isLoading, sendMessage, clearMessages } = useAIChat({
  systemPrompt: "You are helpful",
  streaming: true,
  onMessage: (message) => console.log(message),
  onResponse: (response) => console.log(response)
})
```

## Environment Variables

Add to your `.env.local`:

```env
OPEN_AI_KEY=your_openai_api_key_here
OPENAI_MODEL=gpt-4o-mini  # Optional, defaults to gpt-4o-mini
```

## Tool Call Support

The system is designed to support tool calls with an empty tools array by default. To add tools later:

```typescript
const tools = [
  {
    type: 'function' as const,
    function: {
      name: 'get_weather',
      description: 'Get the current weather',
      parameters: {
        type: 'object',
        properties: {
          location: {
            type: 'string',
            description: 'The city and state'
          }
        },
        required: ['location']
      }
    }
  }
]

const result = await aiClient.streamText(messages, { tools })
```

## Usage Examples

### Basic Chat

```tsx
import { AIChat } from '@/components/ai-chat'

export default function ChatPage() {
  return (
    <div className="h-screen">
      <AIChat
        systemPrompt="You are a helpful coding assistant"
        streaming={true}
      />
    </div>
  )
}
```

### Custom Implementation

```tsx
import { useAIChat } from '@/hooks/use-ai-chat'

export default function CustomChat() {
  const { messages, isLoading, sendMessage } = useAIChat({
    systemPrompt: "You are a helpful assistant",
    streaming: true
  })

  return (
    <div>
      {messages.map((message, index) => (
        <div key={index}>
          <strong>{message.role}:</strong> {message.content}
        </div>
      ))}
      <button 
        onClick={() => sendMessage("Hello!")}
        disabled={isLoading}
      >
        Send Message
      </button>
    </div>
  )
}
```

### Direct API Usage

```typescript
import { aiClient } from '@/lib/ai-client'

const response = await aiClient.chat(
  "What's the weather like?",
  "You are a weather assistant"
)

console.log(response.text)
```

## Testing

Visit `/ai-demo` to test the integration with a working chat interface.

## Differences from mosaic-next

1. **Simplified Context Management**: The context manager is simplified and doesn't include database integration
2. **Empty Tools Array**: Tools array is empty by default as requested
3. **Standalone Components**: Components are designed to work independently
4. **Type Safety**: Full TypeScript support with proper type definitions

## Next Steps

1. Add custom tools to the tools array
2. Implement database integration for context management
3. Add user authentication
4. Implement message persistence
5. Add advanced streaming features

## Dependencies

- `@ai-sdk/openai`: ^2.0.42
- `ai`: ^5.0.59
- `next`: 15.1.6
- `react`: 19.0.0
- `typescript`: ^5.7.3
