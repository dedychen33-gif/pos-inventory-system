// Supabase Edge Function: Chat Webhook Handler
// Menerima webhook dari Shopee, Lazada, Tokopedia, TikTok
// Deploy: supabase functions deploy chat-webhook

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { hmac } from 'https://deno.land/x/hmac@v2.0.1/mod.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Initialize Supabase client
const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const supabase = createClient(supabaseUrl, supabaseKey)

// Shopee credentials for verification
const SHOPEE_PARTNER_KEY = Deno.env.get('SHOPEE_PARTNER_KEY') || ''

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const url = new URL(req.url)
    const marketplace = url.pathname.split('/').pop() || 'unknown'
    
    console.log(`Received webhook from: ${marketplace}`)
    
    const body = await req.json()
    console.log('Webhook body:', JSON.stringify(body))

    let result
    
    switch (marketplace) {
      case 'shopee':
        result = await handleShopeeWebhook(req, body)
        break
      case 'lazada':
        result = await handleLazadaWebhook(body)
        break
      case 'tokopedia':
        result = await handleTokopediaWebhook(body)
        break
      case 'tiktok':
        result = await handleTiktokWebhook(body)
        break
      default:
        result = { success: false, error: 'Unknown marketplace' }
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: result.success ? 200 : 400
    })

  } catch (error) {
    console.error('Webhook error:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500
    })
  }
})

// ==================== SHOPEE WEBHOOK ====================
async function handleShopeeWebhook(req: Request, body: any) {
  const { code, data, shop_id, timestamp } = body
  
  // Verify signature (optional but recommended)
  // const signature = req.headers.get('Authorization')
  // if (!verifyShopeeSignature(body, signature)) {
  //   return { success: false, error: 'Invalid signature' }
  // }
  
  // Code 10 = webchat_push (chat notification)
  if (code === 10) {
    return await processShopeeChat(data, shop_id)
  }
  
  // Other codes can be handled here
  // Code 3 = order_status_push
  // Code 4 = order_trackingno_push
  
  return { success: true, message: `Received code ${code}` }
}

async function processShopeeChat(data: any, shopId: string) {
  try {
    const {
      conversation_id,
      from_user_name,
      from_id,
      to_id,
      content,
      message_type,
      created_timestamp
    } = data
    
    const conversationId = `shopee_${conversation_id}`
    
    // Upsert conversation
    await supabase
      .from('marketplace_conversations')
      .upsert({
        conversation_id: conversationId,
        marketplace: 'shopee',
        shop_id: shopId?.toString(),
        buyer_id: from_id?.toString(),
        buyer_name: from_user_name || 'Pembeli Shopee',
        last_message: content?.text || '[Media]',
        last_message_time: new Date(created_timestamp * 1000).toISOString(),
        last_message_type: message_type || 'text',
        updated_at: new Date().toISOString()
      }, { onConflict: 'conversation_id' })
    
    // Insert message
    await supabase
      .from('marketplace_messages')
      .insert({
        conversation_id: conversationId,
        message_id: `shopee_${data.message_id || Date.now()}`,
        content: content?.text || '',
        message_type: message_type || 'text',
        sender_type: 'buyer',
        sender_id: from_id?.toString(),
        sender_name: from_user_name || 'Pembeli',
        media_url: content?.url || null,
        sent_at: new Date(created_timestamp * 1000).toISOString()
      })
    
    console.log('Shopee chat saved:', conversationId)
    return { success: true, message: 'Chat saved' }
    
  } catch (error) {
    console.error('Error processing Shopee chat:', error)
    return { success: false, error: error.message }
  }
}

// ==================== LAZADA WEBHOOK ====================
async function handleLazadaWebhook(body: any) {
  try {
    const { message_type, data } = body
    
    if (message_type === 'message') {
      const conversationId = `lazada_${data.session_id}`
      
      // Upsert conversation
      await supabase
        .from('marketplace_conversations')
        .upsert({
          conversation_id: conversationId,
          marketplace: 'lazada',
          buyer_id: data.from_account_id?.toString(),
          buyer_name: data.from_account_name || 'Pembeli Lazada',
          last_message: data.content || '[Media]',
          last_message_time: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }, { onConflict: 'conversation_id' })
      
      // Insert message
      await supabase
        .from('marketplace_messages')
        .insert({
          conversation_id: conversationId,
          message_id: `lazada_${data.message_id || Date.now()}`,
          content: data.content || '',
          message_type: data.content_type || 'text',
          sender_type: 'buyer',
          sender_id: data.from_account_id?.toString(),
          sender_name: data.from_account_name || 'Pembeli',
          sent_at: new Date().toISOString()
        })
      
      return { success: true, message: 'Lazada chat saved' }
    }
    
    return { success: true, message: 'Lazada webhook received' }
    
  } catch (error) {
    console.error('Error processing Lazada webhook:', error)
    return { success: false, error: error.message }
  }
}

// ==================== TOKOPEDIA WEBHOOK ====================
async function handleTokopediaWebhook(body: any) {
  try {
    const { fs_id, message } = body
    
    if (message) {
      const conversationId = `tokopedia_${message.msg_id}`
      
      // Upsert conversation
      await supabase
        .from('marketplace_conversations')
        .upsert({
          conversation_id: conversationId,
          marketplace: 'tokopedia',
          buyer_id: message.from_uid?.toString(),
          buyer_name: message.from_shop_name || 'Pembeli Tokopedia',
          last_message: message.text_message || '[Media]',
          last_message_time: new Date(message.create_time * 1000).toISOString(),
          updated_at: new Date().toISOString()
        }, { onConflict: 'conversation_id' })
      
      // Insert message
      await supabase
        .from('marketplace_messages')
        .insert({
          conversation_id: conversationId,
          message_id: `tokopedia_${message.reply_id || Date.now()}`,
          content: message.text_message || '',
          message_type: 'text',
          sender_type: 'buyer',
          sender_id: message.from_uid?.toString(),
          sender_name: message.from_shop_name || 'Pembeli',
          sent_at: new Date(message.create_time * 1000).toISOString()
        })
      
      return { success: true, message: 'Tokopedia chat saved' }
    }
    
    return { success: true, message: 'Tokopedia webhook received' }
    
  } catch (error) {
    console.error('Error processing Tokopedia webhook:', error)
    return { success: false, error: error.message }
  }
}

// ==================== TIKTOK WEBHOOK ====================
async function handleTiktokWebhook(body: any) {
  try {
    const { type, data } = body
    
    if (type === 1) { // Message type
      const conversationId = `tiktok_${data.conversation_id}`
      
      // Upsert conversation
      await supabase
        .from('marketplace_conversations')
        .upsert({
          conversation_id: conversationId,
          marketplace: 'tiktok',
          buyer_id: data.sender?.user_id?.toString(),
          buyer_name: data.sender?.nickname || 'Pembeli TikTok',
          last_message: data.content?.text || '[Media]',
          last_message_time: new Date(data.create_time * 1000).toISOString(),
          updated_at: new Date().toISOString()
        }, { onConflict: 'conversation_id' })
      
      // Insert message
      await supabase
        .from('marketplace_messages')
        .insert({
          conversation_id: conversationId,
          message_id: `tiktok_${data.message_id || Date.now()}`,
          content: data.content?.text || '',
          message_type: data.content?.message_type || 'text',
          sender_type: 'buyer',
          sender_id: data.sender?.user_id?.toString(),
          sender_name: data.sender?.nickname || 'Pembeli',
          media_url: data.content?.image_url || data.content?.video_url || null,
          sent_at: new Date(data.create_time * 1000).toISOString()
        })
      
      return { success: true, message: 'TikTok chat saved' }
    }
    
    return { success: true, message: 'TikTok webhook received' }
    
  } catch (error) {
    console.error('Error processing TikTok webhook:', error)
    return { success: false, error: error.message }
  }
}

// Verify Shopee webhook signature
function verifyShopeeSignature(body: any, signature: string | null): boolean {
  if (!signature || !SHOPEE_PARTNER_KEY) return true // Skip if not configured
  
  const bodyString = JSON.stringify(body)
  const expectedSignature = hmac('sha256', SHOPEE_PARTNER_KEY, bodyString, 'utf8', 'hex')
  
  return signature === expectedSignature
}
