import crypto from 'crypto';
import https from 'https';

// Vercel serverless config - extend timeout for large data fetches
export const config = {
  maxDuration: 60 // 60 seconds (requires Vercel Pro, Free tier max 10s)
};

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

// Get item details by IDs
async function getItemDetails(partnerId, partnerKey, shopId, accessToken, itemIds) {
  const timestamp = Math.floor(Date.now() / 1000);
  const apiPath = '/api/v2/product/get_item_base_info';
  const sign = generateSignatureV2(partnerId, partnerKey, apiPath, timestamp, accessToken, shopId);
  
  const queryParams = new URLSearchParams({
    partner_id: partnerId,
    timestamp: timestamp.toString(),
    sign,
    shop_id: shopId,
    access_token: accessToken,
    item_id_list: itemIds.join(','),
    need_tax_info: 'false',
    need_complaint_policy: 'false'
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

// Get model list (for price and stock info)
async function getModelList(partnerId, partnerKey, shopId, accessToken, itemId) {
  const timestamp = Math.floor(Date.now() / 1000);
  const apiPath = '/api/v2/product/get_model_list';
  const sign = generateSignatureV2(partnerId, partnerKey, apiPath, timestamp, accessToken, shopId);
  
  const queryParams = new URLSearchParams({
    partner_id: partnerId,
    timestamp: timestamp.toString(),
    sign,
    shop_id: shopId,
    access_token: accessToken,
    item_id: itemId.toString()
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

// Fetch item list with pagination
async function getItemList(partnerId, partnerKey, shopId, accessToken, offset = 0, pageSize = 100, itemStatus = 'NORMAL') {
  const timestamp = Math.floor(Date.now() / 1000);
  const apiPath = '/api/v2/product/get_item_list';
  const sign = generateSignatureV2(partnerId, partnerKey, apiPath, timestamp, accessToken, shopId);
  
  const queryParams = new URLSearchParams({
    partner_id: partnerId,
    timestamp: timestamp.toString(),
    sign,
    shop_id: shopId,
    access_token: accessToken,
    offset: offset.toString(),
    page_size: pageSize.toString(),
    item_status: itemStatus
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
    const fetchAll = req.query.fetch_all === 'true'; // Fetch all products with pagination
    
    if (!partnerId || !partnerKey || !shopId || !accessToken) {
      return res.status(400).json({
        success: false,
        error: 'Missing required parameters: partner_id, partner_key, shop_id, access_token'
      });
    }

    const pageSize = parseInt(req.query.page_size) || 50; // Shopee recommends max 50
    const itemStatus = req.query.item_status || 'NORMAL'; // NORMAL = Live products
    let offset = parseInt(req.query.offset) || 0;
    const debug = req.query.debug === 'true';
    const skipModels = req.query.skip_models === 'true'; // Skip fetching model details for faster sync
    
    // If fetch_all is true, loop through all pages and all statuses
    if (fetchAll) {
      let allItemIds = [];
      let hasNextPage = true;
      let totalCount = 0;
      const debugInfo = [];
      
      // Statuses to fetch: NORMAL (Live), UNLIST (Unlisted)
      const statusesToFetch = itemStatus ? [itemStatus] : ['NORMAL'];
      
      for (const status of statusesToFetch) {
        offset = 0;
        hasNextPage = true;
        let pageCount = 0;
        const maxPages = 20; // Safety limit
        
        while (hasNextPage && pageCount < maxPages) {
          pageCount++;
          const listResult = await getItemList(partnerId, partnerKey, shopId, accessToken, offset, pageSize, status);
          
          if (debug) {
            debugInfo.push({ 
              status, 
              offset, 
              pageCount,
              hasItems: !!(listResult.response?.item?.length),
              itemCount: listResult.response?.item?.length || 0,
              totalInResponse: listResult.response?.total_count,
              hasNextPage: listResult.response?.has_next_page,
              error: listResult.error || listResult.message || null
            });
          }
          
          if (listResult.error) {
            if (debug) {
              return res.status(200).json({
                success: false,
                error: listResult.message || 'Failed to fetch products',
                debug: debugInfo,
                rawResponse: listResult
              });
            }
            // Continue to next status if error
            hasNextPage = false;
            continue;
          }
          
          if (listResult.response && listResult.response.item && listResult.response.item.length > 0) {
            const items = listResult.response.item.map(i => i.item_id);
            allItemIds.push(...items);
            if (totalCount === 0) {
              totalCount = listResult.response.total_count || 0;
            }
            hasNextPage = listResult.response.has_next_page === true;
            offset += pageSize;
          } else {
            hasNextPage = false;
          }
        }
      }
      
      // If debug mode, return info about what we found
      if (debug) {
        return res.status(200).json({
          success: true,
          debug: true,
          itemIdsFound: allItemIds.length,
          totalCount,
          debugInfo,
          statusesFetched: statusesToFetch
        });
      }
      
      // Now fetch details for all items in batches of 50
      const allItems = [];
      
      // Process detail batches in parallel (max 3 concurrent for faster processing)
      const detailBatches = [];
      for (let i = 0; i < allItemIds.length; i += 50) {
        detailBatches.push(allItemIds.slice(i, i + 50));
      }
      
      // Fetch details in parallel batches of 3
      for (let i = 0; i < detailBatches.length; i += 3) {
        const parallelBatches = detailBatches.slice(i, i + 3);
        const batchResults = await Promise.all(
          parallelBatches.map(batch => getItemDetails(partnerId, partnerKey, shopId, accessToken, batch))
        );
        
        for (const detailResult of batchResults) {
          if (detailResult.response && detailResult.response.item_list) {
            // If skipModels is true, just add items directly without fetching models
            if (skipModels) {
              allItems.push(...detailResult.response.item_list);
            } else {
              // Process items with model data - limit concurrent model fetches
              const items = detailResult.response.item_list;
              
              // Process models in smaller batches to avoid overwhelming Shopee API
              for (let j = 0; j < items.length; j += 10) {
                const modelBatch = items.slice(j, j + 10);
                const itemsWithModels = await Promise.all(
                  modelBatch.map(async (item) => {
                    try {
                      // Only fetch models if item has variants (has_model flag or model_count > 0)
                      if (!item.has_model && (!item.model_count || item.model_count <= 1)) {
                        return item;
                      }
                      
                      const modelResult = await getModelList(partnerId, partnerKey, shopId, accessToken, item.item_id);
                      if (modelResult.response && modelResult.response.model && modelResult.response.model.length > 0) {
                        const firstModel = modelResult.response.model[0];
                        
                        // Process each model to ensure price/stock fields are at model level
                        const processedModels = modelResult.response.model.map(m => ({
                          ...m,
                          current_price: m.price_info?.current_price || m.price_info?.original_price || 0,
                          original_price: m.price_info?.original_price || 0,
                          stock: m.stock_info_v2?.seller_stock?.[0]?.stock || 
                                 m.stock_info_v2?.summary_info?.total_available_stock ||
                                 m.stock_info?.current_stock || 0
                        }));
                        
                        return {
                          ...item,
                          models: processedModels,
                          current_price: firstModel.price_info?.current_price || firstModel.price_info?.original_price || 0,
                          original_price: firstModel.price_info?.original_price || 0,
                          model_sku: firstModel.model_sku || item.item_sku || '',
                          current_stock: firstModel.stock_info_v2?.seller_stock?.[0]?.stock || 
                                        firstModel.stock_info?.current_stock || 
                                        firstModel.stock_info_v2?.summary_info?.total_available_stock || 0
                        };
                      }
                      return item;
                    } catch (e) {
                      return item;
                    }
                  })
                );
                allItems.push(...itemsWithModels);
              }
            }
          }
        }
      }
      
      return res.status(200).json({
        success: true,
        data: {
          response: {
            item: allItems,
            total_count: totalCount,
            has_next_page: false,
            fetched_count: allItems.length
          }
        },
        timestamp: Math.floor(Date.now() / 1000)
      });
    }
    
    // Single page fetch (original behavior)
    const listResult = await getItemList(partnerId, partnerKey, shopId, accessToken, offset, pageSize, itemStatus);
    
    // If we got items, fetch their details
    if (listResult.response && listResult.response.item && listResult.response.item.length > 0) {
      const itemIds = listResult.response.item.map(item => item.item_id);
      
      // Fetch details in batches of 50 (Shopee API limit)
      const allItems = [];
      for (let i = 0; i < itemIds.length; i += 50) {
        const batch = itemIds.slice(i, i + 50);
        const detailResult = await getItemDetails(partnerId, partnerKey, shopId, accessToken, batch);
        
        if (detailResult.response && detailResult.response.item_list) {
          // Process items with model data in parallel (max 10 concurrent)
          const itemsWithModels = await Promise.all(
            detailResult.response.item_list.map(async (item) => {
              try {
                const modelResult = await getModelList(partnerId, partnerKey, shopId, accessToken, item.item_id);
                if (modelResult.response && modelResult.response.model && modelResult.response.model.length > 0) {
                  const firstModel = modelResult.response.model[0];
                  return {
                    ...item,
                    models: modelResult.response.model,
                    current_price: firstModel.price_info?.current_price || firstModel.price_info?.original_price || 0,
                    original_price: firstModel.price_info?.original_price || 0,
                    model_sku: firstModel.model_sku || item.item_sku || '',
                    current_stock: firstModel.stock_info_v2?.seller_stock?.[0]?.stock || 
                                  firstModel.stock_info?.current_stock || 
                                  firstModel.stock_info_v2?.summary_info?.total_available_stock || 0
                  };
                }
                return item;
              } catch (e) {
                return item;
              }
            })
          );
          allItems.push(...itemsWithModels);
        }
      }
      
      // Return combined result with full item details
      return res.status(200).json({
        success: true,
        data: {
          response: {
            item: allItems,
            total_count: listResult.response.total_count,
            has_next_page: listResult.response.has_next_page
          }
        },
        timestamp
      });
    }
    
    res.status(200).json({
      success: !listResult.error,
      data: listResult,
      timestamp
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}
