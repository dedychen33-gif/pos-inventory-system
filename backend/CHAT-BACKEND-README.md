# Marketplace Chat Backend

Backend server untuk integrasi chat marketplace (Shopee, Lazada, Tokopedia).

## Features

- ✅ Fetch conversations dari semua marketplace
- ✅ Fetch messages dari conversation
- ✅ Send message ke buyer
- ✅ Webhook endpoints untuk real-time notification
- ✅ Unified API untuk semua platform

## Endpoints

### Shopee
- `GET /api/shopee/chat/conversations` - List conversations
- `GET /api/shopee/chat/messages` - Get messages
- `POST /api/shopee/chat/send` - Send message

### Lazada
- `GET /api/lazada/chat/sessions` - List sessions
- `GET /api/lazada/chat/messages` - Get messages
- `POST /api/lazada/chat/send` - Send message

### Tokopedia
- `GET /api/tokopedia/chat/list` - List chats
- `GET /api/tokopedia/chat/replies` - Get replies
- `POST /api/tokopedia/chat/send` - Send reply

### Unified
- `POST /api/chat/all-conversations` - Get all conversations from all stores
- `POST /api/chat/unread-count` - Get total unread count

### Webhooks
- `POST /webhook/shopee/chat` - Shopee chat webhook
- `POST /webhook/lazada/chat` - Lazada chat webhook
- `POST /webhook/tokopedia/chat` - Tokopedia chat webhook

## Local Development

```bash
cd backend
npm install
npm run chat
```

Server akan jalan di `http://localhost:3001`

## Deploy ke Railway

1. Buka https://railway.app
2. Sign in dengan GitHub
3. New Project > Deploy from GitHub repo
4. Pilih repo `pos-inventory-system`
5. Settings:
   - Root Directory: `backend`
   - Start Command: `node chatServer.js`
6. Deploy!
7. Copy URL yang diberikan (contoh: `https://xxx.railway.app`)

## Deploy ke Render

1. Buka https://render.com
2. Sign in dengan GitHub
3. New > Web Service
4. Connect GitHub repo
5. Settings:
   - Name: `pos-chat-backend`
   - Root Directory: `backend`
   - Build Command: `npm install`
   - Start Command: `node chatServer.js`
6. Create Web Service
7. Copy URL (contoh: `https://pos-chat-backend.onrender.com`)

## Configure Frontend

Setelah deploy, update `.env` di frontend:

```env
VITE_CHAT_API_URL=https://your-backend-url.railway.app
```

## Register Webhooks

### Shopee
1. Buka Shopee Partner Console
2. App Settings > Webhook
3. Add URL: `https://your-backend-url/webhook/shopee/chat`
4. Select events: Chat Message

### Lazada
1. Buka Lazada Open Platform
2. App Management > Webhook
3. Add URL: `https://your-backend-url/webhook/lazada/chat`

### Tokopedia
1. Buka Tokopedia Seller Center
2. Developer > Webhook
3. Add URL: `https://your-backend-url/webhook/tokopedia/chat`

## Test Webhook

```bash
# Test Shopee webhook
curl -X POST https://your-backend-url/webhook/shopee/chat \
  -H "Content-Type: application/json" \
  -d '{"shop_id": 123, "data": {"conversation_id": "abc", "message": "test"}}'
```
