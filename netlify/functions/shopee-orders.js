import crypto from 'crypto';
import https from 'https';

// Generate signature for Shopee API v2
function generateSignatureV2(partnerId, partnerKey, apiPath, timestamp, accessToken, shopId) {
  const baseString = `${partnerId}${apiPath}${timestamp}${accessToken}${shopId}`;
  return crypto.createHmac('sha256', partnerKey).update(baseString).digest('hex');
}

// Make HTTPS request
function makeRequest(options) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); } catch (e) { resolve(data); }
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
    partner_id: partnerId, timestamp: timestamp.toString(), sign, shop_id: shopId, access_token: accessToken,
    time_range_field: 'create_time', time_from: timeFrom.toString(), time_to: timeTo.toString(), page_size: pageSize.toString()
  });
  
  if (orderStatus && orderStatus !== 'ALL') queryParams.append('order_status', orderStatus);
  if (cursor) queryParams.append('cursor', cursor);

  const options = {
    hostname: 'partner.shopeemobile.com',
    path: `${apiPath}?${queryParams.toString()}`,
    method: 'GET',
    headers: { 'Content-Type': 'application/json' }
  };

  return await makeRequest(options);
}

// Get order details
async function getOrderDetails(partnerId, partnerKey, shopId, accessToken, orderSnList) {
  const timestamp = Math.floor(Date.now() / 1000);
  const apiPath = '/api/v2/order/get_order_detail';
  const sign = generateSignatureV2(partnerId, partnerKey, apiPath, timestamp, accessToken, shopId);
  
  const optionalFields = ['buyer_user_id', 'buyer_username', 'item_list', 'total_amount', 'actual_shipping_fee', 'payment_method'].join(',');
  
  const queryParams = new URLSearchParams({
    partner_id: partnerId, timestamp: timestamp.toString(), sign, shop_id: shopId, access_token: accessToken,
    order_sn_list: orderSnList.join(','), response_optional_fields: optionalFields
  });

  const options = {
    hostname: 'partner.shopeemobile.com',
    path: `${apiPath}?${queryParams.toString()}`,
    method: 'GET',
    headers: { 'Content-Type': 'application/json' }
  };

  return await makeRequest(options);
}

// Netlify Function Handler
export const handler = async (event, context) => {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    const params = event.queryStringParameters || {};
    const partnerId = String(params.partner_id || '').trim();
    const partnerKey = String(params.partner_key || '').trim();
    const shopId = String(params.shop_id || '').trim();
    const accessToken = String(params.access_token || '').trim();
    const fetchAll = params.fetch_all === 'true';

    if (!partnerId || !partnerKey || !shopId || !accessToken) {
      return { statusCode: 400, headers, body: JSON.stringify({ success: false, error: 'Missing required parameters' }) };
    }

    const now = Math.floor(Date.now() / 1000);
    const sevenDaysAgo = now - (7 * 24 * 60 * 60);
    const timeFrom = parseInt(params.time_from) || sevenDaysAgo;
    const timeTo = parseInt(params.time_to) || now;
    const pageSize = parseInt(params.page_size) || 50;
    const orderStatus = params.order_status || 'ALL';
    const maxOrdersPerStatus = parseInt(params.max_per_status) || 100;

    const PRIORITY_STATUSES = ['READY_TO_SHIP', 'SHIPPED', 'COMPLETED'];

    if (fetchAll) {
      let allOrders = [];
      const statusesToFetch = orderStatus === 'ALL' ? PRIORITY_STATUSES : [orderStatus];

      for (const status of statusesToFetch) {
        let hasMore = true;
        let cursor = '';
        let statusCount = 0;

        while (hasMore && statusCount < maxOrdersPerStatus) {
          const result = await getOrderList(partnerId, partnerKey, shopId, accessToken, timeFrom, timeTo, pageSize, status, cursor);

          if (result.error) {
            hasMore = false;
            continue;
          }

          if (result.response?.order_list?.length > 0) {
            const orderSnList = result.response.order_list.map(o => o.order_sn);
            statusCount += orderSnList.length;

            for (let i = 0; i < orderSnList.length; i += 50) {
              const batch = orderSnList.slice(i, i + 50);
              const detailResult = await getOrderDetails(partnerId, partnerKey, shopId, accessToken, batch);

              if (detailResult.response?.order_list) {
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
      }

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          data: { response: { order_list: allOrders, total_count: allOrders.length, more: false } },
          timestamp: now
        })
      };
    }

    // Single page fetch
    const result = await getOrderList(partnerId, partnerKey, shopId, accessToken, timeFrom, timeTo, pageSize, orderStatus, params.cursor || '');

    if (result.response?.order_list?.length > 0) {
      const orderSnList = result.response.order_list.map(o => o.order_sn);
      const detailResult = await getOrderDetails(partnerId, partnerKey, shopId, accessToken, orderSnList);

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          data: { response: { order_list: detailResult.response?.order_list || result.response.order_list, more: result.response.more || false, next_cursor: result.response.next_cursor || '' } },
          timestamp: now
        })
      };
    }

    return { statusCode: 200, headers, body: JSON.stringify({ success: !result.error, data: result, timestamp: now }) };

  } catch (error) {
    return { statusCode: 500, headers, body: JSON.stringify({ success: false, error: error.message }) };
  }
};
