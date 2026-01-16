'use client';

import { useState, useEffect } from 'react';
import { MessageSquare, Plus, Clock, Loader2 } from 'lucide-react';

type Conversation = {
  conversationId: string;
  messages: any[];
  lastMessageAt: string;
  contextType?: string;
};

interface ConversationSidebarProps {
  onSelectConversation: (conversationId: string) => void;
  onNewConversation: () => void;
  activeConversationId?: string;
}

export function ConversationSidebar({
  onSelectConversation,
  onNewConversation,
  activeConversationId,
}: ConversationSidebarProps) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadConversations();
  }, []);

  const loadConversations = async () => {
    try {
      const response = await fetch('/api/ai-assistant');
      if (!response.ok) throw new Error('Failed to load conversations');
      
      const data = await response.json();
      setConversations(data.conversations || []);
    } catch (err) {
      console.error('Error loading conversations:', err);
    } finally {
      setLoading(false);
    }
  };

  const getConversationTitle = (conversation: Conversation) => {
    const firstUserMessage = conversation.messages.find((m) => m.role === 'user');
    if (firstUserMessage?.message) {
      return firstUserMessage.message.substring(0, 50) + (firstUserMessage.message.length > 50 ? '...' : '');
    }
    return 'New Conversation';
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const getContextBadgeColor = (contextType?: string) => {
    switch (contextType) {
      case 'projects':
        return 'bg-blue-100 text-blue-700';
      case 'tasks':
        return 'bg-green-100 text-green-700';
      case 'kpis':
        return 'bg-purple-100 text-purple-700';
      case 'initiatives':
        return 'bg-orange-100 text-orange-700';
      case 'departments':
        return 'bg-pink-100 text-pink-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div className="flex flex-col h-full bg-card">
      {/* Header */}
      <div className="p-4 border-b">
        <button
          onClick={onNewConversation}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-medium"
        >
          <Plus className="w-5 h-5" />
          New Conversation
        </button>
      </div>

      {/* Conversations List */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center p-8">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : conversations.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            <MessageSquare className="w-12 h-12 mx-auto mb-3 text-muted-foreground/50" />
            <p className="text-sm">No conversations yet</p>
            <p className="text-xs mt-1">Start a new conversation to get started</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {conversations.map((conversation) => (
              <button
                key={conversation.conversationId}
                onClick={() => onSelectConversation(conversation.conversationId)}
                className={`w-full p-4 text-left hover:bg-muted/50 transition-colors ${
                  activeConversationId === conversation.conversationId ? 'bg-primary/10 border-l-4 border-primary' : ''
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center">
                    <MessageSquare className="w-5 h-5 text-primary-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">
                      {getConversationTitle(conversation)}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      {conversation.contextType && (
                        <span className={`text-xs px-2 py-0.5 rounded-full ${getContextBadgeColor(conversation.contextType)}`}>
                          {conversation.contextType}
                        </span>
                      )}
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatDate(conversation.lastMessageAt)}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {conversation.messages.length} messages
                    </p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-4 border-t bg-muted/30">
        <p className="text-xs text-muted-foreground text-center">
          Powered by OpenAI GPT-4
        </p>
      </div>
    </div>
  );
}
