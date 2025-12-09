// Chat Service using Supabase Realtime
import { supabase, isSupabaseConfigured } from '../lib/supabase'
import { notifyNewChat } from './chatNotification'

// ==================== CONVERSATIONS ====================

/**
 * Get all conversations with optional filters
 */
export const getConversations = async (filters = {}) => {
  const { marketplace, unreadOnly, limit = 50 } = filters
  
  if (!isSupabaseConfigured()) {
    console.warn('Supabase not configured, using demo data')
    return getDemoConversations()
  }
  
  let query = supabase
    .from('marketplace_conversations')
    .select('*')
    .order('updated_at', { ascending: false })
    .limit(limit)
  
  if (marketplace && marketplace !== 'all') {
    query = query.eq('marketplace', marketplace)
  }
  
  if (unreadOnly) {
    query = query.gt('unread_count', 0)
  }
  
  const { data, error } = await query
  
  if (error) {
    console.error('Error fetching conversations:', error)
    return []
  }
  
  return data || []
}

/**
 * Get single conversation by ID
 */
export const getConversation = async (conversationId) => {
  if (!isSupabaseConfigured()) {
    return null
  }
  
  const { data, error } = await supabase
    .from('marketplace_conversations')
    .select('*')
    .eq('conversation_id', conversationId)
    .single()
  
  if (error) {
    console.error('Error fetching conversation:', error)
    return null
  }
  
  return data
}

/**
 * Create or update conversation
 */
export const upsertConversation = async (conversation) => {
  if (!isSupabaseConfigured()) {
    return null
  }
  
  const { data, error } = await supabase
    .from('marketplace_conversations')
    .upsert(conversation, { onConflict: 'conversation_id' })
    .select()
    .single()
  
  if (error) {
    console.error('Error upserting conversation:', error)
    return null
  }
  
  return data
}

// ==================== MESSAGES ====================

/**
 * Get messages for a conversation
 */
export const getMessages = async (conversationId, limit = 100) => {
  if (!isSupabaseConfigured()) {
    return getDemoMessages(conversationId)
  }
  
  const { data, error } = await supabase
    .from('marketplace_messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('sent_at', { ascending: true })
    .limit(limit)
  
  if (error) {
    console.error('Error fetching messages:', error)
    return []
  }
  
  return data || []
}

/**
 * Send a message
 */
export const sendMessage = async (conversationId, message) => {
  if (!isSupabaseConfigured()) {
    console.warn('Supabase not configured')
    return null
  }
  
  const messageData = {
    conversation_id: conversationId,
    message_id: `msg_${Date.now()}`,
    content: message.content,
    message_type: message.type || 'text',
    sender_type: 'seller',
    sender_id: 'seller_1',
    sender_name: 'Anda',
    media_url: message.mediaUrl,
    sent_at: new Date().toISOString()
  }
  
  const { data, error } = await supabase
    .from('marketplace_messages')
    .insert(messageData)
    .select()
    .single()
  
  if (error) {
    console.error('Error sending message:', error)
    return null
  }
  
  return data
}

/**
 * Mark conversation as read
 */
export const markAsRead = async (conversationId) => {
  if (!isSupabaseConfigured()) {
    return
  }
  
  // Call the database function
  const { error } = await supabase.rpc('mark_conversation_read', {
    p_conversation_id: conversationId
  })
  
  if (error) {
    console.error('Error marking as read:', error)
  }
}

// ==================== REALTIME SUBSCRIPTIONS ====================

/**
 * Subscribe to new messages (realtime)
 */
export const subscribeToMessages = (conversationId, callback) => {
  if (!isSupabaseConfigured()) {
    return () => {}
  }
  
  const channel = supabase
    .channel(`messages:${conversationId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'marketplace_messages',
        filter: `conversation_id=eq.${conversationId}`
      },
      (payload) => {
        console.log('New message received:', payload.new)
        callback(payload.new)
      }
    )
    .subscribe()
  
  // Return unsubscribe function
  return () => {
    supabase.removeChannel(channel)
  }
}

/**
 * Subscribe to all new messages (for notifications)
 */
export const subscribeToAllMessages = (callback) => {
  if (!isSupabaseConfigured()) {
    return () => {}
  }
  
  const channel = supabase
    .channel('all-messages')
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'marketplace_messages',
        filter: 'sender_type=eq.buyer' // Only notify for buyer messages
      },
      async (payload) => {
        console.log('New buyer message:', payload.new)
        
        // Get conversation details for notification
        const conversation = await getConversation(payload.new.conversation_id)
        
        // Trigger notification
        if (conversation) {
          notifyNewChat({
            marketplace: conversation.marketplace,
            buyerName: conversation.buyer_name || 'Pembeli',
            message: payload.new.content,
            conversationId: payload.new.conversation_id
          })
        }
        
        callback(payload.new, conversation)
      }
    )
    .subscribe()
  
  return () => {
    supabase.removeChannel(channel)
  }
}

/**
 * Subscribe to conversation updates
 */
export const subscribeToConversations = (callback) => {
  if (!isSupabaseConfigured()) {
    return () => {}
  }
  
  const channel = supabase
    .channel('conversations')
    .on(
      'postgres_changes',
      {
        event: '*', // INSERT, UPDATE, DELETE
        schema: 'public',
        table: 'marketplace_conversations'
      },
      (payload) => {
        console.log('Conversation update:', payload)
        callback(payload.eventType, payload.new, payload.old)
      }
    )
    .subscribe()
  
  return () => {
    supabase.removeChannel(channel)
  }
}

// ==================== STATISTICS ====================

/**
 * Get chat statistics
 */
export const getChatStats = async () => {
  if (!isSupabaseConfigured()) {
    return {
      totalConversations: 5,
      unreadCount: 3,
      todayMessages: 12
    }
  }
  
  // Get total unread
  const { count: unreadCount } = await supabase
    .from('marketplace_conversations')
    .select('*', { count: 'exact', head: true })
    .gt('unread_count', 0)
  
  // Get total conversations
  const { count: totalConversations } = await supabase
    .from('marketplace_conversations')
    .select('*', { count: 'exact', head: true })
  
  // Get today's messages
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  
  const { count: todayMessages } = await supabase
    .from('marketplace_messages')
    .select('*', { count: 'exact', head: true })
    .gte('sent_at', today.toISOString())
  
  return {
    totalConversations: totalConversations || 0,
    unreadCount: unreadCount || 0,
    todayMessages: todayMessages || 0
  }
}

// ==================== DEMO DATA (when Supabase not configured) ====================

const getDemoConversations = () => {
  return [
    {
      id: '1',
      conversation_id: 'conv_1',
      marketplace: 'shopee',
      buyer_id: 'buyer_1',
      buyer_name: 'Budi Santoso',
      buyer_avatar: null,
      last_message: 'Apakah barang ready?',
      last_message_time: new Date(Date.now() - 5 * 60000).toISOString(),
      last_message_type: 'text',
      unread_count: 2,
      is_pinned: false,
      order_id: null,
      updated_at: new Date(Date.now() - 5 * 60000).toISOString()
    },
    {
      id: '2',
      conversation_id: 'conv_2',
      marketplace: 'tokopedia',
      buyer_id: 'buyer_2',
      buyer_name: 'Siti Aminah',
      buyer_avatar: null,
      last_message: 'Terima kasih, barang sudah sampai!',
      last_message_time: new Date(Date.now() - 30 * 60000).toISOString(),
      last_message_type: 'text',
      unread_count: 0,
      is_pinned: true,
      order_id: 'ORD123456',
      updated_at: new Date(Date.now() - 30 * 60000).toISOString()
    },
    {
      id: '3',
      conversation_id: 'conv_3',
      marketplace: 'lazada',
      buyer_id: 'buyer_3',
      buyer_name: 'Andi Wijaya',
      buyer_avatar: null,
      last_message: 'Bisa nego harga?',
      last_message_time: new Date(Date.now() - 2 * 3600000).toISOString(),
      last_message_type: 'text',
      unread_count: 1,
      is_pinned: false,
      order_id: null,
      updated_at: new Date(Date.now() - 2 * 3600000).toISOString()
    },
    {
      id: '4',
      conversation_id: 'conv_4',
      marketplace: 'tiktok',
      buyer_id: 'buyer_4',
      buyer_name: 'Dewi Lestari',
      buyer_avatar: null,
      last_message: 'Kak, ini warna apa saja yang tersedia?',
      last_message_time: new Date(Date.now() - 1 * 3600000).toISOString(),
      last_message_type: 'text',
      unread_count: 3,
      is_pinned: false,
      order_id: null,
      updated_at: new Date(Date.now() - 1 * 3600000).toISOString()
    },
    {
      id: '5',
      conversation_id: 'conv_5',
      marketplace: 'shopee',
      buyer_id: 'buyer_5',
      buyer_name: 'Rudi Hartono',
      buyer_avatar: null,
      last_message: 'Pesanan sudah dikirim kak',
      last_message_time: new Date(Date.now() - 4 * 3600000).toISOString(),
      last_message_type: 'text',
      unread_count: 0,
      is_pinned: false,
      order_id: 'ORD789012',
      updated_at: new Date(Date.now() - 4 * 3600000).toISOString()
    }
  ]
}

const getDemoMessages = (conversationId) => {
  const messagesByConv = {
    'conv_1': [
      { id: 'm1', content: 'Halo kak, saya mau tanya', sender_type: 'buyer', sender_name: 'Budi Santoso', sent_at: new Date(Date.now() - 10 * 60000).toISOString() },
      { id: 'm2', content: 'Silakan kak, ada yang bisa dibantu?', sender_type: 'seller', sender_name: 'Anda', sent_at: new Date(Date.now() - 8 * 60000).toISOString() },
      { id: 'm3', content: 'Apakah barang ready?', sender_type: 'buyer', sender_name: 'Budi Santoso', sent_at: new Date(Date.now() - 5 * 60000).toISOString() },
    ],
    'conv_2': [
      { id: 'm4', content: 'Pesanan saya sudah dikirim?', sender_type: 'buyer', sender_name: 'Siti Aminah', sent_at: new Date(Date.now() - 2 * 3600000).toISOString() },
      { id: 'm5', content: 'Sudah kak, ini no resinya: JNE123456789', sender_type: 'seller', sender_name: 'Anda', sent_at: new Date(Date.now() - 1.5 * 3600000).toISOString() },
      { id: 'm6', content: 'Terima kasih, barang sudah sampai!', sender_type: 'buyer', sender_name: 'Siti Aminah', sent_at: new Date(Date.now() - 30 * 60000).toISOString() },
    ],
    'conv_3': [
      { id: 'm7', content: 'Bisa nego harga?', sender_type: 'buyer', sender_name: 'Andi Wijaya', sent_at: new Date(Date.now() - 2 * 3600000).toISOString() },
    ],
    'conv_4': [
      { id: 'm8', content: 'Kak, mau tanya dong', sender_type: 'buyer', sender_name: 'Dewi Lestari', sent_at: new Date(Date.now() - 1.5 * 3600000).toISOString() },
      { id: 'm9', content: 'Ini produknya bagus gak?', sender_type: 'buyer', sender_name: 'Dewi Lestari', sent_at: new Date(Date.now() - 1.2 * 3600000).toISOString() },
      { id: 'm10', content: 'Kak, ini warna apa saja yang tersedia?', sender_type: 'buyer', sender_name: 'Dewi Lestari', sent_at: new Date(Date.now() - 1 * 3600000).toISOString() },
    ],
    'conv_5': [
      { id: 'm11', content: 'Kapan pesanan dikirim?', sender_type: 'buyer', sender_name: 'Rudi Hartono', sent_at: new Date(Date.now() - 5 * 3600000).toISOString() },
      { id: 'm12', content: 'Pesanan sudah dikirim kak', sender_type: 'seller', sender_name: 'Anda', sent_at: new Date(Date.now() - 4 * 3600000).toISOString() },
    ]
  }
  
  return messagesByConv[conversationId] || []
}

export default {
  getConversations,
  getConversation,
  upsertConversation,
  getMessages,
  sendMessage,
  markAsRead,
  subscribeToMessages,
  subscribeToAllMessages,
  subscribeToConversations,
  getChatStats
}
