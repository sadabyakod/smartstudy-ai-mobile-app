# Chat Sharing Feature - Implementation Guide

## Overview
This feature allows users to share entire chat conversations via a link. Recipients can view the chat in read-only mode and optionally continue the conversation in their own chat session.

## Architecture

### Frontend Components
1. **ChatScreen.tsx** - Main chat interface with share button
2. **SharedChatViewer.tsx** - Read-only view for shared chats
3. **ChatWithSharing.tsx** - Integration example combining both views

### API Services
1. **sharedChatApi.ts** - API functions for creating and retrieving shared chats

## Backend Requirements

You need to implement these endpoints on your backend:

### 1. Create Shared Chat
```
POST /api/chat/share

Request:
{
  "sessionId": "string",
  "messages": [
    {
      "text": "Hello!",
      "sender": "user",
      "time": "12:30"
    },
    {
      "text": "Hi! How can I help?",
      "sender": "bot",
      "time": "12:31"
    }
  ]
}

Response:
{
  "status": "success",
  "shareId": "ABC123XYZ",
  "shareUrl": "https://yourapp.com/shared/ABC123XYZ"
}
```

### 2. Get Shared Chat
```
GET /api/chat/shared/{shareId}

Response:
{
  "status": "success",
  "shareId": "ABC123XYZ",
  "messages": [...],
  "createdAt": "2025-12-15T10:30:00Z"
}
```

## Database Schema (Example)

```sql
CREATE TABLE shared_chats (
  id VARCHAR(50) PRIMARY KEY,
  session_id VARCHAR(100),
  messages JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP,
  INDEX idx_created_at (created_at)
);
```

## Frontend Setup

### Step 1: Install Dependencies
All dependencies are already included in your project:
- expo-clipboard
- React Native's Share API
- @expo/vector-icons

### Step 2: Update App.tsx or Navigation

Replace your current ChatScreen usage with ChatWithSharing:

```tsx
import ChatWithSharing from './components/ChatWithSharing';

// In your navigation or main app:
<ChatWithSharing initialShareId={shareIdFromURL} />
```

### Step 3: Handle Deep Links

To handle shared chat URLs like `myapp://chat/shared/ABC123`:

#### Add URL scheme in app.json:
```json
{
  "expo": {
    "scheme": "myapp",
    "android": {
      "intentFilters": [
        {
          "action": "VIEW",
          "data": [
            {
              "scheme": "https",
              "host": "yourapp.com",
              "pathPrefix": "/shared"
            }
          ],
          "category": ["BROWSABLE", "DEFAULT"]
        }
      ]
    }
  }
}
```

#### Handle incoming links:
```tsx
import { useEffect } from 'react';
import * as Linking from 'expo-linking';

function App() {
  const [shareId, setShareId] = useState<string>();

  useEffect(() => {
    // Handle initial URL
    Linking.getInitialURL().then(url => {
      if (url) {
        const shareId = extractShareId(url);
        if (shareId) setShareId(shareId);
      }
    });

    // Handle URL while app is open
    const subscription = Linking.addEventListener('url', ({ url }) => {
      const shareId = extractShareId(url);
      if (shareId) setShareId(shareId);
    });

    return () => subscription.remove();
  }, []);

  function extractShareId(url: string) {
    // Extract from: myapp://chat/shared/ABC123
    // or: https://yourapp.com/shared/ABC123
    const match = url.match(/\\/shared\\/([A-Za-z0-9]+)/);
    return match ? match[1] : null;
  }

  return <ChatWithSharing initialShareId={shareId} />;
}
```

## How It Works

### User A Shares a Chat:
1. User A taps the share icon in the chat header
2. App calls `createSharedChat()` with sessionId and messages
3. Backend generates unique shareId and returns shareable URL
4. User A shares the URL via native share dialog

### User B Opens Shared Link:
1. User B clicks the link (opens app via deep linking)
2. App extracts shareId from URL
3. Shows SharedChatViewer component
4. Component calls `getSharedChat(shareId)`
5. Displays messages in read-only mode

### User B Continues Conversation:
1. User B taps "Continue this conversation" button
2. All messages are copied to a new chat session
3. App switches to ChatScreen with `continueFromShared` prop
4. User B can now chat normally (doesn't affect User A)

## Security Considerations

### Backend Implementation:
1. **Rate Limiting**: Limit share creation per user
2. **Expiration**: Auto-delete old shared chats (e.g., 30 days)
3. **Access Control**: Optional authentication for viewing
4. **Validation**: Sanitize message content
5. **Short IDs**: Use secure random IDs (avoid sequential)

### Example Backend (Node.js/Express):
```javascript
const express = require('express');
const { randomBytes } = require('crypto');

app.post('/api/chat/share', async (req, res) => {
  const { sessionId, messages } = req.body;
  
  // Validate
  if (!sessionId || !Array.isArray(messages)) {
    return res.status(400).json({ error: 'Invalid request' });
  }
  
  // Generate short ID
  const shareId = randomBytes(6).toString('base64url');
  
  // Store in database
  await db.query(
    'INSERT INTO shared_chats (id, session_id, messages, expires_at) VALUES (?, ?, ?, DATE_ADD(NOW(), INTERVAL 30 DAY))',
    [shareId, sessionId, JSON.stringify(messages)]
  );
  
  res.json({
    status: 'success',
    shareId,
    shareUrl: `https://yourapp.com/shared/${shareId}`
  });
});

app.get('/api/chat/shared/:shareId', async (req, res) => {
  const { shareId } = req.params;
  
  const [result] = await db.query(
    'SELECT * FROM shared_chats WHERE id = ? AND expires_at > NOW()',
    [shareId]
  );
  
  if (!result) {
    return res.status(404).json({ error: 'Chat not found or expired' });
  }
  
  res.json({
    status: 'success',
    shareId: result.id,
    messages: JSON.parse(result.messages),
    createdAt: result.created_at
  });
});
```

## Testing

### Test Scenarios:
1. ✅ Share button creates shareable link
2. ✅ Shared link opens read-only view
3. ✅ "Continue conversation" creates new chat
4. ✅ User B's messages don't affect User A
5. ✅ Invalid/expired links show error
6. ✅ Deep linking works from external browsers
7. ✅ Native share dialog works on iOS/Android

## Customization Options

### Disable Share for Specific Messages:
```tsx
// In ChatScreen.tsx, add condition:
const canShare = messages.length > 1 && !isTyping;

<TouchableOpacity
  disabled={!canShare}
  style={[styles.shareButton, !canShare && styles.disabled]}
  onPress={handleShareConversation}
>
```

### Custom Share URL Format:
```tsx
// In handleShareConversation:
await Share.share({
  message: `💬 ${userName} shared a conversation with you!\n\n${response.shareUrl}`,
  title: "Shared Study Chat"
});
```

### Add Analytics:
```tsx
const handleShareConversation = async () => {
  // Track share event
  analytics.logEvent('chat_shared', {
    messageCount: messages.length,
    sessionId: sessionId,
  });
  
  // ... rest of code
};
```

## Troubleshooting

### Share button not working:
- Check backend API is running
- Verify API_BASE_URL in config/api.ts
- Check network requests in console

### Deep links not opening:
- Verify URL scheme in app.json
- Test with: `npx uri-scheme open myapp://chat/shared/TEST123 --android`
- Rebuild app after changing app.json

### Messages not loading:
- Check backend returns correct JSON format
- Verify shareId is valid
- Check expiration dates in database

## Next Steps

1. **Implement backend endpoints** (see Backend Requirements)
2. **Test locally** with your backend
3. **Configure deep linking** for your domain
4. **Deploy** backend and update API_BASE_URL
5. **Test end-to-end** with real shared links

## Support

If you need help with:
- Backend implementation
- Deep linking setup
- Custom features
- Database optimization

Contact your development team or refer to:
- [Expo Linking Docs](https://docs.expo.dev/guides/linking/)
- [React Native Share](https://reactnative.dev/docs/share)
