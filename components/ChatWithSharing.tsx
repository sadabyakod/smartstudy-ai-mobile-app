import React, { useState } from 'react';
import ChatScreen from '../components/ChatScreen';
import SharedChatViewer from '../components/SharedChatViewer';

/**
 * Example integration of chat sharing feature
 * 
 * This component demonstrates how to:
 * 1. Show shared chat in read-only mode
 * 2. Handle "Continue conversation" action
 * 3. Navigate between shared view and active chat
 */

type ChatMessage = {
  id: string;
  text: string;
  sender: "user" | "bot";
  time: string;
};

interface ChatWithSharingProps {
  // Pass shareId when opening a shared chat link
  initialShareId?: string;
}

export default function ChatWithSharing({ initialShareId }: ChatWithSharingProps) {
  const [view, setView] = useState<'chat' | 'shared'>(initialShareId ? 'shared' : 'chat');
  const [shareId, setShareId] = useState<string | undefined>(initialShareId);
  const [continueMessages, setContinueMessages] = useState<ChatMessage[] | undefined>();

  const handleContinueConversation = (messages: ChatMessage[]) => {
    // Copy messages and switch to chat view
    setContinueMessages(messages);
    setView('chat');
    setShareId(undefined);
  };

  const handleCloseShared = () => {
    setView('chat');
    setShareId(undefined);
  };

  // Handle deep link or URL parameter to open shared chat
  // Example: myapp://chat/shared/ABC123
  const handleOpenSharedChat = (sharedId: string) => {
    setShareId(sharedId);
    setView('shared');
  };

  if (view === 'shared' && shareId) {
    return (
      <SharedChatViewer
        shareId={shareId}
        onContinueConversation={handleContinueConversation}
        onClose={handleCloseShared}
      />
    );
  }

  return <ChatScreen continueFromShared={continueMessages} />;
}
