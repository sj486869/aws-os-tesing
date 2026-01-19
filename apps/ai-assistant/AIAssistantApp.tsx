'use client'

import { useEffect, useRef, useState } from 'react'
import { Send, Loader2 } from 'lucide-react'
import { useAuth } from '@/lib/auth/AuthContext'
import * as db from '@/lib/services/database'
import type { AppComponentProps } from '@/core/os/appRegistry'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: string
}

export function AIAssistantApp({}: AppComponentProps) {
  const { user } = useAuth()
  const [conversation, setConversation] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content:
        "Hi! I'm the webOS AI Assistant. I can help you manage notes, files, and answer questions. How can I help you today?",
      timestamp: new Date().toISOString(),
    },
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [conversationId, setConversationId] = useState<string | null>(null)
  const bottomRef = useRef<HTMLDivElement | null>(null)

  // Initialize or load conversation
  useEffect(() => {
    if (!user) return

    const initConversation = async () => {
      try {
        // Create a new conversation
        const newConv = await db.createAIConversation({
          user_id: user.id,
          title: `Conversation - ${new Date().toLocaleString()}`,
          messages: [
            {
              id: '1',
              role: 'assistant',
              content:
                "Hi! I'm the webOS AI Assistant. I can help you manage notes, files, and answer questions. How can I help you today?",
              timestamp: new Date().toISOString(),
            },
          ],
        })
        setConversationId(newConv.id)
      } catch (error) {
        console.error('[AI Assistant] Failed to create conversation:', error)
      }
    }

    initConversation()
  }, [user])

  // Auto-scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: 'end' })
  }, [conversation])

  const sendMessage = async () => {
    if (!input.trim() || !user || !conversationId) return

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date().toISOString(),
    }

    setConversation((prev) => [...prev, userMessage])
    setInput('')
    setLoading(true)

    try {
      // Get AI response
      const response = await fetch('/api/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: input }),
      })

      const data = await response.json()

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.reply || 'Sorry, I could not process your request.',
        timestamp: new Date().toISOString(),
      }

      setConversation((prev) => [...prev, assistantMessage])

      // Update conversation in database
      const updatedMessages = [...conversation, userMessage, assistantMessage]
      await db.updateAIConversation(conversationId, user.id, {
        messages: updatedMessages.map((m) => ({
          id: m.id,
          role: m.role,
          content: m.content,
          timestamp: m.timestamp,
        })),
        updated_at: new Date().toISOString(),
      })
    } catch (error) {
      console.error('[AI Assistant] Error:', error)
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Sorry, an error occurred while processing your request.',
        timestamp: new Date().toISOString(),
      }
      setConversation((prev) => [...prev, errorMessage])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col h-full bg-gradient-to-b from-slate-800 to-slate-900">
      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {conversation.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-xs px-4 py-2 rounded-lg ${
                msg.role === 'user'
                  ? 'bg-blue-600 text-white rounded-br-none'
                  : 'bg-slate-700 text-slate-100 rounded-bl-none'
              }`}
            >
              <p className="text-sm leading-relaxed">{msg.content}</p>
              <p className="text-xs opacity-60 mt-1">
                {new Date(msg.timestamp).toLocaleTimeString()}
              </p>
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="bg-slate-700 text-slate-100 px-4 py-2 rounded-lg rounded-bl-none">
              <div className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm">Thinking...</span>
              </div>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input Area */}
      <div className="border-t border-slate-700 p-4 bg-slate-800/50">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                sendMessage()
              }
            }}
            placeholder="Ask me anything..."
            className="flex-1 px-4 py-2 bg-slate-700/50 text-slate-100 placeholder-slate-400 rounded-lg border border-slate-600/50 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            disabled={loading}
          />
          <button
            onClick={sendMessage}
            disabled={loading || !input.trim()}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-600/50 text-white rounded-lg transition-colors flex items-center gap-2"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
