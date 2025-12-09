import crypto from 'crypto';
import https from 'https';
import { createClient } from '@supabase/supabase-js';

// Supabase client
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

let supabase = null;
if (SUPABASE_URL && SUPABASE_KEY) {
  supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
}

// Generate signature for Shopee API v2
function generateSignature(partnerId, partnerKey, apiPath, timestamp) {
  const baseString = `${partnerId}${apiPath}${timestamp}`;
  return crypto.createHmac('sha256', partnerKey).update(baseString).digest('hex');
}

// Make HTTPS request
function makeRequest(options, postData = null) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          resolve(data);
        }
      });
    });
    req.on('error', reject);
    if (postData) {
      req.write(JSON.stringify(postData));
    }
    req.end();
  });
}

// Get tokens from Supabase
async function getTokensFromSupabase(shopId) {
  if (!supabase) return null;
  
  try {
    const { data, error } = await supabase
      .from('shopee_tokens')
      .select('*')
      .eq('shop_id', shopId)
      .single();
    
    if (error) {
      console.log('Supabase read error:', error.message);
      return null;
    }
    return data;
  } catch (e) {
    console.log('Supabase error:', e.message);
    return null;
  }
}

// Save tokens to Supabase
async function saveTokensToSupabase(shopId, partnerId, partnerKey, accessToken, refreshToken) {
  if (!supabase) return false;
  
  try {
    const { error } = await supabase
      .from('shopee_tokens')
      .upsert({
        shop_id: shopId,
        partner_id: partnerId,
        partner_key: partnerKey,
        access_token: accessToken,
        refresh_token: refreshToken,
        token_expiry: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(),
        last_refresh: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }, { onConflict: 'shop_id' });
    
    if (error) {
      console.log('Supabase save error:', error.message);
      return false;
    }
    return true;
  } catch (e) {
    console.log('Supabase error:', e.message);
    return false;
  }
}

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    // Get shop_id first (required) - trim whitespace
    let shopId = String(req.query.shop_id || req.body?.shop_id || '').trim();
    
    // Try to get credentials from Supabase first - trim whitespace
    let partnerId = String(req.query.partner_id || req.body?.partner_id || '').trim();
    let partnerKey = String(req.query.partner_key || req.body?.partner_key || '').trim();
    let refreshToken = String(req.query.refresh_token || req.body?.refresh_token || '').trim();
    
    // If shop_id provided but missing other params, try Supabase
    if (shopId && (!partnerId || !partnerKey || !refreshToken)) {
      const savedTokens = await getTokensFromSupabase(shopId);
      if (savedTokens) {
        partnerId = partnerId || savedTokens.partner_id;
        partnerKey = partnerKey || savedTokens.partner_key;
        refreshToken = refreshToken || savedTokens.refresh_token;
        console.log('Loaded credentials from Supabase for shop:', shopId);
      }
    }
    
    if (!partnerId || !partnerKey || !shopId || !refreshToken) {
      return res.status(400).json({
        success: false,
        error: 'Missing required parameters: partner_id, partner_key, shop_id, refresh_token',
        hint: 'Either provide all params in URL or save tokens to Supabase first'
      });
    }

    const timestamp = Math.floor(Date.now() / 1000);
    const apiPath = '/api/v2/auth/access_token/get';
    const sign = generateSignature(partnerId, partnerKey, apiPath, timestamp);

    const postData = {
      partner_id: parseInt(partnerId),
      refresh_token: refreshToken,
      shop_id: parseInt(shopId)
    };

    const options = {
      hostname: 'partner.shopeemobile.com',
      path: `${apiPath}?partner_id=${partnerId}&timestamp=${timestamp}&sign=${sign}`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    };

    const result = await makeRequest(options, postData);

    if (result.access_token) {
      // Save new tokens to Supabase
      const saved = await saveTokensToSupabase(
        shopId, 
        partnerId, 
        partnerKey, 
        result.access_token, 
        result.refresh_token
      );
      
      // Success - return new tokens
      res.status(200).json({
        success: true,
        access_token: result.access_token,
        refresh_token: result.refresh_token,
        expire_in: result.expire_in,
        refreshed_at: new Date().toISOString(),
        saved_to_supabase: saved,
        message: 'Token refreshed successfully'
      });
    } else {
      res.status(200).json({
        success: false,
        error: result.message || result.error || 'Failed to refresh token',
        data: result
      });
    }

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}
