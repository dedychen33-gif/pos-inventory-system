"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.shopeeOrders = exports.scheduledTokenRefresh = exports.shopeeAutoRefresh = exports.shopeeToken = exports.shopeeAuthUrl = void 0;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
const crypto = __importStar(require("crypto"));
// Initialize Firebase Admin
admin.initializeApp();
const db = admin.database();
const cors = require("cors")({ origin: true });
// Firebase Database URL (using admin SDK instead)
// Generate signature for Shopee API v2
function generateSignature(partnerId, partnerKey, apiPath, timestamp) {
    const baseString = `${partnerId}${apiPath}${timestamp}`;
    return crypto.createHmac("sha256", partnerKey).update(baseString).digest("hex");
}
// ============== SHOPEE AUTH URL ==============
exports.shopeeAuthUrl = functions.https.onRequest((req, res) => {
    cors(req, res, async () => {
        try {
            const data = req.method === "POST" ? req.body : req.query;
            const partnerId = String(data.partner_id || "2014001").trim();
            const partnerKey = String(data.partner_key || "").trim();
            const redirectUrl = data.redirect_url || "https://sjaposfirebase.web.app/marketplace/callback";
            if (!partnerKey) {
                res.status(400).json({ success: false, error: "Partner Key is required" });
                return;
            }
            const timestamp = Math.floor(Date.now() / 1000);
            const apiPath = "/api/v2/shop/auth_partner";
            const sign = generateSignature(partnerId, partnerKey, apiPath, timestamp);
            const authUrl = `https://partner.shopeemobile.com${apiPath}?partner_id=${partnerId}&timestamp=${timestamp}&sign=${sign}&redirect=${encodeURIComponent(redirectUrl)}`;
            res.status(200).json({
                success: true,
                authUrl,
                partner_id: partnerId,
                timestamp,
            });
        }
        catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    });
});
// ============== SHOPEE TOKEN ==============
exports.shopeeToken = functions.https.onRequest((req, res) => {
    cors(req, res, async () => {
        var _a, _b;
        try {
            const { action } = req.query;
            const body = req.body || {};
            let partnerId = String(body.partner_id || "2014001").trim();
            let partnerKey = String(body.partner_key || "").trim();
            const shopId = String(body.shop_id || "").trim();
            // If partner_key is missing, try to get from Firebase
            if (!partnerKey && shopId) {
                const snapshot = await db.ref("marketplace_stores").once("value");
                const stores = snapshot.val();
                if (stores) {
                    for (const [key, store] of Object.entries(stores)) {
                        if (String(store.shopId) === shopId) {
                            partnerId = ((_a = store.credentials) === null || _a === void 0 ? void 0 : _a.partnerId) || partnerId;
                            partnerKey = ((_b = store.credentials) === null || _b === void 0 ? void 0 : _b.partnerKey) || "";
                            break;
                        }
                    }
                }
            }
            if (action === "get_token") {
                const { code } = body;
                if (!code || !partnerKey) {
                    res.status(400).json({
                        success: false,
                        error: "Code and Partner Key are required",
                        debug: { has_code: !!code, has_partner_key: !!partnerKey, shop_id: shopId },
                    });
                    return;
                }
                const timestamp = Math.floor(Date.now() / 1000);
                const apiPath = "/api/v2/auth/token/get";
                const sign = generateSignature(partnerId, partnerKey, apiPath, timestamp);
                const response = await fetch(`https://partner.shopeemobile.com${apiPath}?partner_id=${partnerId}&timestamp=${timestamp}&sign=${sign}`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        code,
                        partner_id: parseInt(partnerId),
                        shop_id: parseInt(shopId),
                    }),
                });
                const result = await response.json();
                // Save to Firebase if successful
                if (result.access_token) {
                    const storesSnapshot = await db.ref("marketplace_stores").once("value");
                    const stores = storesSnapshot.val();
                    let firebaseKey = null;
                    if (stores) {
                        for (const [key, store] of Object.entries(stores)) {
                            if (String(store.shopId) === String(result.shop_id || shopId)) {
                                firebaseKey = key;
                                break;
                            }
                        }
                    }
                    if (firebaseKey) {
                        await db.ref(`marketplace_stores/${firebaseKey}`).update({
                            isConnected: true,
                            "credentials/accessToken": result.access_token,
                            "credentials/refreshToken": result.refresh_token,
                            "credentials/tokenExpiry": new Date(Date.now() + (result.expire_in || 14400) * 1000).toISOString(),
                            updatedAt: new Date().toISOString(),
                        });
                    }
                }
                res.status(200).json({ success: !result.error, data: result });
            }
            else {
                res.status(400).json({ success: false, error: "Invalid action" });
            }
        }
        catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    });
});
// ============== AUTO REFRESH TOKEN ==============
exports.shopeeAutoRefresh = functions.https.onRequest((req, res) => {
    cors(req, res, async () => {
        var _a;
        try {
            const { action, shop_id } = req.query;
            if (action === "all") {
                // Refresh all stores
                const snapshot = await db.ref("marketplace_stores").once("value");
                const stores = snapshot.val();
                if (!stores) {
                    res.status(200).json({ success: true, message: "No stores to refresh", refreshed: 0 });
                    return;
                }
                const results = [];
                let refreshed = 0;
                for (const [key, store] of Object.entries(stores)) {
                    if (store.platform !== "shopee" || !((_a = store.credentials) === null || _a === void 0 ? void 0 : _a.refreshToken))
                        continue;
                    const { partnerId, partnerKey, refreshToken } = store.credentials;
                    const storeShopId = store.shopId;
                    try {
                        const timestamp = Math.floor(Date.now() / 1000);
                        const apiPath = "/api/v2/auth/access_token/get";
                        const sign = generateSignature(partnerId, partnerKey, apiPath, timestamp);
                        const response = await fetch(`https://partner.shopeemobile.com${apiPath}?partner_id=${partnerId}&timestamp=${timestamp}&sign=${sign}`, {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                                partner_id: parseInt(partnerId),
                                refresh_token: refreshToken,
                                shop_id: parseInt(storeShopId),
                            }),
                        });
                        const result = await response.json();
                        if (result.access_token) {
                            await db.ref(`marketplace_stores/${key}`).update({
                                "credentials/accessToken": result.access_token,
                                "credentials/refreshToken": result.refresh_token,
                                "credentials/tokenExpiry": new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(),
                                "credentials/lastRefresh": new Date().toISOString(),
                            });
                            results.push({ shopId: storeShopId, success: true });
                            refreshed++;
                        }
                        else {
                            results.push({ shopId: storeShopId, success: false, error: result.message });
                        }
                    }
                    catch (e) {
                        results.push({ shopId: storeShopId, success: false, error: e.message });
                    }
                }
                res.status(200).json({ success: true, refreshed, results, timestamp: new Date().toISOString() });
                return;
            }
            // Single store refresh
            if (shop_id) {
                const snapshot = await db.ref("marketplace_stores").once("value");
                const stores = snapshot.val();
                let targetStore = null;
                let targetKey = null;
                if (stores) {
                    for (const [key, store] of Object.entries(stores)) {
                        if (String(store.shopId) === String(shop_id)) {
                            targetStore = store;
                            targetKey = key;
                            break;
                        }
                    }
                }
                if (!targetStore) {
                    res.status(404).json({ success: false, error: "Store not found" });
                    return;
                }
                const { partnerId, partnerKey, refreshToken } = targetStore.credentials;
                const timestamp = Math.floor(Date.now() / 1000);
                const apiPath = "/api/v2/auth/access_token/get";
                const sign = generateSignature(partnerId, partnerKey, apiPath, timestamp);
                const response = await fetch(`https://partner.shopeemobile.com${apiPath}?partner_id=${partnerId}&timestamp=${timestamp}&sign=${sign}`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        partner_id: parseInt(partnerId),
                        refresh_token: refreshToken,
                        shop_id: parseInt(shop_id),
                    }),
                });
                const result = await response.json();
                if (result.access_token && targetKey) {
                    await db.ref(`marketplace_stores/${targetKey}`).update({
                        "credentials/accessToken": result.access_token,
                        "credentials/refreshToken": result.refresh_token,
                        "credentials/tokenExpiry": new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(),
                    });
                }
                res.status(200).json({ success: !!result.access_token, data: result });
                return;
            }
            res.status(400).json({ success: false, error: "shop_id or action=all required" });
        }
        catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    });
});
// ============== SCHEDULED AUTO REFRESH (Every 3 hours) ==============
exports.scheduledTokenRefresh = functions.pubsub
    .schedule("every 3 hours")
    .onRun(async (context) => {
    var _a;
    console.log("Running scheduled token refresh...");
    const snapshot = await db.ref("marketplace_stores").once("value");
    const stores = snapshot.val();
    if (!stores) {
        console.log("No stores to refresh");
        return null;
    }
    let refreshed = 0;
    for (const [key, store] of Object.entries(stores)) {
        if (store.platform !== "shopee" || !((_a = store.credentials) === null || _a === void 0 ? void 0 : _a.refreshToken))
            continue;
        const { partnerId, partnerKey, refreshToken } = store.credentials;
        const shopId = store.shopId;
        try {
            const timestamp = Math.floor(Date.now() / 1000);
            const apiPath = "/api/v2/auth/access_token/get";
            const sign = generateSignature(partnerId, partnerKey, apiPath, timestamp);
            const response = await fetch(`https://partner.shopeemobile.com${apiPath}?partner_id=${partnerId}&timestamp=${timestamp}&sign=${sign}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    partner_id: parseInt(partnerId),
                    refresh_token: refreshToken,
                    shop_id: parseInt(shopId),
                }),
            });
            const result = await response.json();
            if (result.access_token) {
                await db.ref(`marketplace_stores/${key}`).update({
                    "credentials/accessToken": result.access_token,
                    "credentials/refreshToken": result.refresh_token,
                    "credentials/tokenExpiry": new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(),
                    "credentials/lastRefresh": new Date().toISOString(),
                });
                refreshed++;
                console.log(`Refreshed token for shop: ${shopId}`);
            }
        }
        catch (e) {
            console.error(`Failed to refresh token for shop ${shopId}:`, e.message);
        }
    }
    console.log(`Scheduled refresh complete. Refreshed ${refreshed} stores.`);
    return null;
});
// ============== SHOPEE ORDERS ==============
exports.shopeeOrders = functions.https.onRequest((req, res) => {
    cors(req, res, async () => {
        var _a, _b, _c;
        try {
            const { shop_id, partner_id, access_token } = req.query;
            // Get credentials from Firebase if not provided
            let partnerId = String(partner_id || "").trim();
            let partnerKey = "";
            let accessToken = String(access_token || "").trim();
            if (shop_id) {
                const snapshot = await db.ref("marketplace_stores").once("value");
                const stores = snapshot.val();
                if (stores) {
                    for (const [, store] of Object.entries(stores)) {
                        if (String(store.shopId) === String(shop_id)) {
                            partnerId = partnerId || ((_a = store.credentials) === null || _a === void 0 ? void 0 : _a.partnerId);
                            partnerKey = ((_b = store.credentials) === null || _b === void 0 ? void 0 : _b.partnerKey) || "";
                            accessToken = accessToken || ((_c = store.credentials) === null || _c === void 0 ? void 0 : _c.accessToken) || "";
                            break;
                        }
                    }
                }
            }
            if (!partnerId || !partnerKey || !accessToken || !shop_id) {
                res.status(400).json({ success: false, error: "Missing required credentials" });
                return;
            }
            const timestamp = Math.floor(Date.now() / 1000);
            const apiPath = "/api/v2/order/get_order_list";
            const sign = generateSignature(partnerId, partnerKey, apiPath, timestamp);
            // Get orders from last 15 days
            const timeFrom = Math.floor(Date.now() / 1000) - 15 * 24 * 60 * 60;
            const timeTo = Math.floor(Date.now() / 1000);
            const params = new URLSearchParams({
                partner_id: partnerId,
                timestamp: String(timestamp),
                sign: sign,
                access_token: accessToken,
                shop_id: String(shop_id),
                time_range_field: "create_time",
                time_from: String(timeFrom),
                time_to: String(timeTo),
                page_size: "100",
                order_status: "READY_TO_SHIP",
            });
            const response = await fetch(`https://partner.shopeemobile.com${apiPath}?${params}`);
            const data = await response.json();
            res.status(200).json({
                success: !data.error,
                data: data.response,
                error: data.error ? data.message : null,
            });
        }
        catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    });
});
//# sourceMappingURL=index.js.map