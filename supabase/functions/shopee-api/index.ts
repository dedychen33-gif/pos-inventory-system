// Supabase Edge Function: Shopee API
// Handles orders, products sync from Shopee
// Deploy: supabase functions deploy shopee-api --no-verify-jwt

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Generate HMAC-SHA256 signature for Shopee API
async function generateSignature(partnerId: string, partnerKey: string, apiPath: string, timestamp: number, accessToken?: string, shopId?: string): Promise<string> {
  let baseString = `${partnerId}${apiPath}${timestamp}`;
  if (accessToken && shopId) {
    baseString = `${partnerId}${apiPath}${timestamp}${accessToken}${shopId}`;
  }
  
  const encoder = new TextEncoder();
  const keyData = encoder.encode(partnerKey);
  const messageData = encoder.encode(baseString);
  
  const cryptoKey = await crypto.subtle.importKey(
    'raw', keyData, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  );
  
  const signature = await crypto.subtle.sign('HMAC', cryptoKey, messageData);
  return Array.from(new Uint8Array(signature))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

// Get order list from Shopee
async function getOrderList(partnerId: string, partnerKey: string, shopId: string, accessToken: string, timeFrom: number, timeTo: number, pageSize: number = 100, orderStatus?: string) {
  const timestamp = Math.floor(Date.now() / 1000);
  const apiPath = '/api/v2/order/get_order_list';
  const sign = await generateSignature(partnerId, partnerKey, apiPath, timestamp, accessToken, shopId);
  
  const params = new URLSearchParams({
    partner_id: partnerId,
    timestamp: timestamp.toString(),
    sign,
    shop_id: shopId,
    access_token: accessToken,
    time_range_field: 'create_time',
    time_from: timeFrom.toString(),
    time_to: timeTo.toString(),
    page_size: pageSize.toString()
  });
  
  if (orderStatus && orderStatus !== 'ALL') {
    params.append('order_status', orderStatus);
  }
  
  const url = `https://partner.shopeemobile.com${apiPath}?${params.toString()}`;
  console.log('Calling Shopee API:', url);
  
  const response = await fetch(url, { method: 'GET' });
  return await response.json();
}

// Get order details
async function getOrderDetails(partnerId: string, partnerKey: string, shopId: string, accessToken: string, orderSnList: string[]) {
  const timestamp = Math.floor(Date.now() / 1000);
  const apiPath = '/api/v2/order/get_order_detail';
  const sign = await generateSignature(partnerId, partnerKey, apiPath, timestamp, accessToken, shopId);
  
  const params = new URLSearchParams({
    partner_id: partnerId,
    timestamp: timestamp.toString(),
    sign,
    shop_id: shopId,
    access_token: accessToken,
    order_sn_list: orderSnList.join(','),
    response_optional_fields: 'buyer_user_id,buyer_username,estimated_shipping_fee,recipient_address,actual_shipping_fee,goods_to_declare,note,note_update_time,item_list,pay_time,dropshipper,dropshipper_phone,split_up,buyer_cancel_reason,cancel_by,cancel_reason,actual_shipping_fee_confirmed,buyer_cpf_id,fulfillment_flag,pickup_done_time,package_list,shipping_carrier,payment_method,total_amount,invoice_data,checkout_shipping_carrier,reverse_shipping_fee,order_chargeable_weight_gram'
  });
  
  const url = `https://partner.shopeemobile.com${apiPath}?${params.toString()}`;
  const response = await fetch(url, { method: 'GET' });
  return await response.json();
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { action, shopId, accessToken, partnerId, partnerKey, ...params } = body;
    
    console.log('Shopee API request:', { action, shopId });

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get credentials from database if not provided
    let credentials = { partnerId, partnerKey, accessToken, shopId };
    
    if (!partnerId || !partnerKey) {
      // Try to get from marketplace_tokens table
      const { data: tokenData } = await supabase
        .from('marketplace_tokens')
        .select('*')
        .eq('marketplace', 'shopee')
        .eq('shop_id', shopId)
        .single();
      
      if (tokenData) {
        credentials = {
          partnerId: tokenData.partner_id || Deno.env.get('SHOPEE_PARTNER_ID') || '',
          partnerKey: tokenData.partner_key || Deno.env.get('SHOPEE_PARTNER_KEY') || '',
          accessToken: tokenData.access_token || accessToken,
          shopId: tokenData.shop_id || shopId
        };
      }
    }
    
    // Also try shopee_tokens table
    if (!credentials.accessToken) {
      const { data: shopeeToken } = await supabase
        .from('shopee_tokens')
        .select('*')
        .eq('shop_id', shopId)
        .single();
      
      if (shopeeToken) {
        credentials.partnerId = shopeeToken.partner_id;
        credentials.partnerKey = shopeeToken.partner_key;
        credentials.accessToken = shopeeToken.access_token;
      }
    }

    if (!credentials.partnerId || !credentials.partnerKey || !credentials.accessToken) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Missing Shopee credentials. Please check partner_id, partner_key, and access_token.' 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      });
    }

    let result;
    
    switch (action) {
      case 'getOrders': {
        // Default to last 15 days
        const now = Math.floor(Date.now() / 1000);
        const fifteenDaysAgo = now - (15 * 24 * 60 * 60);
        const timeFrom = params.timeFrom || fifteenDaysAgo;
        const timeTo = params.timeTo || now;
        
        console.log('Getting orders from', new Date(timeFrom * 1000), 'to', new Date(timeTo * 1000));
        
        const orderListResult = await getOrderList(
          credentials.partnerId,
          credentials.partnerKey,
          credentials.shopId,
          credentials.accessToken,
          timeFrom,
          timeTo,
          100,
          params.orderStatus
        );
        
        console.log('Order list result:', JSON.stringify(orderListResult));
        
        if (orderListResult.error) {
          result = { success: false, error: orderListResult.error, message: orderListResult.message };
        } else if (orderListResult.response?.order_list?.length > 0) {
          // Get order details
          const orderSnList = orderListResult.response.order_list.map((o: any) => o.order_sn);
          const detailResult = await getOrderDetails(
            credentials.partnerId,
            credentials.partnerKey,
            credentials.shopId,
            credentials.accessToken,
            orderSnList
          );
          
          result = { 
            success: true, 
            orders: detailResult.response?.order_list || orderListResult.response.order_list,
            totalCount: orderListResult.response.order_list.length,
            more: orderListResult.response.more
          };
        } else {
          result = { success: true, orders: [], totalCount: 0 };
        }
        break;
      }
      
      case 'getOrderDetails': {
        const detailResult = await getOrderDetails(
          credentials.partnerId,
          credentials.partnerKey,
          credentials.shopId,
          credentials.accessToken,
          params.orderSnList || []
        );
        result = { success: true, orders: detailResult.response?.order_list || [] };
        break;
      }
      
      case 'test': {
        result = { success: true, message: 'Shopee API is working', credentials: { partnerId: credentials.partnerId, shopId: credentials.shopId } };
        break;
      }
      
      default:
        result = { success: false, error: `Unknown action: ${action}` };
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200
    });

  } catch (error) {
    console.error('Shopee API error:', error);
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500
    });
  }
});
