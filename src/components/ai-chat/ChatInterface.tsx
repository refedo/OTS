'use client';

import { useState, useRef, useEffect } from 'react';
import { Send, Loader2, Bot, User } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

type Message = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
};

type ContextType = 'projects' | 'tasks' | 'kpis' | 'initiatives' | 'departments';

interface ChatInterfaceProps {
  conversationId?: string;
  onConversationStart?: (conversationId: string) => void;
}

export function ChatInterface({ conversationId, onConversationStart }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [contextType, setContextType] = useState<ContextType>('projects');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [currentConversationId, setCurrentConversationId] = useState<string | undefined>(conversationId);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Load conversation history if conversationId is provided
  useEffect(() => {
    if (conversationId) {
      loadConversation(conversationId);
    }
  }, [conversationId]);

  const loadConversation = async (convId: string) => {
    try {
      const response = await fetch(`/api/ai-assistant?conversationId=${convId}`);
      if (!response.ok) throw new Error('Failed to load conversation');
      
      const data = await response.json();
      const loadedMessages: Message[] = data.interactions.map((interaction: any) => ({
        id: interaction.id,
        role: interaction.role,
        content: interaction.role === 'user' ? interaction.message : interaction.response,
        timestamp: new Date(interaction.createdAt),
      }));
      
      setMessages(loadedMessages);
    } catch (err) {
      console.error('Error loading conversation:', err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content: input,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/ai-assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: input,
          contextType,
          conversationId: currentConversationId,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        const errorMessage = errorData.message 
          ? `${errorData.error}: ${errorData.message}` 
          : errorData.error || 'Failed to get response';
        throw new Error(errorMessage);
      }

      const data = await response.json();

      // Update conversation ID if this is a new conversation
      if (!currentConversationId && data.conversationId) {
        setCurrentConversationId(data.conversationId);
        onConversationStart?.(data.conversationId);
      }

      const assistantMessage: Message = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: data.assistantMessage,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      console.error('Error sending message:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-card rounded-lg border shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b bg-gradient-to-r from-primary to-primary/90">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-card rounded-lg">
            <Bot className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-primary-foreground">Operation Focal Point</h2>
            <p className="text-sm text-primary-foreground/80">Your AI Operations Assistant - Ask me anything!</p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
            <Bot className="w-16 h-16 mb-4 text-muted-foreground/50" />
            <h3 className="text-lg font-medium text-foreground mb-2">Welcome to Operation Focal Point</h3>
            <p className="text-sm max-w-md">
              Ask me anything about your operations, projects, KPIs, tasks, or initiatives.
              I have access to real-time data from your OTS system.
            </p>
            <div className="mt-6 grid grid-cols-2 gap-3 max-w-2xl">
              <div className="p-3 bg-primary/10 rounded-lg text-left border">
                <p className="text-xs font-medium text-foreground">Example:</p>
                <p className="text-sm text-muted-foreground">"How are we performing vs our KPIs this month?"</p>
              </div>
              <div className="p-3 bg-primary/10 rounded-lg text-left border">
                <p className="text-xs font-medium text-foreground">Example:</p>
                <p className="text-sm text-muted-foreground">"Which projects are delayed and why?"</p>
              </div>
              <div className="p-3 bg-primary/10 rounded-lg text-left border">
                <p className="text-xs font-medium text-foreground">Example:</p>
                <p className="text-sm text-muted-foreground">"Show me open NCRs impacting quality"</p>
              </div>
              <div className="p-3 bg-primary/10 rounded-lg text-left border">
                <p className="text-xs font-medium text-foreground">Example:</p>
                <p className="text-sm text-muted-foreground">"Create an action plan to improve OTIF"</p>
              </div>
            </div>
          </div>
        )}

        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            {message.role === 'assistant' && (
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                <Bot className="w-5 h-5 text-primary" />
              </div>
            )}
            
            <div
              className={`max-w-3xl rounded-lg px-4 py-3 ${
                message.role === 'user'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-foreground'
              }`}
            >
              {message.role === 'assistant' ? (
                <div className="prose prose-sm max-w-none dark:prose-invert">
                  <ReactMarkdown>{message.content}</ReactMarkdown>
                </div>
              ) : (
                <p className="text-sm whitespace-pre-wrap">{message.content}</p>
              )}
              <p className={`text-xs mt-2 ${message.role === 'user' ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
                {message.timestamp.toLocaleTimeString()}
              </p>
            </div>

            {message.role === 'user' && (
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                <User className="w-5 h-5 text-primary-foreground" />
              </div>
            )}
          </div>
        ))}

        {loading && (
          <div className="flex gap-3 justify-start">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
              <Bot className="w-5 h-5 text-primary" />
            </div>
            <div className="bg-muted rounded-lg px-4 py-3">
              <div className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-primary" />
                <span className="text-sm text-muted-foreground">Thinking...</span>
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="p-4 border-t bg-muted/30">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask me anything about your operations..."
            className="flex-1 px-4 py-3 border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            disabled={loading}
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Send className="w-5 h-5" />
            )}
            <span className="font-medium">Send</span>
          </button>
        </div>
      </form>
    </div>
  );
}
