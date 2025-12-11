import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { useMarketplaceStore, PLATFORM_INFO } from '../store/marketplaceStore';
import { marketplaceService } from '../services/marketplaceApi';

export default function MarketplaceCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState('processing'); // processing, success, error
  const [message, setMessage] = useState('Memproses authorization...');
  const [tokenData, setTokenData] = useState(null);
  
  const { stores, updateStoreCredentials, updateStore } = useMarketplaceStore();

  useEffect(() => {
    const processCallback = async () => {
      // Get parameters from URL
      const code = searchParams.get('code');
      const platform = searchParams.get('platform') || 'shopee';
      const storeId = searchParams.get('store_id');
      const shopId = searchParams.get('shop_id');
      const error = searchParams.get('error');
      const errorDescription = searchParams.get('error_description');
      
      // Also check localStorage for pending OAuth store
      const pendingStoreId = localStorage.getItem('pendingOAuthStoreId');
      const pendingPlatform = localStorage.getItem('pendingOAuthPlatform') || platform;

      if (error) {
        setStatus('error');
        setMessage(`Error: ${errorDescription || error}`);
        localStorage.removeItem('pendingOAuthStoreId');
        localStorage.removeItem('pendingOAuthPlatform');
        return;
      }

      if (!code) {
        setStatus('error');
        setMessage('Authorization code tidak ditemukan di URL');
        return;
      }

      // Find the store in our stores - try URL param first, then localStorage
      let store = null;
      const targetStoreId = storeId || pendingStoreId;
      
      if (targetStoreId) {
        store = stores.find(s => s.id === parseInt(targetStoreId));
      }
      
      // If still not found, try to find by shopId from URL
      if (!store && shopId) {
        store = stores.find(s => s.shopId === shopId || s.credentials?.shopId === shopId);
      }
      
      // If still not found, get the most recent non-connected store for this platform
      if (!store) {
        store = stores.find(s => s.platform === pendingPlatform && !s.isConnected);
      }

      // Clear pending OAuth data
      localStorage.removeItem('pendingOAuthStoreId');
      localStorage.removeItem('pendingOAuthPlatform');

      if (!store) {
        setStatus('error');
        setMessage('Toko tidak ditemukan. Silakan coba hubungkan kembali dari halaman Integrasi.');
        return;
      }

      const platformInfo = PLATFORM_INFO[platform] || PLATFORM_INFO.manual;

      try {
        setMessage(`Menukar code untuk access token ${platformInfo.name}...`);
        
        // Call the appropriate API to exchange code for token
        const response = await marketplaceService.getToken(store, code);
        
        // Handle response - API returns { success, data } or direct token data
        const data = response.data || response;
        const tokenData = data.access_token ? data : (data.data || {});

        if (tokenData && tokenData.access_token) {
          // Update store credentials in the store
          updateStoreCredentials(store.id, {
            accessToken: tokenData.access_token,
            refreshToken: tokenData.refresh_token || '',
          });

          // Update store connection status
          updateStore(store.id, {
            isConnected: true,
            shopId: tokenData.shop_id || shopId || store.shopId,
            tokenExpiry: tokenData.expire_in ? new Date(Date.now() + tokenData.expire_in * 1000).toISOString() : null
          });

          // IMPORTANT: Save credentials to localStorage for persistence
          if (platform === 'shopee') {
            localStorage.setItem('shopee_partner_id', store.credentials?.partnerId || '2014001');
            localStorage.setItem('shopee_partner_key', store.credentials?.partnerKey || '');
            localStorage.setItem('shopee_shop_id', tokenData.shop_id || shopId || store.shopId || '669903315');
            localStorage.setItem('shopee_access_token', tokenData.access_token);
            localStorage.setItem('shopee_refresh_token', tokenData.refresh_token || '');
            
            console.log('✅ Shopee credentials saved to localStorage:', {
              partner_id: store.credentials?.partnerId || '2014001',
              shop_id: tokenData.shop_id || shopId || store.shopId,
              has_access_token: !!tokenData.access_token,
              has_refresh_token: !!tokenData.refresh_token
            });
          }

          setTokenData({
            ...tokenData,
            platform,
            storeName: store.shopName
          });
          setStatus('success');
          setMessage(`${platformInfo.name} berhasil terhubung! Token telah disimpan.`);

          // Redirect after 3 seconds
          setTimeout(() => {
            navigate('/marketplace/integration');
          }, 3000);
        } else {
          setStatus('error');
          setMessage(data?.message || data?.error || response?.error || 'Gagal mendapatkan access token');
        }
      } catch (err) {
        setStatus('error');
        setMessage(`Error: ${err.message}`);
      }
    };

    processCallback();
  }, [searchParams, navigate, stores, updateStoreCredentials, updateStore]);

  const platform = searchParams.get('platform') || 'shopee';
  const platformInfo = PLATFORM_INFO[platform] || PLATFORM_INFO.manual;

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-8 text-center">
        {status === 'processing' && (
          <>
            <div className={`w-16 h-16 ${platformInfo.bgLight} rounded-full flex items-center justify-center mx-auto mb-4`}>
              <Loader2 className={`w-10 h-10 ${platformInfo.textColor} animate-spin`} />
            </div>
            <h1 className="text-2xl font-bold text-gray-800 mb-2">Memproses {platformInfo.name}...</h1>
            <p className="text-gray-600">{message}</p>
          </>
        )}

        {status === 'success' && (
          <>
            <div className={`w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4`}>
              <CheckCircle className="w-10 h-10 text-green-500" />
            </div>
            <h1 className="text-2xl font-bold text-gray-800 mb-2">Berhasil!</h1>
            <p className="text-gray-600 mb-4">{message}</p>
            
            {tokenData && (
              <div className="bg-gray-50 rounded-lg p-4 text-left text-sm mb-4">
                <p className="mb-2">
                  <strong>Platform:</strong> 
                  <span className={`ml-2 ${platformInfo.textColor}`}>
                    {platformInfo.icon} {platformInfo.name}
                  </span>
                </p>
                <p className="mb-2"><strong>Toko:</strong> {tokenData.storeName}</p>
                {tokenData.shop_id && <p className="mb-2"><strong>Shop ID:</strong> {tokenData.shop_id}</p>}
                <p className="mb-2"><strong>Access Token:</strong> {tokenData.access_token?.substring(0, 20)}...</p>
                {tokenData.expire_in && <p><strong>Expires In:</strong> {Math.floor(tokenData.expire_in / 3600)} jam</p>}
              </div>
            )}

            <p className="text-sm text-gray-500">Anda akan dialihkan ke halaman Integrasi dalam beberapa detik...</p>
            
            <button
              onClick={() => navigate('/marketplace/integration')}
              className={`mt-4 px-6 py-2 ${platformInfo.bgColor} text-white rounded-lg hover:opacity-90`}
            >
              Lanjutkan ke Integrasi
            </button>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <XCircle className="w-10 h-10 text-red-500" />
            </div>
            <h1 className="text-2xl font-bold text-gray-800 mb-2">Gagal</h1>
            <p className="text-gray-600 mb-4">{message}</p>
            
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => navigate('/marketplace/integration')}
                className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
              >
                Kembali
              </button>
              <button
                onClick={() => window.location.reload()}
                className={`px-6 py-2 ${platformInfo.bgColor} text-white rounded-lg hover:opacity-90`}
              >
                Coba Lagi
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
