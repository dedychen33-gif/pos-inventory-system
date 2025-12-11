/**
 * Setup Shopee Credentials in Supabase
 * Run this once to populate shopee_tokens table
 */

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL?.trim()
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim()

export async function setupShopeeCredentials() {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY || SUPABASE_URL === 'your-supabase-url') {
    console.error('❌ Supabase not configured')
    return { success: false, error: 'Supabase not configured' }
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

  try {
    // Get credentials from localStorage (if they exist there)
    const partnerId = localStorage.getItem('shopee_partner_id') || '2014001'
    const partnerKey = localStorage.getItem('shopee_partner_key') || ''
    const shopId = localStorage.getItem('shopee_shop_id') || '669903315'
    const accessToken = localStorage.getItem('shopee_access_token') || ''
    const refreshToken = localStorage.getItem('shopee_refresh_token') || ''

    console.log('📝 Credentials to insert:', {
      partnerId,
      shopId,
      hasPartnerKey: !!partnerKey,
      hasAccessToken: !!accessToken,
      hasRefreshToken: !!refreshToken
    })

    if (!partnerKey || !accessToken) {
      console.error('❌ Missing required credentials (partner_key or access_token)')
      return { 
        success: false, 
        error: 'Missing required credentials. Please connect to Shopee first from Settings > Marketplace Integration.' 
      }
    }

    // Check if table exists and has data
    const { data: existing, error: selectError } = await supabase
      .from('shopee_tokens')
      .select('*')
      .limit(1)
      .maybeSingle()

    if (selectError && selectError.code !== 'PGRST116') {
      // PGRST116 = no rows returned, which is fine
      console.error('❌ Error checking shopee_tokens:', selectError)
      return { success: false, error: selectError.message }
    }

    if (existing) {
      // Update existing record
      console.log('🔄 Updating existing Shopee credentials...')
      const { error: updateError } = await supabase
        .from('shopee_tokens')
        .update({
          partner_id: partnerId,
          partner_key: partnerKey,
          shop_id: shopId,
          access_token: accessToken,
          refresh_token: refreshToken,
          updated_at: new Date().toISOString()
        })
        .eq('id', existing.id)

      if (updateError) {
        console.error('❌ Update error:', updateError)
        return { success: false, error: updateError.message }
      }

      console.log('✅ Shopee credentials updated in Supabase')
      return { success: true, message: 'Credentials updated successfully' }
    } else {
      // Insert new record
      console.log('➕ Inserting new Shopee credentials...')
      const { error: insertError } = await supabase
        .from('shopee_tokens')
        .insert({
          partner_id: partnerId,
          partner_key: partnerKey,
          shop_id: shopId,
          access_token: accessToken,
          refresh_token: refreshToken
        })

      if (insertError) {
        console.error('❌ Insert error:', insertError)
        return { success: false, error: insertError.message }
      }

      console.log('✅ Shopee credentials inserted into Supabase')
      return { success: true, message: 'Credentials inserted successfully' }
    }
  } catch (error) {
    console.error('❌ Setup error:', error)
    return { success: false, error: error.message }
  }
}

// Auto-run on import in development
if (import.meta.env.DEV) {
  console.log('🔧 Development mode: setupShopeeCredentials available in window')
  window.setupShopeeCredentials = setupShopeeCredentials
}
