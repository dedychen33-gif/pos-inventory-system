// Supabase Edge Function: Refresh Shopee Token
// Deploy: supabase functions deploy refresh-shopee-token

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Generate HMAC-SHA256 signature for Shopee API
async function generateSignature(partnerId: string, partnerKey: string, apiPath: string, timestamp: number): Promise<string> {
  const baseString = `${partnerId}${apiPath}${timestamp}`;
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

// Refresh token from Shopee API
async function refreshShopeeToken(partnerId: string, partnerKey: string, shopId: string, refreshToken: string) {
  const timestamp = Math.floor(Date.now() / 1000);
  const apiPath = '/api/v2/auth/access_token/get';
  const sign = await generateSignature(partnerId, partnerKey, apiPath, timestamp);

  const url = `https://partner.shopeemobile.com${apiPath}?partner_id=${partnerId}&timestamp=${timestamp}&sign=${sign}`;
  
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      partner_id: parseInt(partnerId),
      refresh_token: refreshToken,
      shop_id: parseInt(shopId)
    })
  });

  return await response.json();
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get shop_id from request or refresh all
    const { shop_id } = await req.json().catch(() => ({}));

    // Query tokens to refresh
    let query = supabase
      .from('shopee_tokens')
      .select('*');
    
    if (shop_id) {
      query = query.eq('shop_id', shop_id);
    }

    const { data: tokens, error: fetchError } = await query;

    if (fetchError) {
      throw new Error(`Failed to fetch tokens: ${fetchError.message}`);
    }

    const results = [];

    for (const token of tokens || []) {
      // Check if token needs refresh (30 min before expiry)
      const needsRefresh = !token.token_expiry || 
        new Date() > new Date(new Date(token.token_expiry).getTime() - 30 * 60 * 1000);

      if (!needsRefresh && !shop_id) {
        results.push({ shop_id: token.shop_id, status: 'skipped', reason: 'Token still valid' });
        continue;
      }

      if (!token.refresh_token) {
        results.push({ shop_id: token.shop_id, status: 'error', reason: 'No refresh token' });
        continue;
      }

      // Refresh the token
      const refreshResult = await refreshShopeeToken(
        token.partner_id,
        token.partner_key,
        token.shop_id,
        token.refresh_token
      );

      if (refreshResult.access_token) {
        // Update token in database
        const { error: updateError } = await supabase
          .from('shopee_tokens')
          .update({
            access_token: refreshResult.access_token,
            refresh_token: refreshResult.refresh_token,
            token_expiry: new Date(Date.now() + refreshResult.expire_in * 1000).toISOString(),
            last_refresh: new Date().toISOString()
          })
          .eq('shop_id', token.shop_id);

        if (updateError) {
          throw new Error(`Failed to update token: ${updateError.message}`);
        }

        // Log success
        await supabase.rpc('add_shopee_log', {
          p_shop_id: token.shop_id,
          p_log_type: 'SUCCESS',
          p_message: 'Token refreshed successfully',
          p_data: { expire_in: refreshResult.expire_in }
        });

        results.push({ 
          shop_id: token.shop_id, 
          status: 'success',
          expiry: new Date(Date.now() + refreshResult.expire_in * 1000).toISOString()
        });
      } else {
        // Log error
        await supabase.rpc('add_shopee_log', {
          p_shop_id: token.shop_id,
          p_log_type: 'ERROR',
          p_message: 'Token refresh failed',
          p_data: refreshResult
        });

        results.push({ 
          shop_id: token.shop_id, 
          status: 'error', 
          reason: refreshResult.message || 'Unknown error' 
        });
      }
    }

    return new Response(
      JSON.stringify({ success: true, results }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
