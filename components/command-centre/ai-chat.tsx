'use client'

import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Send, Bot, User, ChevronDown, ChevronUp, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

export default function AiChat({ dealershipName, location }: { dealershipName: string, location: string }) {
  const [isOpen, setIsOpen] = useState(true)
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState<Message[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const STARTER_PROMPTS = [
    "What should I buy this week?",
    "Which stock is at risk of sitting?",
    "How is my portfolio performing?",
    "What's happening with BMW demand locally?"
  ]

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSubmit = async (e?: React.FormEvent, promptOverride?: string) => {
    if (e) e.preventDefault()
    
    const messageContent = promptOverride || input
    if (!messageContent.trim() || isLoading) return

    const newMessages = [...messages, { role: 'user' as const, content: messageContent }]
    setMessages(newMessages)
    setInput('')
    setIsLoading(true)

    try {
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          messages: newMessages,
          dealershipId: 'current-dealer-id' // Handled securely by session in the route
        })
      })

      if (!response.ok) throw new Error('Network response was not ok')
      if (!response.body) throw new Error('No response body')

      // Handle streaming response
      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      
      setMessages(prev => [...prev, { role: 'assistant', content: '' }])

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        
        const chunk = decoder.decode(value, { stream: true })
        
        setMessages(prev => {
          const newM = [...prev]
          const lastIndex = newM.length - 1
          newM[lastIndex] = { 
            ...newM[lastIndex], 
            content: newM[lastIndex].content + chunk 
          }
          return newM
        })
      }
    } catch (error) {
      console.error('Chat error:', error)
      setMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, I encountered an error. Please try again.' }])
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="bg-carbon border border-steel rounded-[2px] overflow-hidden mt-6">
      
      {/* Header (Toggle) */}
      <div 
        className="flex justify-between items-center p-4 bg-asphalt cursor-pointer hover:bg-steel/50 transition-colors"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-blue/10 flex items-center justify-center text-blue">
            <Sparkles size={16} />
          </div>
          <div>
            <h2 className="font-syne font-bold text-lg text-cream">Ask the Intelligence Layer</h2>
            <p className="font-inter text-[12px] text-silver">Context-aware AI for {dealershipName}</p>
          </div>
        </div>
        {isOpen ? <ChevronUp size={20} className="text-pewter" /> : <ChevronDown size={20} className="text-pewter" />}
      </div>

      {/* Chat Area */}
      {isOpen && (
        <div className="flex flex-col h-[500px]">
          
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center">
                <div className="w-16 h-16 rounded-full bg-blue/5 border border-blue/20 flex items-center justify-center text-blue mb-4">
                  <Bot size={32} />
                </div>
                <h3 className="font-syne font-bold text-xl text-cream mb-2">How can I help you today?</h3>
                <p className="font-inter text-sm text-silver text-center max-w-md mb-8">
                  I have full access to your stock list, recent sales data, and the latest {location} market intelligence.
                </p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 w-full max-w-2xl">
                  {STARTER_PROMPTS.map((prompt, i) => (
                    <button
                      key={i}
                      onClick={() => handleSubmit(undefined, prompt)}
                      className="bg-asphalt hover:bg-steel border border-steel hover:border-blue p-3 rounded-[2px] text-left transition-colors group"
                    >
                      <p className="font-inter text-[13px] text-silver group-hover:text-cream transition-colors">"{prompt}"</p>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <>
                {messages.map((m, i) => (
                  <div key={i} className={cn("flex gap-4 max-w-[85%]", m.role === 'user' ? "ml-auto flex-row-reverse" : "mr-auto")}>
                    <div className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center bg-asphalt border border-steel">
                      {m.role === 'user' ? <User size={14} className="text-pewter" /> : <Bot size={14} className="text-blue" />}
                    </div>
                    <div className={cn(
                      "p-4 rounded-[2px] font-inter text-[14px] leading-relaxed whitespace-pre-wrap",
                      m.role === 'user' 
                        ? "bg-[rgba(14,165,233,0.1)] border border-[#0EA5E9]/20 text-cream" 
                        : "bg-[#0D0F14] border border-[#1C2029] text-silver"
                    )}>
                      {m.content}
                    </div>
                  </div>
                ))}
                {isLoading && messages[messages.length - 1]?.role === 'user' && (
                  <div className="flex gap-4 mr-auto max-w-[85%]">
                    <div className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center bg-asphalt border border-steel">
                      <Bot size={14} className="text-blue" />
                    </div>
                    <div className="p-4 rounded-[2px] bg-[#0D0F14] border border-[#1C2029] text-silver flex items-center gap-1">
                      <div className="w-1.5 h-1.5 bg-blue rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <div className="w-1.5 h-1.5 bg-blue rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <div className="w-1.5 h-1.5 bg-blue rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </>
            )}
          </div>

          {/* Input */}
          <div className="p-4 bg-void border-t border-steel shrink-0">
            <form onSubmit={handleSubmit} className="relative max-w-4xl mx-auto">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    handleSubmit()
                  }
                }}
                placeholder="Ask a question... (Enter to send, Shift+Enter for new line)"
                className="w-full bg-asphalt border border-steel rounded-[2px] py-3 pl-4 pr-12 font-inter text-[14px] text-cream placeholder:text-muted focus:outline-none focus:border-blue resize-none h-14"
                rows={1}
              />
              <button 
                type="submit"
                disabled={!input.trim() || isLoading}
                className="absolute right-2 top-2 bottom-2 aspect-square flex items-center justify-center bg-blue/10 text-blue hover:bg-blue hover:text-void rounded-[2px] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Send size={16} />
              </button>
            </form>
          </div>
          
        </div>
      )}
    </div>
  )
}
