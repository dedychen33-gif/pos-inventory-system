import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { useSettingsStore } from '../store/settingsStore';

export default function ShopeeCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState('processing');
  const [message, setMessage] = useState('Memproses authorization...');
  const { shopeeCredentials } = useSettingsStore();

  useEffect(() => {
    const processCallback = async () => {
      const code = searchParams.get('code');
      const shopId = searchParams.get('shop_id');
      const error = searchParams.get('error');
      const errorDescription = searchParams.get('error_description');

      if (error) {
        setStatus('error');
        setMessage(`Error: ${errorDescription || error}`);
        return;
      }

      if (!code) {
        setStatus('error');
        setMessage('Authorization code tidak ditemukan');
        return;
      }

      try {
        setMessage('Menukar code untuk access token...');
        
        const response = await fetch('/api/shopee/token?action=get_token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            code,
            shop_id: shopId,
            partner_id: shopeeCredentials?.partnerId,
            partner_key: shopeeCredentials?.partnerKey
          })
        });

        const data = await response.json();

        if (data.success || data.access_token) {
          // Save token to localStorage
          const tokenData = data.data || data;
          localStorage.setItem('shopee_access_token', tokenData.access_token);
          localStorage.setItem('shopee_refresh_token', tokenData.refresh_token);
          localStorage.setItem('shopee_shop_id', shopId || tokenData.shop_id);
          localStorage.setItem('shopee_token_expires', Date.now() + (tokenData.expire_in * 1000));
          
          setStatus('success');
          setMessage('Toko berhasil terhubung! Mengarahkan ke Shopee Order...');
          
          setTimeout(() => {
            navigate('/shopee');
          }, 2000);
        } else {
          setStatus('error');
          setMessage(data.error || 'Gagal mendapatkan access token');
        }
      } catch (err) {
        setStatus('error');
        setMessage('Error: ' + err.message);
      }
    };

    processCallback();
  }, [searchParams, navigate, shopeeCredentials]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white rounded-xl shadow-lg p-8 max-w-md w-full text-center">
        {status === 'processing' && (
          <>
            <Loader2 className="w-16 h-16 text-orange-500 animate-spin mx-auto mb-4" />
            <h2 className="text-xl font-bold text-gray-800 mb-2">Menghubungkan Toko</h2>
            <p className="text-gray-600">{message}</p>
          </>
        )}

        {status === 'success' && (
          <>
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-green-600 mb-2">Berhasil!</h2>
            <p className="text-gray-600">{message}</p>
          </>
        )}

        {status === 'error' && (
          <>
            <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-red-600 mb-2">Gagal</h2>
            <p className="text-gray-600 mb-4">{message}</p>
            <button
              onClick={() => navigate('/shopee')}
              className="px-4 py-2 bg-orange-500 text-white rounded hover:bg-orange-600"
            >
              Kembali ke Shopee Order
            </button>
          </>
        )}
      </div>
    </div>
  );
}
