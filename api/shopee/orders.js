import crypto from 'crypto';
import https from 'https';

// Generate signature for Shopee API v2
function generateSignatureV2(partnerId, partnerKey, apiPath, timestamp, accessToken, shopId) {
  const baseString = `${partnerId}${apiPath}${timestamp}${accessToken}${shopId}`;
  return crypto
    .createHmac('sha256', partnerKey)
    .update(baseString)
    .digest('hex');
}

// Make HTTPS request
function makeRequest(options) {
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
    req.end();
  });
}

// Get order list with pagination
async function getOrderList(partnerId, partnerKey, shopId, accessToken, timeFrom, timeTo, pageSize, orderStatus, cursor = '') {
  const timestamp = Math.floor(Date.now() / 1000);
  const apiPath = '/api/v2/order/get_order_list';
  const sign = generateSignatureV2(partnerId, partnerKey, apiPath, timestamp, accessToken, shopId);
  
  const queryParams = new URLSearchParams({
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
  
  // Add order_status if not 'ALL'
  if (orderStatus && orderStatus !== 'ALL') {
    queryParams.append('order_status', orderStatus);
  }
  
  // Add cursor for pagination
  if (cursor) {
    queryParams.append('cursor', cursor);
  }

  const options = {
    hostname: 'partner.shopeemobile.com',
    path: `${apiPath}?${queryParams.toString()}`,
    method: 'GET',
    headers: {
      'Content-Type': 'application/json'
    }
  };

  return await makeRequest(options);
}

// Get order details
async function getOrderDetails(partnerId, partnerKey, shopId, accessToken, orderSnList) {
  const timestamp = Math.floor(Date.now() / 1000);
  const apiPath = '/api/v2/order/get_order_detail';
  const sign = generateSignatureV2(partnerId, partnerKey, apiPath, timestamp, accessToken, shopId);
  
  const queryParams = new URLSearchParams({
    partner_id: partnerId,
    timestamp: timestamp.toString(),
    sign,
    shop_id: shopId,
    access_token: accessToken,
    order_sn_list: orderSnList.join(','),
    response_optional_fields: 'buyer_user_id,buyer_username,item_list,total_amount,order_status'
  });

  const options = {
    hostname: 'partner.shopeemobile.com',
    path: `${apiPath}?${queryParams.toString()}`,
    method: 'GET',
    headers: {
      'Content-Type': 'application/json'
    }
  };

  return await makeRequest(options);
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
    // Trim whitespace to prevent API errors
    const partnerId = String(req.query.partner_id || req.headers['x-partner-id'] || process.env.SHOPEE_PARTNER_ID || '').trim();
    const partnerKey = String(req.query.partner_key || req.headers['x-partner-key'] || process.env.SHOPEE_PARTNER_KEY || '').trim();
    const shopId = String(req.query.shop_id || req.headers['x-shop-id'] || process.env.SHOPEE_SHOP_ID || '').trim();
    const accessToken = String(req.query.access_token || req.headers['x-access-token'] || '').trim();
    const fetchAll = req.query.fetch_all === 'true';
    
    if (!partnerId || !partnerKey || !shopId || !accessToken) {
      return res.status(400).json({
        success: false,
        error: 'Missing required parameters: partner_id, partner_key, shop_id, access_token'
      });
    }

    // Default time range: last 15 days
    const now = Math.floor(Date.now() / 1000);
    const fifteenDaysAgo = now - (15 * 24 * 60 * 60);
    
    const timeFrom = parseInt(req.query.time_from) || fifteenDaysAgo;
    const timeTo = parseInt(req.query.time_to) || now;
    const pageSize = parseInt(req.query.page_size) || 50;
    const orderStatus = req.query.order_status || 'ALL';
    const fetchAllStatuses = req.query.fetch_all_statuses === 'true';
    let cursor = req.query.cursor || '';
    
    // Shopee Order Statuses:
    // UNPAID - Belum Bayar
    // READY_TO_SHIP - Perlu Diproses (sudah bayar, belum kirim)
    // PROCESSED - Telah Diproses (sudah kirim label)
    // SHIPPED - Dalam Pengiriman
    // COMPLETED - Selesai
    // IN_CANCEL - Dalam Proses Batal
    // CANCELLED - Batal
    // INVOICE_PENDING - Menunggu Invoice
    
    const ALL_STATUSES = ['READY_TO_SHIP', 'PROCESSED', 'SHIPPED', 'COMPLETED', 'CANCELLED', 'IN_CANCEL'];
    
    // If fetch_all is true, loop through all pages
    if (fetchAll) {
      let allOrders = [];
      let statusSummary = {};
      
      // Determine which statuses to fetch
      const statusesToFetch = fetchAllStatuses ? ALL_STATUSES : (orderStatus === 'ALL' ? ALL_STATUSES : [orderStatus]);
      
      for (const status of statusesToFetch) {
        let hasMore = true;
        cursor = '';
        let statusCount = 0;
        
        while (hasMore) {
          const result = await getOrderList(partnerId, partnerKey, shopId, accessToken, timeFrom, timeTo, pageSize, status, cursor);
          
          if (result.error) {
            // Skip this status if error, continue to next
            console.log(`Error fetching status ${status}:`, result.message);
            hasMore = false;
            continue;
          }
          
          if (result.response && result.response.order_list && result.response.order_list.length > 0) {
            const orderSnList = result.response.order_list.map(o => o.order_sn);
            statusCount += orderSnList.length;
            
            // Fetch order details in batches of 50
            for (let i = 0; i < orderSnList.length; i += 50) {
              const batch = orderSnList.slice(i, i + 50);
              const detailResult = await getOrderDetails(partnerId, partnerKey, shopId, accessToken, batch);
              
              if (detailResult.response && detailResult.response.order_list) {
                // Add status info to each order
                const ordersWithStatus = detailResult.response.order_list.map(o => ({
                  ...o,
                  order_status: o.order_status || status
                }));
                allOrders.push(...ordersWithStatus);
              }
            }
            
            hasMore = result.response.more || false;
            cursor = result.response.next_cursor || '';
          } else {
            hasMore = false;
          }
        }
        
        statusSummary[status] = statusCount;
      }
      
      return res.status(200).json({
        success: true,
        data: {
          response: {
            order_list: allOrders,
            total_count: allOrders.length,
            status_summary: statusSummary,
            more: false
          }
        },
        timestamp: now
      });
    }
    
    // Single page fetch
    const result = await getOrderList(partnerId, partnerKey, shopId, accessToken, timeFrom, timeTo, pageSize, orderStatus, cursor);
    
    // If we got orders, fetch their details
    if (result.response && result.response.order_list && result.response.order_list.length > 0) {
      const orderSnList = result.response.order_list.map(o => o.order_sn);
      const detailResult = await getOrderDetails(partnerId, partnerKey, shopId, accessToken, orderSnList);
      
      return res.status(200).json({
        success: true,
        data: {
          response: {
            order_list: detailResult.response?.order_list || result.response.order_list,
            more: result.response.more || false,
            next_cursor: result.response.next_cursor || ''
          }
        },
        timestamp: now
      });
    }
    
    res.status(200).json({
      success: !result.error,
      data: result,
      timestamp: now
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}
