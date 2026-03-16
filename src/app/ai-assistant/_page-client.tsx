'use client';

import { useState } from 'react';
import { ConversationSidebar } from '@/components/ai-chat/ConversationSidebar';
import { ChatInterface } from '@/components/ai-chat/ChatInterface';

export default function AIAssistantPage() {
  const [activeConversationId, setActiveConversationId] = useState<string | undefined>(undefined);
  const [key, setKey] = useState(0); // Force re-render of ChatInterface

  const handleSelectConversation = (conversationId: string) => {
    setActiveConversationId(conversationId);
    setKey((prev) => prev + 1);
  };

  const handleNewConversation = () => {
    setActiveConversationId(undefined);
    setKey((prev) => prev + 1);
  };

  const handleConversationStart = (conversationId: string) => {
    setActiveConversationId(conversationId);
  };

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Page Header */}
      <div className="bg-card border-b">
        <div className="px-6 py-4">
          <h1 className="text-2xl font-bold text-foreground">AI Assistant</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Your intelligent operations assistant powered by AI
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <div className="w-80 flex-shrink-0 border-r bg-card">
          <ConversationSidebar
            onSelectConversation={handleSelectConversation}
            onNewConversation={handleNewConversation}
            activeConversationId={activeConversationId}
          />
        </div>

        {/* Chat Area */}
        <div className="flex-1 p-6 bg-background">
          <ChatInterface
            key={key}
            conversationId={activeConversationId}
            onConversationStart={handleConversationStart}
          />
        </div>
      </div>
    </div>
  );
}
