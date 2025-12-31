import { supabase } from '../lib/supabase';

class ShopeeWebhookService {
  async getWebhookLogs(filters = {}) {
    let query = supabase
      .from('shopee_webhook_logs')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (filters.status) {
      query = query.eq('status', filters.status);
    }
    
    if (filters.webhook_code !== undefined) {
      query = query.eq('webhook_code', filters.webhook_code);
    }
    
    if (filters.limit) {
      query = query.limit(filters.limit);
    }
    
    const { data, error } = await query;
    
    if (error) throw error;
    return data;
  }
  
  async getSyncQueue(filters = {}) {
    let query = supabase
      .from('shopee_sync_queue')
      .select('*')
      .order('priority', { ascending: false })
      .order('created_at', { ascending: true });
    
    if (filters.status) {
      query = query.eq('status', filters.status);
    }
    
    if (filters.sync_type) {
      query = query.eq('sync_type', filters.sync_type);
    }
    
    if (filters.limit) {
      query = query.limit(filters.limit);
    }
    
    const { data, error } = await query;
    
    if (error) throw error;
    return data;
  }
  
  async getSyncHistory(productId, limit = 20) {
    const { data, error } = await supabase
      .from('shopee_stock_sync_history')
      .select('*')
      .eq('product_id', productId)
      .order('created_at', { ascending: false })
      .limit(limit);
    
    if (error) throw error;
    return data;
  }
  
  async queueStockSync(productId, newStock, trigger = 'manual') {
    const { data: product, error: productError } = await supabase
      .from('products')
      .select('shopee_item_id, shopee_model_id, source')
      .eq('id', productId)
      .single();
    
    if (productError) throw productError;
    
    if (product.source !== 'shopee' || !product.shopee_item_id) {
      throw new Error('Product is not from Shopee');
    }
    
    const { data, error } = await supabase
      .from('shopee_sync_queue')
      .insert({
        sync_type: 'stock_update',
        direction: 'pos_to_shopee',
        product_id: productId,
        shopee_item_id: product.shopee_item_id,
        shopee_model_id: product.shopee_model_id,
        data: { stock: newStock, trigger },
        priority: trigger === 'manual' ? 8 : 5
      })
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }
  
  async processSyncQueue() {
    const API_BASE_URL = import.meta.env.VITE_SHOPEE_API_URL || 'http://localhost:3001/api';
    
    const response = await fetch(`${API_BASE_URL}/shopee/sync-processor`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error('Failed to process sync queue');
    }
    
    return await response.json();
  }
  
  async retryFailedSync(queueId) {
    const { data, error } = await supabase
      .from('shopee_sync_queue')
      .update({
        status: 'pending',
        retry_count: 0,
        error_message: null,
        scheduled_at: new Date().toISOString()
      })
      .eq('id', queueId)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }
  
  async getWebhookStats() {
    const { data: logs, error: logsError } = await supabase
      .from('shopee_webhook_logs')
      .select('status, webhook_code')
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());
    
    if (logsError) throw logsError;
    
    const { data: queue, error: queueError } = await supabase
      .from('shopee_sync_queue')
      .select('status, sync_type');
    
    if (queueError) throw queueError;
    
    const stats = {
      webhooks: {
        total: logs.length,
        success: logs.filter(l => l.status === 'success').length,
        failed: logs.filter(l => l.status === 'failed').length,
        pending: logs.filter(l => l.status === 'pending').length
      },
      syncQueue: {
        total: queue.length,
        pending: queue.filter(q => q.status === 'pending').length,
        processing: queue.filter(q => q.status === 'processing').length,
        success: queue.filter(q => q.status === 'success').length,
        failed: queue.filter(q => q.status === 'failed').length,
        retry: queue.filter(q => q.status === 'retry').length
      }
    };
    
    return stats;
  }
}

export default new ShopeeWebhookService();
