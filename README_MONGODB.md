# MongoDB Conversation History Setup

Sistem conversation history menggunakan MongoDB untuk menyimpan riwayat percakapan AI dengan setiap user.

## Setup

1. **Install dependencies:**

```bash
npm install mongoose
# atau
bun add mongoose
```

2. **Setup MongoDB:**

   - Install MongoDB lokal atau gunakan MongoDB Atlas (cloud)
   - Dapatkan connection string

3. **Environment Variable:**
   Tambahkan ke `.env`:

```env
MONGODB_URI=mongodb://localhost:27017/ai-agent-userbot
# Atau untuk MongoDB Atlas:
# MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/database?retryWrites=true&w=majority
```

## Fitur

- ✅ **Session Management**: Setiap conversation memiliki session ID unik berdasarkan `ownerUserId_senderId`
- ✅ **Message History**: Menyimpan semua pesan user dan AI dengan timestamp
- ✅ **Auto-load History**: AI otomatis menggunakan 10 pesan terakhir untuk context
- ✅ **Robust Error Handling**: System tetap berjalan meskipun MongoDB error
- ✅ **Connection Pooling**: Efficient connection management
- ✅ **Indexes**: Optimized queries dengan compound indexes
- ✅ **TTL Support**: Optional auto-cleanup untuk old conversations

## Struktur Data

```typescript
{
  sessionId: "7997101965_8536598335", // ownerUserId_senderId
  ownerUserId: "7997101965", // User yang punya userbot
  senderId: "8536598335", // User yang chat
  messages: [
    {
      role: "user" | "assistant" | "system",
      content: "message content",
      timestamp: Date,
      metadata: {}
    }
  ],
  createdAt: Date,
  updatedAt: Date,
  lastActivityAt: Date
}
```

## API Methods

### ConversationService

- `getOrCreateConversation(ownerUserId, senderId)` - Get atau create conversation
- `addMessage(ownerUserId, senderId, role, content, metadata?)` - Tambah message
- `getConversationHistory(ownerUserId, senderId, limit?)` - Get history
- `getFormattedHistory(ownerUserId, senderId, limit?)` - Get formatted history untuk AI
- `clearConversation(ownerUserId, senderId)` - Clear history
- `deleteConversation(ownerUserId, senderId)` - Delete conversation
- `getOwnerConversations(ownerUserId)` - Get semua conversations untuk owner

## Cara Kerja

1. **Saat user mengirim pesan:**

   - System load conversation history (10 pesan terakhir)
   - History ditambahkan ke context message untuk AI
   - AI generate response dengan context history
   - User message dan AI response disimpan ke MongoDB

2. **Session Management:**

   - Setiap kombinasi `ownerUserId` + `senderId` memiliki session sendiri
   - History terpisah untuk setiap user yang chat dengan userbot

3. **Error Handling:**
   - Jika MongoDB error, system tetap berjalan tanpa history
   - Error di-log tapi tidak menghentikan proses

## Testing

Setelah setup, conversation history akan otomatis:

- ✅ Load saat ada pesan baru
- ✅ Save setiap user message dan AI response
- ✅ Digunakan oleh AI untuk context yang lebih baik
